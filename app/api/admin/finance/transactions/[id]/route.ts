import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isIncome = id.startsWith("TXN-INC-");
    const isExpense = id.startsWith("TXN-EXP-");
    const rawId = parseInt(id.replace("TXN-INC-", "").replace("TXN-EXP-", ""), 10);

    if (isNaN(rawId)) {
      return NextResponse.json({ error: "Invalid transaction ID format" }, { status: 400 });
    }

    if (isIncome) {
      const res = await db.query(
        `SELECT 
          'TXN-INC-' || fie.id AS transaction_id,
          fie.id AS raw_id,
          'income' AS transaction_type,
          fie.income_date AS transaction_date,
          COALESCE(fie.payer_name, fie.paid_by_label, 'Customer') AS party_name,
          fie.customer_phone AS party_phone,
          fie.customer_email AS party_email,
          fie.customer_id,
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
          fie.notes,
          inv.invoice_number AS bill_number,
          inv.id AS invoice_id,
          inv.customer_address,
          fie.invoice_url AS document_url,
          fie.items,
          COALESCE(u.full_name, 'Admin') AS created_by_name,
          fie.created_at,
          ip.name AS institution_name,
          ip.address AS institution_address,
          ip.phone AS institution_phone,
          ip.email AS institution_email
        FROM finance_income_entries fie
        LEFT JOIN finance_income_categories fic ON fic.id = fie.category_id
        LEFT JOIN finance_invoices inv ON inv.income_id = fie.id
        LEFT JOIN users u ON u.id = fie.created_by
        LEFT JOIN institution_profiles ip ON ip.id = fie.institution_id
        WHERE fie.id = $1`,
        [rawId]
      );

      if (!res.rows[0]) {
        return NextResponse.json({ error: "Income transaction not found" }, { status: 404 });
      }

      // Fetch payment logs
      const payRes = await db.query(
        `SELECT ftp.*, u.full_name AS created_by_name
         FROM finance_transaction_payments ftp
         LEFT JOIN users u ON u.id = ftp.created_by
         WHERE ftp.transaction_type = 'income' AND ftp.transaction_id = $1
         ORDER BY ftp.payment_date DESC, ftp.id DESC`,
        [rawId]
      );

      return NextResponse.json({
        success: true,
        transaction: res.rows[0],
        payments: payRes.rows,
      });
    } else if (isExpense) {
      const res = await db.query(
        `SELECT 
          'TXN-EXP-' || fee.id AS transaction_id,
          fee.id AS raw_id,
          'expense' AS transaction_type,
          fee.expense_date AS transaction_date,
          COALESCE(fee.vendor_name, fee.paid_to_label, 'Vendor') AS party_name,
          fee.vendor_phone AS party_phone,
          fee.vendor_email AS party_email,
          fee.vendor_id,
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
          fee.notes,
          fee.invoice_url AS document_url,
          fee.items,
          COALESCE(u.full_name, 'Admin') AS created_by_name,
          fee.created_at,
          ip.name AS institution_name,
          ip.address AS institution_address,
          ip.phone AS institution_phone,
          ip.email AS institution_email
        FROM finance_expense_entries fee
        LEFT JOIN finance_expense_categories fec ON fec.id = fee.category_id
        LEFT JOIN users u ON u.id = fee.created_by
        LEFT JOIN institution_profiles ip ON ip.id = fee.institution_id
        WHERE fee.id = $1`,
        [rawId]
      );

      if (!res.rows[0]) {
        return NextResponse.json({ error: "Expense transaction not found" }, { status: 404 });
      }

      // Fetch payment logs
      const payRes = await db.query(
        `SELECT ftp.*, u.full_name AS created_by_name
         FROM finance_transaction_payments ftp
         LEFT JOIN users u ON u.id = ftp.created_by
         WHERE ftp.transaction_type = 'expense' AND ftp.transaction_id = $1
         ORDER BY ftp.payment_date DESC, ftp.id DESC`,
        [rawId]
      );

      return NextResponse.json({
        success: true,
        transaction: res.rows[0],
        payments: payRes.rows,
      });
    } else {
      return NextResponse.json({ error: "Unknown transaction type format" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("GET /api/admin/finance/transactions/[id] error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// Record partial payment or update payment details
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await db.connect();
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isIncome = id.startsWith("TXN-INC-");
    const isExpense = id.startsWith("TXN-EXP-");
    const rawId = parseInt(id.replace("TXN-INC-", "").replace("TXN-EXP-", ""), 10);

    const body = await req.json();
    const {
      amount,
      paymentMethod = "cash",
      paymentDate = new Date().toISOString().slice(0, 10),
      referenceNo,
      notes,
    } = body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than 0" }, { status: 400 });
    }

    await client.query("BEGIN");

    if (isIncome) {
      const incRes = await client.query(
        `SELECT id, amount, COALESCE(amount_received, amount) AS amount_received, COALESCE(pending_amount, 0) AS pending_amount
         FROM finance_income_entries WHERE id = $1 FOR UPDATE`,
        [rawId]
      );

      if (!incRes.rows[0]) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      const total = Number(incRes.rows[0].amount);
      const currentReceived = Number(incRes.rows[0].amount_received);
      const newReceived = currentReceived + paymentAmount;
      const newPending = Math.max(0, total - newReceived);
      const newStatus = newPending === 0 ? "paid" : "partially_paid";

      // Insert payment record
      await client.query(
        `INSERT INTO finance_transaction_payments (
          transaction_type, transaction_id, payment_date, amount, payment_method, reference_no, notes, created_by
        ) VALUES ('income', $1, $2, $3, $4, $5, $6, $7)`,
        [rawId, paymentDate, paymentAmount, paymentMethod, referenceNo || null, notes || null, user.id]
      );

      // Update income record
      await client.query(
        `UPDATE finance_income_entries
         SET amount_received = $1, pending_amount = $2, payment_status = $3, updated_at = NOW(), updated_by = $4
         WHERE id = $5`,
        [newReceived, newPending, newStatus, user.id, rawId]
      );

      // Update linked invoice status
      await client.query(
        `UPDATE finance_invoices
         SET status = $1, updated_at = NOW()
         WHERE income_id = $2`,
        [newStatus, rawId]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: "Payment recorded successfully",
        newReceived,
        newPending,
        paymentStatus: newStatus,
      });
    } else if (isExpense) {
      const expRes = await client.query(
        `SELECT id, amount, COALESCE(amount_paid, amount) AS amount_paid, COALESCE(outstanding_amount, 0) AS outstanding_amount
         FROM finance_expense_entries WHERE id = $1 FOR UPDATE`,
        [rawId]
      );

      if (!expRes.rows[0]) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      const total = Number(expRes.rows[0].amount);
      const currentPaid = Number(expRes.rows[0].amount_paid);
      const newPaid = currentPaid + paymentAmount;
      const newOutstanding = Math.max(0, total - newPaid);
      const newStatus = newOutstanding === 0 ? "paid" : "partially_paid";

      // Insert payment record
      await client.query(
        `INSERT INTO finance_transaction_payments (
          transaction_type, transaction_id, payment_date, amount, payment_method, reference_no, notes, created_by
        ) VALUES ('expense', $1, $2, $3, $4, $5, $6, $7)`,
        [rawId, paymentDate, paymentAmount, paymentMethod, referenceNo || null, notes || null, user.id]
      );

      // Update expense record
      await client.query(
        `UPDATE finance_expense_entries
         SET amount_paid = $1, outstanding_amount = $2, payment_status = $3, updated_at = NOW(), updated_by = $4
         WHERE id = $5`,
        [newPaid, newOutstanding, newStatus, user.id, rawId]
      );

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: "Payment recorded successfully",
        newPaid,
        newOutstanding,
        paymentStatus: newStatus,
      });
    } else {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Invalid transaction ID format" }, { status: 400 });
    }
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/finance/transactions/[id] payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  } finally {
    client.release();
  }
}

