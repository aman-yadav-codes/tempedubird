import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

export async function GET(req: Request) {
  try {
    await ensureMasterDataSchema();
    const url = new URL(req.url);
    const verticalParam = url.searchParams.get("vertical");
    const typeParam = url.searchParams.get("type");
    const format = url.searchParams.get("format") || "csv"; // 'csv' or 'json'

    const conditions: string[] = ["r.status <> 'archived'"];
    const params: any[] = [];

    if (verticalParam) {
      if (/^\d+$/.test(verticalParam)) {
        params.push(Number(verticalParam));
        conditions.push(`r.vertical_id = $${params.length}`);
      } else {
        params.push(verticalParam.toLowerCase());
        conditions.push(`LOWER(v.code) = $${params.length}`);
      }
    }

    if (typeParam) {
      if (/^\d+$/.test(typeParam)) {
        params.push(Number(typeParam));
        conditions.push(`r.master_type_id = $${params.length}`);
      } else {
        params.push(typeParam.toLowerCase());
        conditions.push(`LOWER(mt.code) = $${params.length}`);
      }
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const res = await db.query(`
      SELECT
        r.id,
        v.name AS vertical_name,
        mt.name AS master_type_name,
        mt.code AS master_type_code,
        r.name,
        r.code,
        r.slug,
        p.name AS parent_name,
        r.description,
        r.status,
        r.display_order,
        r.created_at
      FROM master_records r
      JOIN master_verticals v ON v.id = r.vertical_id
      JOIN master_types mt ON mt.id = r.master_type_id
      LEFT JOIN master_records p ON p.id = r.parent_id
      ${whereSql}
      ORDER BY mt.vertical_id ASC, mt.hierarchy_level ASC, r.display_order ASC, r.id ASC;
    `, params);

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: res.rows,
      });
    }

    // Generate CSV
    const headers = ["ID", "Vertical", "Master Type", "Name", "Code", "Slug", "Parent Name", "Description", "Status", "Display Order", "Created At"];
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.join(",")];
    for (const row of res.rows) {
      csvLines.push([
        row.id,
        escapeCsv(row.vertical_name),
        escapeCsv(row.master_type_name),
        escapeCsv(row.name),
        escapeCsv(row.code),
        escapeCsv(row.slug),
        escapeCsv(row.parent_name),
        escapeCsv(row.description),
        escapeCsv(row.status),
        row.display_order,
        escapeCsv(row.created_at),
      ].join(","));
    }

    const csvOutput = csvLines.join("\n");
    return new NextResponse(csvOutput, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="master-data-${verticalParam || "all"}-${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("[Master Export GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to export master data" }, { status: 500 });
  }
}
