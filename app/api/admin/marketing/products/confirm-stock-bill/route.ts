import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      bill_image_url,
      vendor_name = "Wholesale Supplier",
      bill_number = "",
      bill_date = new Date().toISOString().split("T")[0],
      total_amount = 0,
      payment_method = "upi",
      payment_status = "paid",
      record_expense = true,
      items = [],
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No products provided to update stock." }, { status: 400 });
    }

    const currentUserId = user.id ? Number(user.id) : null;
    const instId = (user as any)?.institution_id ? Number((user as any).institution_id) : null;

    let updatedProductsCount = 0;
    const updatedProductNames: string[] = [];

    // 1. Update stock for each product in database
    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const unit = (item.unit || "Piece").trim();

      if (item.product_id && Number(item.product_id) > 0) {
        // Update existing product
        await db.query(
          `UPDATE products 
           SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) + $1),
               unit = COALESCE(NULLIF($2, ''), unit),
               updated_at = NOW()
           WHERE id = $3`,
          [qty, unit, Number(item.product_id)]
        );
        updatedProductsCount++;
        updatedProductNames.push(`${item.product_name || "Product"} (+${qty} ${unit})`);
      } else if (item.product_name) {
        // Create as new product listing from bill
        const title = item.product_name.trim();
        const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;
        const costPrice = Number(item.unit_price) || 50;
        const sellingPrice = Math.round(costPrice * 1.3); // standard markup default

        await db.query(
          `INSERT INTO products (
             title, slug, price, sale_price, stock_quantity, unit, category, status,
             institution_id, created_by, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, NOW(), NOW())`,
          [
            title,
            slug,
            sellingPrice,
            costPrice,
            qty,
            unit,
            "General",
            instId,
            currentUserId,
          ]
        );
        updatedProductsCount++;
        updatedProductNames.push(`${title} (New, ${qty} ${unit})`);
      }
    }

    // 2. Record in Finance Expenses with bill picture
    let expenseId: number | null = null;
    if (record_expense && Number(total_amount) > 0) {
      try {
        // Find or create "Inventory / Stock Purchase" category
        let catRes = await db.query(
          `SELECT id FROM finance_expense_categories 
           WHERE name ILIKE '%inventory%' OR name ILIKE '%stock%'
           LIMIT 1`
        );
        let categoryId: number;
        if (catRes.rows.length > 0) {
          categoryId = Number(catRes.rows[0].id);
        } else {
          const newCat = await db.query(
            `INSERT INTO finance_expense_categories (name, scope_type, is_active, created_at)
             VALUES ('Inventory / Stock Purchase', 'institution', true, NOW())
             RETURNING id`
          );
          categoryId = Number(newCat.rows[0].id);
        }

        const validPaymentMethod = ["cash", "upi", "net_banking"].includes(payment_method)
          ? payment_method
          : "upi";
        const validPaymentStatus = ["paid", "due"].includes(payment_status)
          ? payment_status
          : "paid";

        const summaryDesc = [
          `Stock Bill #${bill_number || "PURCHASE"}`,
          `Vendor: ${vendor_name}`,
          `Items: ${updatedProductNames.slice(0, 5).join(", ")}${updatedProductNames.length > 5 ? ` (+${updatedProductNames.length - 5} more)` : ""}`,
        ].join(" | ");

        const expRes = await db.query(
          `INSERT INTO finance_expense_entries (
             scope_type, institution_id, category_id,
             payment_method, payment_status,
             paid_by, paid_by_label,
             paid_to, paid_to_label,
             amount, expense_date,
             invoice_url, invoice_file_name,
             description, created_by, user_id,
             created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15, NOW(), NOW()
           ) RETURNING id`,
          [
            instId ? "institution" : "platform",
            instId,
            categoryId,
            validPaymentMethod,
            validPaymentStatus,
            String(currentUserId || "1"),
            user.full_name || "Store Owner",
            vendor_name,
            vendor_name,
            Number(total_amount),
            bill_date,
            bill_image_url || null,
            `Bill-${bill_number || Date.now()}`,
            summaryDesc,
            currentUserId,
          ]
        );

        if (expRes.rows.length > 0) {
          expenseId = Number(expRes.rows[0].id);
        }
      } catch (expErr) {
        console.warn("[Confirm Stock Bill] Failed to record in finance expenses:", expErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Stock successfully updated for ${updatedProductsCount} product(s)!${expenseId ? " Bill recorded in Finance Expenses." : ""}`,
      updated_products_count: updatedProductsCount,
      expense_id: expenseId,
    });
  } catch (error: any) {
    console.error("[Confirm Stock Bill API] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to confirm and update stock from bill" }, { status: 500 });
  }
}
