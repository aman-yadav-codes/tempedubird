import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";

let schemaReady = false;
async function ensurePaymentMethodsTable() {
  if (schemaReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS company_payment_methods (
        id SERIAL PRIMARY KEY,
        institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        method_type VARCHAR(50) NOT NULL DEFAULT 'upi_qr',
        display_name VARCHAR(255),
        upi_id VARCHAR(255),
        qr_code_url TEXT,
        bank_name VARCHAR(255),
        account_holder_name VARCHAR(255),
        account_number VARCHAR(100),
        ifsc_code VARCHAR(50),
        branch_name VARCHAR(255),
        account_type VARCHAR(50) DEFAULT 'Current',
        gateway_provider VARCHAR(100),
        merchant_id VARCHAR(255),
        instructions TEXT,
        convenience_fee_percent NUMERIC(5, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    schemaReady = true;
  } catch (err) {
    console.error("Error creating company_payment_methods table:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await ensurePaymentMethodsTable();

    const url = new URL(req.url);
    const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");

    let institutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam))) {
      institutionId = Number(institutionIdParam);
    } else if (user?.memberships?.length > 0) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    const isPlatform = isPlatformAdminUser(user);

    let query: string;
    let params: unknown[] = [];

    if (!isPlatform && institutionId) {
      query = `
        SELECT * FROM company_payment_methods 
        WHERE (institution_id = $1 OR institution_id IS NULL)
        ORDER BY is_active DESC, sort_order ASC, id ASC;
      `;
      params = [institutionId];
    } else if (institutionId && institutionIdParam) {
      query = `
        SELECT * FROM company_payment_methods 
        WHERE (institution_id = $1 OR institution_id IS NULL)
        ORDER BY is_active DESC, sort_order ASC, id ASC;
      `;
      params = [institutionId];
    } else {
      query = `
        SELECT * FROM company_payment_methods 
        ORDER BY is_active DESC, sort_order ASC, id ASC;
      `;
    }

    const res = await db.query(query, params);
    return NextResponse.json({ data: res.rows || [] });
  } catch (err: any) {
    console.error("Error in GET /api/admin/company/payment-methods:", err);
    return NextResponse.json({ error: err.message || "Failed to load payment methods", data: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await ensurePaymentMethodsTable();

    const body = await req.json();
    const {
      institution_id,
      name,
      method_type,
      display_name,
      upi_id,
      qr_code_url,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      gateway_provider,
      merchant_id,
      instructions,
      convenience_fee_percent,
      is_active,
      sort_order,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Payment method name is required" }, { status: 400 });
    }

    const isPlatform = isPlatformAdminUser(user);
    const resolvedInstId = isPlatform
      ? (institution_id ? Number(institution_id) : null)
      : (institution_id ? Number(institution_id) : user?.memberships?.[0]?.institution_id || null);

    const res = await db.query(
      `
      INSERT INTO company_payment_methods (
        institution_id,
        name,
        method_type,
        display_name,
        upi_id,
        qr_code_url,
        bank_name,
        account_holder_name,
        account_number,
        ifsc_code,
        branch_name,
        account_type,
        gateway_provider,
        merchant_id,
        instructions,
        convenience_fee_percent,
        is_active,
        sort_order,
        created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *;
    `,
      [
        resolvedInstId,
        name.trim(),
        method_type || "upi_qr",
        display_name?.trim() || name.trim(),
        upi_id?.trim() || null,
        qr_code_url?.trim() || null,
        bank_name?.trim() || null,
        account_holder_name?.trim() || null,
        account_number?.trim() || null,
        ifsc_code?.trim() || null,
        branch_name?.trim() || null,
        account_type || "Current",
        gateway_provider?.trim() || null,
        merchant_id?.trim() || null,
        instructions?.trim() || null,
        Number(convenience_fee_percent) || 0,
        is_active !== false,
        Number(sort_order) || 0,
        user?.full_name || "Admin",
      ]
    );

    return NextResponse.json({ data: res.rows[0], message: "Payment method created successfully" }, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/admin/company/payment-methods:", err);
    return NextResponse.json({ error: err.message || "Failed to create payment method" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await ensurePaymentMethodsTable();

    const body = await req.json();
    const {
      id,
      name,
      method_type,
      display_name,
      upi_id,
      qr_code_url,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      gateway_provider,
      merchant_id,
      instructions,
      convenience_fee_percent,
      is_active,
      sort_order,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Payment method ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE company_payment_methods
      SET name = COALESCE($1, name),
          method_type = COALESCE($2, method_type),
          display_name = $3,
          upi_id = $4,
          qr_code_url = $5,
          bank_name = $6,
          account_holder_name = $7,
          account_number = $8,
          ifsc_code = $9,
          branch_name = $10,
          account_type = COALESCE($11, account_type),
          gateway_provider = $12,
          merchant_id = $13,
          instructions = $14,
          convenience_fee_percent = COALESCE($15, convenience_fee_percent),
          is_active = COALESCE($16, is_active),
          sort_order = COALESCE($17, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *;
    `,
      [
        name ? name.trim() : null,
        method_type || null,
        display_name?.trim() || null,
        upi_id?.trim() || null,
        qr_code_url?.trim() || null,
        bank_name?.trim() || null,
        account_holder_name?.trim() || null,
        account_number?.trim() || null,
        ifsc_code?.trim() || null,
        branch_name?.trim() || null,
        account_type || null,
        gateway_provider?.trim() || null,
        merchant_id?.trim() || null,
        instructions?.trim() || null,
        convenience_fee_percent !== undefined ? Number(convenience_fee_percent) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        sort_order !== undefined ? Number(sort_order) : null,
        id,
      ]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    return NextResponse.json({ data: res.rows[0], message: "Payment method updated successfully" });
  } catch (err: any) {
    console.error("Error in PUT /api/admin/company/payment-methods:", err);
    return NextResponse.json({ error: err.message || "Failed to update payment method" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Payment method ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM company_payment_methods WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Payment method deleted successfully" });
  } catch (err: any) {
    console.error("Error in DELETE /api/admin/company/payment-methods:", err);
    return NextResponse.json({ error: err.message || "Failed to delete payment method" }, { status: 500 });
  }
}
