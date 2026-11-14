import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

function userInstitutionIds(user: CurrentUser): Set<number> {
  const ids = new Set<number>();
  (user.memberships ?? []).forEach((membership) => {
    const id = Number(membership.institution_id);
    if (Number.isInteger(id) && id > 0) ids.add(id);
  });
  const directId = Number((user as any)?.institution_id);
  if (Number.isInteger(directId) && directId > 0) ids.add(directId);
  const underId = Number((user as any)?.under_institution_id);
  if (Number.isInteger(underId) && underId > 0) ids.add(underId);
  const profileInstId = Number((user as any)?.profile?.under_institution_id || (user as any)?.profile?.institution_id);
  if (Number.isInteger(profileInstId) && profileInstId > 0) ids.add(profileInstId);
  return ids;
}

function resolveScope(user: CurrentUser, requestedInstitutionId?: number | null): { scope: "platform" | "institution"; institutionId: number | null } {
  const isPlatform = isPlatformAdminUser(user);
  const institutionIds = userInstitutionIds(user);

  if (isPlatform && requestedInstitutionId) {
    return { scope: "institution", institutionId: requestedInstitutionId };
  }
  if (isPlatform && !requestedInstitutionId) {
    return { scope: "platform", institutionId: null };
  }
  if (requestedInstitutionId && institutionIds.has(requestedInstitutionId)) {
    return { scope: "institution", institutionId: requestedInstitutionId };
  }
  const firstId = Array.from(institutionIds)[0] ?? null;
  return { scope: "institution", institutionId: firstId };
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedInstitutionId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const { scope, institutionId } = resolveScope(user, requestedInstitutionId);

    const type = searchParams.get("type") || "all"; // all | income | expense
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const paymentStatus = searchParams.get("paymentStatus") || "all";
    const paymentMethod = searchParams.get("paymentMethod") || "all";
    const transactionStatus = searchParams.get("transactionStatus") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    // Fetch Income Entries
    const incomeConditions: string[] = ["1=1"];
    const incomeParams: any[] = [];
    let pIdx = 1;

    if (scope === "institution" && institutionId) {
      incomeConditions.push(`fie.institution_id = $${pIdx++}`);
      incomeParams.push(institutionId);
    } else if (scope === "platform") {
      incomeConditions.push(`fie.scope_type = 'platform'`);
    }

    if (fromDate) {
      incomeConditions.push(`fie.income_date >= $${pIdx++}`);
      incomeParams.push(fromDate);
    }
    if (toDate) {
      incomeConditions.push(`fie.income_date <= $${pIdx++}`);
      incomeParams.push(toDate);
    }
    if (paymentStatus !== "all") {
      incomeConditions.push(`COALESCE(fie.payment_status, 'paid') = $${pIdx++}`);
      incomeParams.push(paymentStatus);
    }
    if (paymentMethod !== "all") {
      incomeConditions.push(`fie.payment_method = $${pIdx++}`);
      incomeParams.push(paymentMethod);
    }
    if (transactionStatus !== "all") {
      incomeConditions.push(`COALESCE(fie.transaction_status, 'completed') = $${pIdx++}`);
      incomeParams.push(transactionStatus);
    }
    if (search) {
      incomeConditions.push(`(
        LOWER(COALESCE(fie.payer_name, fie.paid_by_label, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(fie.description, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(fie.reference_no, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(inv.invoice_number, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(fic.name, '')) LIKE $${pIdx}
      )`);
      incomeParams.push(`%${search}%`);
      pIdx++;
    }

    // Fetch Expense Entries
    const expenseConditions: string[] = ["1=1"];
    const expenseParams: any[] = [];
    let epIdx = 1;

    if (scope === "institution" && institutionId) {
      expenseConditions.push(`fee.institution_id = $${epIdx++}`);
      expenseParams.push(institutionId);
    } else if (scope === "platform") {
      expenseConditions.push(`fee.scope_type = 'platform'`);
    }

    if (fromDate) {
      expenseConditions.push(`fee.expense_date >= $${epIdx++}`);
      expenseParams.push(fromDate);
    }
    if (toDate) {
      expenseConditions.push(`fee.expense_date <= $${epIdx++}`);
      expenseParams.push(toDate);
    }
    if (paymentStatus !== "all") {
      expenseConditions.push(`COALESCE(fee.payment_status, 'paid') = $${epIdx++}`);
      expenseParams.push(paymentStatus);
    }
    if (paymentMethod !== "all") {
      expenseConditions.push(`fee.payment_method = $${epIdx++}`);
      expenseParams.push(paymentMethod);
    }
    if (transactionStatus !== "all") {
      expenseConditions.push(`COALESCE(fee.transaction_status, 'completed') = $${epIdx++}`);
      expenseParams.push(transactionStatus);
    }
    if (search) {
      expenseConditions.push(`(
        LOWER(COALESCE(fee.vendor_name, fee.paid_to_label, '')) LIKE $${epIdx}
        OR LOWER(COALESCE(fee.description, '')) LIKE $${epIdx}
        OR LOWER(COALESCE(fee.reference_no, fee.invoice_no, '')) LIKE $${epIdx}
        OR LOWER(COALESCE(fec.name, '')) LIKE $${epIdx}
      )`);
      expenseParams.push(`%${search}%`);
      epIdx++;
    }

    // Calculate Summary Metrics
    const incomeMetricsQuery = `
      SELECT 
        COUNT(*)::INT AS count,
        COALESCE(SUM(fie.amount), 0)::NUMERIC AS total_amount,
        COALESCE(SUM(COALESCE(fie.amount_received, fie.amount)), 0)::NUMERIC AS total_received,
        COALESCE(SUM(COALESCE(fie.pending_amount, 0)), 0)::NUMERIC AS total_pending
      FROM finance_income_entries fie
      WHERE ${scope === "institution" && institutionId ? `fie.institution_id = ${institutionId}` : "fie.scope_type = 'platform'"}
        AND COALESCE(fie.transaction_status, 'completed') != 'cancelled'
    `;

    const expenseMetricsQuery = `
      SELECT 
        COUNT(*)::INT AS count,
        COALESCE(SUM(fee.amount), 0)::NUMERIC AS total_amount,
        COALESCE(SUM(COALESCE(fee.amount_paid, fee.amount)), 0)::NUMERIC AS total_paid,
        COALESCE(SUM(COALESCE(fee.outstanding_amount, 0)), 0)::NUMERIC AS total_outstanding
      FROM finance_expense_entries fee
      WHERE ${scope === "institution" && institutionId ? `fee.institution_id = ${institutionId}` : "fee.scope_type = 'platform'"}
        AND COALESCE(fee.transaction_status, 'completed') != 'cancelled'
    `;

    const [incomeMetricsRes, expenseMetricsRes] = await Promise.all([
      db.query(incomeMetricsQuery),
      db.query(expenseMetricsQuery),
    ]);

    const totalIncome = Number(incomeMetricsRes.rows[0]?.total_amount || 0);
    const totalExpenses = Number(expenseMetricsRes.rows[0]?.total_amount || 0);
    const incomeReceived = Number(incomeMetricsRes.rows[0]?.total_received || 0);
    const expensePaid = Number(expenseMetricsRes.rows[0]?.total_paid || 0);
    const incomePending = Number(incomeMetricsRes.rows[0]?.total_pending || 0);
    const expensePending = Number(expenseMetricsRes.rows[0]?.total_outstanding || 0);
    const incomeCount = Number(incomeMetricsRes.rows[0]?.count || 0);
    const expenseCount = Number(expenseMetricsRes.rows[0]?.count || 0);

    const summary = {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      paidAmount: incomeReceived + expensePaid,
      pendingAmount: incomePending + expensePending,
      incomeCount,
      expenseCount,
      totalTransactions: incomeCount + expenseCount,
    };

    // Query for List Data
    let incomeQuery = "";
    if (type === "all" || type === "income") {
      incomeQuery = `
        SELECT 
          'TXN-INC-' || fie.id AS transaction_id,
          fie.id AS raw_id,
          'income' AS transaction_type,
          fie.income_date AS transaction_date,
          COALESCE(fie.payer_name, fie.paid_by_label, 'Customer') AS party_name,
          fie.customer_phone AS party_phone,
          fie.customer_email AS party_email,
          fic.name AS category_name,
          fie.category_id,
          fie.payment_method,
          COALESCE(fie.payment_status, 'paid') AS payment_status,
          COALESCE(fie.transaction_status, 'completed') AS transaction_status,
          fie.amount AS total_amount,
          COALESCE(fie.amount_received, fie.amount) AS amount_settled,
          COALESCE(fie.pending_amount, 0) AS balance_pending,
          fie.subtotal,
          fie.discount_amount,
          fie.tax_amount,
          fie.description,
          fie.reference_no,
          inv.invoice_number AS bill_number,
          inv.id AS invoice_id,
          fie.invoice_url AS document_url,
          fie.items,
          COALESCE(u.full_name, 'Admin') AS created_by_name,
          fie.created_at
        FROM finance_income_entries fie
        LEFT JOIN finance_income_categories fic ON fic.id = fie.category_id
        LEFT JOIN finance_invoices inv ON inv.income_id = fie.id
        LEFT JOIN users u ON u.id = fie.created_by
        WHERE ${incomeConditions.join(" AND ")}
      `;
    }

    let expenseQuery = "";
    if (type === "all" || type === "expense") {
      expenseQuery = `
        SELECT 
          'TXN-EXP-' || fee.id AS transaction_id,
          fee.id AS raw_id,
          'expense' AS transaction_type,
          fee.expense_date AS transaction_date,
          COALESCE(fee.vendor_name, fee.paid_to_label, 'Vendor') AS party_name,
          fee.vendor_phone AS party_phone,
          fee.vendor_email AS party_email,
          fec.name AS category_name,
          fee.category_id,
          fee.payment_method,
          COALESCE(fee.payment_status, 'paid') AS payment_status,
          COALESCE(fee.transaction_status, 'completed') AS transaction_status,
          fee.amount AS total_amount,
          COALESCE(fee.amount_paid, fee.amount) AS amount_settled,
          COALESCE(fee.outstanding_amount, 0) AS balance_pending,
          fee.subtotal,
          fee.discount_amount,
          fee.tax_amount,
          fee.description,
          COALESCE(fee.reference_no, fee.invoice_no) AS reference_no,
          fee.invoice_no AS bill_number,
          NULL::BIGINT AS invoice_id,
          fee.invoice_url AS document_url,
          fee.items,
          COALESCE(u.full_name, 'Admin') AS created_by_name,
          fee.created_at
        FROM finance_expense_entries fee
        LEFT JOIN finance_expense_categories fec ON fec.id = fee.category_id
        LEFT JOIN users u ON u.id = fee.created_by
        WHERE ${expenseConditions.join(" AND ")}
      `;
    }

    let combinedQuery = "";
    let combinedParams: any[] = [];

    if (type === "income") {
      combinedQuery = `${incomeQuery} ORDER BY transaction_date DESC, raw_id DESC LIMIT $${incomeParams.length + 1} OFFSET $${incomeParams.length + 2}`;
      combinedParams = [...incomeParams, limit, offset];
    } else if (type === "expense") {
      combinedQuery = `${expenseQuery} ORDER BY transaction_date DESC, raw_id DESC LIMIT $${expenseParams.length + 1} OFFSET $${expenseParams.length + 2}`;
      combinedParams = [...expenseParams, limit, offset];
    } else {
      combinedQuery = `
        (${incomeQuery})
        UNION ALL
        (${expenseQuery})
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      // When combining without parameter collision, we can run parameterized if we offset indexes
      // Or run individually and slice
    }

    let transactions: any[] = [];
    let totalRecords = 0;

    if (type === "income") {
      const countRes = await db.query(`SELECT COUNT(*)::INT as total FROM finance_income_entries fie LEFT JOIN finance_income_categories fic ON fic.id = fie.category_id LEFT JOIN finance_invoices inv ON inv.income_id = fie.id WHERE ${incomeConditions.join(" AND ")}`, incomeParams);
      totalRecords = countRes.rows[0]?.total || 0;
      const dataRes = await db.query(combinedQuery, combinedParams);
      transactions = dataRes.rows;
    } else if (type === "expense") {
      const countRes = await db.query(`SELECT COUNT(*)::INT as total FROM finance_expense_entries fee LEFT JOIN finance_expense_categories fec ON fec.id = fee.category_id WHERE ${expenseConditions.join(" AND ")}`, expenseParams);
      totalRecords = countRes.rows[0]?.total || 0;
      const dataRes = await db.query(combinedQuery, combinedParams);
      transactions = dataRes.rows;
    } else {
      const [incomeRes, expenseRes] = await Promise.all([
        db.query(incomeQuery, incomeParams),
        db.query(expenseQuery, expenseParams),
      ]);
      const allRows = [...incomeRes.rows, ...expenseRes.rows];
      allRows.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      totalRecords = allRows.length;
      transactions = allRows.slice(offset, offset + limit);
    }

    // Lookup options for forms
    const [incCatRes, expCatRes, clientsRes, vendorsRes, inventoryRes, payMethodsRes] = await Promise.all([
      db.query(`SELECT id, name FROM finance_income_categories WHERE is_active = TRUE AND (scope_type = $1 OR ($2::INT IS NOT NULL AND institution_id = $2)) ORDER BY name ASC`, [scope, institutionId]),
      db.query(`SELECT id, name FROM finance_expense_categories WHERE is_active = TRUE AND (scope_type = $1 OR ($2::INT IS NOT NULL AND institution_id = $2)) ORDER BY name ASC`, [scope, institutionId]),
      institutionId ? db.query(`SELECT id, name, company_name, email, phone, address FROM clients WHERE institution_id = $1 ORDER BY name ASC LIMIT 200`, [institutionId]) : { rows: [] },
      institutionId ? db.query(`SELECT id, name, company_name, email, phone, address FROM vendors WHERE institution_id = $1 ORDER BY name ASC LIMIT 200`, [institutionId]) : { rows: [] },
      institutionId ? db.query(`SELECT id, name, sku, unit, unit_price, quantity FROM inventory_items WHERE institution_id = $1 ORDER BY name ASC LIMIT 200`, [institutionId]) : { rows: [] },
      db.query(`SELECT id, method_name, method_key, category FROM finance_payment_methods WHERE is_active = TRUE AND (scope_type = $1 OR ($2::INT IS NOT NULL AND institution_id = $2)) ORDER BY id ASC`, [scope, institutionId]),
    ]);

    return NextResponse.json({
      success: true,
      summary,
      transactions,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
      lookups: {
        incomeCategories: incCatRes.rows,
        expenseCategories: expCatRes.rows,
        customers: clientsRes.rows,
        vendors: vendorsRes.rows,
        inventoryItems: inventoryRes.rows,
        paymentMethods: payMethodsRes.rows,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/finance/transactions error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = await db.connect();
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type, // 'income' | 'expense'
      institutionId: reqInstitutionId,
      transactionDate,
      categoryId,
      description,
      referenceNo,
      paymentMethod = "cash",
      items = [],
      subtotal: rawSubtotal,
      discountAmount: rawDiscount = 0,
      taxAmount: rawTax = 0,
      totalAmount: rawTotal,
      amountSettled: rawSettled,
      notes,
      documentUrl,
      // Income specific
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      // Expense specific
      vendorId,
      vendorName,
      vendorPhone,
      vendorEmail,
      supplierInvoiceNo,
      updateInventory = false,
    } = body;

    const { scope, institutionId } = resolveScope(user, reqInstitutionId ? Number(reqInstitutionId) : null);
    const subtotal = Number(rawSubtotal || 0);
    const discount = Number(rawDiscount || 0);
    const tax = Number(rawTax || 0);
    const total = Number(rawTotal || (subtotal - discount + tax));
    const settled = Number(rawSettled ?? total);
    const pending = Math.max(0, total - settled);

    let paymentStatus = "paid";
    if (settled <= 0) {
      paymentStatus = "unpaid";
    } else if (settled < total) {
      paymentStatus = "partially_paid";
    }

    await client.query("BEGIN");

    if (type === "income") {
      let finalCustomerId = customerId ? Number(customerId) : null;
      let finalCustomerName = customerName?.trim() || "";
      let finalCustomerPhone = customerPhone?.trim() || "";
      let finalCustomerEmail = customerEmail?.trim() || "";

      // If customer is selected from existing clients, pull details
      if (finalCustomerId) {
        const cRes = await client.query(`SELECT id, name, phone, email, address FROM clients WHERE id = $1 LIMIT 1`, [finalCustomerId]);
        if (cRes.rows[0]) {
          finalCustomerName = cRes.rows[0].name || finalCustomerName;
          finalCustomerPhone = cRes.rows[0].phone || finalCustomerPhone;
          finalCustomerEmail = cRes.rows[0].email || finalCustomerEmail;
        }
      } else if (finalCustomerName && institutionId) {
        // Create new customer record in clients table
        const newClientRes = await client.query(
          `INSERT INTO clients (name, phone, email, address, institution_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [finalCustomerName, finalCustomerPhone || null, finalCustomerEmail || null, customerAddress || null, institutionId]
        );
        finalCustomerId = newClientRes.rows[0]?.id || null;
      }

      // Insert into finance_income_entries
      const incomeRes = await client.query(
        `INSERT INTO finance_income_entries (
          scope_type, institution_id, category_id, payment_method, payment_status,
          amount, income_date, description, reference_no, notes,
          customer_id, customer_phone, customer_email, payer_name,
          subtotal, discount_amount, tax_amount, amount_received, pending_amount,
          items, invoice_url, transaction_status, created_by, updated_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, 'completed', $22, $22, NOW(), NOW()
        ) RETURNING id`,
        [
          scope, institutionId, categoryId || null, paymentMethod, paymentStatus,
          total, transactionDate || new Date().toISOString().slice(0, 10), description || null, referenceNo || null, notes || null,
          finalCustomerId, finalCustomerPhone || null, finalCustomerEmail || null, finalCustomerName || "Customer",
          subtotal, discount, tax, settled, pending,
          JSON.stringify(items || []), documentUrl || null, user.id
        ]
      );

      const incomeId = incomeRes.rows[0].id;

      // Mandatory Automatic Bill / Invoice Generation
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const invoiceNumber = `INV-${datePart}-${String(incomeId).padStart(4, "0")}`;

      let catName = "Income";
      if (categoryId) {
        const catRes = await client.query(`SELECT name FROM finance_income_categories WHERE id = $1 LIMIT 1`, [categoryId]);
        if (catRes.rows[0]) catName = catRes.rows[0].name;
      }

      let institutionName = "EduBird Business";
      let institutionAddress = "";
      if (institutionId) {
        const instRes = await client.query(`SELECT name, address, phone, email FROM institution_profiles WHERE id = $1 LIMIT 1`, [institutionId]);
        if (instRes.rows[0]) {
          institutionName = instRes.rows[0].name || institutionName;
          institutionAddress = instRes.rows[0].address || "";
        }
      }

      await client.query(
        `INSERT INTO finance_invoices (
          invoice_number, scope_type, institution_id, income_id, source_type,
          payer_name, receiver_name, category_name, payment_method,
          amount, tax_amount, total_amount, subtotal, discount_amount,
          customer_phone, customer_email, customer_address, items,
          invoice_date, status, notes, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'income',
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20, $21, NOW(), NOW()
        ) ON CONFLICT (invoice_number) DO UPDATE SET total_amount = EXCLUDED.total_amount`,
        [
          invoiceNumber, scope, institutionId, incomeId,
          finalCustomerName || "Customer", institutionName, catName, paymentMethod,
          subtotal, tax, total, subtotal, discount,
          finalCustomerPhone || null, finalCustomerEmail || null, customerAddress || null, JSON.stringify(items || []),
          transactionDate || new Date().toISOString().slice(0, 10), paymentStatus, notes || null, user.id
        ]
      );

      // Record initial payment record in finance_transaction_payments
      if (settled > 0) {
        await client.query(
          `INSERT INTO finance_transaction_payments (
            transaction_type, transaction_id, payment_date, amount, payment_method, reference_no, notes, created_by
          ) VALUES ('income', $1, $2, $3, $4, $5, 'Initial payment upon entry', $6)`,
          [incomeId, transactionDate || new Date().toISOString().slice(0, 10), settled, paymentMethod, referenceNo || null, user.id]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: "Income transaction created and invoice generated successfully.",
        transactionId: `TXN-INC-${incomeId}`,
        rawId: incomeId,
        invoiceNumber,
      });

    } else if (type === "expense") {
      let finalVendorId = vendorId ? Number(vendorId) : null;
      let finalVendorName = vendorName?.trim() || "";
      let finalVendorPhone = vendorPhone?.trim() || "";
      let finalVendorEmail = vendorEmail?.trim() || "";

      // If vendor is selected from existing vendors, pull details
      if (finalVendorId) {
        const vRes = await client.query(`SELECT id, name, phone, email, address FROM vendors WHERE id = $1 LIMIT 1`, [finalVendorId]);
        if (vRes.rows[0]) {
          finalVendorName = vRes.rows[0].name || finalVendorName;
          finalVendorPhone = vRes.rows[0].phone || finalVendorPhone;
          finalVendorEmail = vRes.rows[0].email || finalVendorEmail;
        }
      } else if (finalVendorName && institutionId) {
        // Create new vendor in vendors table
        const newVendorRes = await client.query(
          `INSERT INTO vendors (name, phone, email, institution_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [finalVendorName, finalVendorPhone || null, finalVendorEmail || null, institutionId]
        );
        finalVendorId = newVendorRes.rows[0]?.id || null;
      }

      // Insert into finance_expense_entries
      const expenseRes = await client.query(
        `INSERT INTO finance_expense_entries (
          scope_type, institution_id, category_id, payment_method, payment_status,
          amount, expense_date, description, reference_no, invoice_no, notes,
          vendor_id, vendor_name, vendor_phone, vendor_email,
          subtotal, discount_amount, tax_amount, amount_paid, outstanding_amount,
          items, invoice_url, transaction_status, created_by, updated_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, 'completed', $23, $23, NOW(), NOW()
        ) RETURNING id`,
        [
          scope, institutionId, categoryId || null, paymentMethod, paymentStatus,
          total, transactionDate || new Date().toISOString().slice(0, 10), description || null, referenceNo || null, supplierInvoiceNo || null, notes || null,
          finalVendorId, finalVendorName || "Vendor", finalVendorPhone || null, finalVendorEmail || null,
          subtotal, discount, tax, settled, pending,
          JSON.stringify(items || []), documentUrl || null, user.id
        ]
      );

      const expenseId = expenseRes.rows[0].id;

      // Update Inventory Items if requested
      if (updateInventory && Array.isArray(items) && items.length > 0 && institutionId) {
        for (const item of items) {
          const qty = Number(item.quantity || 0);
          if (qty > 0) {
            if (item.inventoryId) {
              await client.query(
                `UPDATE inventory_items 
                 SET quantity = quantity + $1, updated_at = NOW() 
                 WHERE id = $2 AND institution_id = $3`,
                [qty, Number(item.inventoryId), institutionId]
              );
            } else if (item.name) {
              // Try matching by name
              await client.query(
                `UPDATE inventory_items 
                 SET quantity = quantity + $1, updated_at = NOW() 
                 WHERE LOWER(name) = LOWER($2) AND institution_id = $3`,
                [qty, item.name.trim(), institutionId]
              );
            }
          }
        }
      }

      // Record initial payment record in finance_transaction_payments
      if (settled > 0) {
        await client.query(
          `INSERT INTO finance_transaction_payments (
            transaction_type, transaction_id, payment_date, amount, payment_method, reference_no, notes, created_by
          ) VALUES ('expense', $1, $2, $3, $4, $5, 'Initial payment upon entry', $6)`,
          [expenseId, transactionDate || new Date().toISOString().slice(0, 10), settled, paymentMethod, referenceNo || supplierInvoiceNo || null, user.id]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: "Expense transaction recorded successfully.",
        transactionId: `TXN-EXP-${expenseId}`,
        rawId: expenseId,
      });
    } else {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/finance/transactions error:", error);
    return NextResponse.json({ error: error.message || "Failed to create transaction" }, { status: 500 });
  } finally {
    client.release();
  }
}