// Soft-delete / cancel transaction
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isIncome = id.startsWith("TXN-INC-");
    const isExpense = id.startsWith("TXN-EXP-");
    const rawId = parseInt(id.replace("TXN-INC-", "").replace("TXN-EXP-", ""), 10);

    if (isIncome) {
      await db.query(
        `UPDATE finance_income_entries
         SET transaction_status = 'cancelled', payment_status = 'cancelled', updated_at = NOW(), updated_by = $1
         WHERE id = $2`,
        [user.id, rawId]
      );
      await db.query(
        `UPDATE finance_invoices
         SET status = 'cancelled', updated_at = NOW()
         WHERE income_id = $1`,
        [rawId]
      );
      return NextResponse.json({ success: true, message: "Income transaction cancelled successfully" });
    } else if (isExpense) {
      await db.query(
        `UPDATE finance_expense_entries
         SET transaction_status = 'cancelled', payment_status = 'cancelled', updated_at = NOW(), updated_by = $1
         WHERE id = $2`,
        [user.id, rawId]
      );
      return NextResponse.json({ success: true, message: "Expense transaction cancelled successfully" });
    } else {
      return NextResponse.json({ error: "Invalid transaction ID format" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("DELETE /api/admin/finance/transactions/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel transaction" }, { status: 500 });
  }
}

