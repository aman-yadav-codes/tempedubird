import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { resolveTenantContext } from "@/lib/records/tenant-context";

export async function GET(req: Request) {
  try {
    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const vertical = url.searchParams.get("vertical")?.trim().toLowerCase();

    const conditions: string[] = [
      "br.is_deleted = FALSE",
      "(br.business_id = $1 OR br.institution_id = $2)"
    ];
    const params: any[] = [tenant.businessId, tenant.institutionId || tenant.businessId];

    if (vertical) {
      params.push(vertical);
      conditions.push(`br.vertical_code = $${params.length}`);
    }

    const whereSql = `WHERE ${conditions.join(" AND ")}`;

    const res = await db.query(`
      SELECT
        br.id,
        br.vertical_code,
        br.title,
        br.slug,
        br.status,
        br.price,
        br.currency,
        cat.name as category,
        subcat.name as subcategory,
        br.description,
        br.created_at
      FROM business_records br
      LEFT JOIN master_records cat ON cat.id = br.category_id
      LEFT JOIN master_records subcat ON subcat.id = br.subcategory_id
      ${whereSql}
      ORDER BY br.id DESC
      LIMIT 1000
    `, params);

    const headers = ["ID", "Vertical", "Title", "Slug", "Status", "Price", "Currency", "Category", "Subcategory", "Description", "Created At"];
    const csvRows = [headers.join(",")];

    for (const r of res.rows) {
      const row = [
        r.id,
        `"${(r.vertical_code || "").replace(/"/g, '""')}"`,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        `"${(r.slug || "").replace(/"/g, '""')}"`,
        `"${(r.status || "").replace(/"/g, '""')}"`,
        r.price || 0,
        `"${(r.currency || "INR").replace(/"/g, '""')}"`,
        `"${(r.category || "").replace(/"/g, '""')}"`,
        `"${(r.subcategory || "").replace(/"/g, '""')}"`,
        `"${(r.description || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${new Date(r.created_at).toISOString()}"`
      ];
      csvRows.push(row.join(","));
    }

    const csvData = csvRows.join("\n");
    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${vertical || 'business'}-records-${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("[Records Export GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to export records" }, { status: 500 });
  }
}
