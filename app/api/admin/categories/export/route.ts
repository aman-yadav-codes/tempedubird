import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import * as xlsx from "xlsx";

const TYPE_MAP: Record<string, { title: string; fileName: string; whereSql: string }> = {
  business: {
    title: "Business Categories",
    fileName: "Business_Categories.xlsx",
    whereSql: "c.category_type = 'business'",
  },
  product: {
    title: "Product Categories",
    fileName: "Product_Categories.xlsx",
    whereSql: "c.category_type = 'product'",
  },
  service: {
    title: "Service Categories",
    fileName: "Service_Categories.xlsx",
    whereSql: "c.category_type = 'service'",
  },
  professional: {
    title: "Professional Categories",
    fileName: "Professional_Categories.xlsx",
    whereSql: "c.category_type = 'professional'",
  },
  course: {
    title: "Course Categories",
    fileName: "Course_Categories.xlsx",
    whereSql: "c.category_type IN ('course', 'courses', 'academic')",
  },
  job: {
    title: "Job Categories",
    fileName: "Job_Categories.xlsx",
    whereSql: "c.category_type IN ('job', 'jobs')",
  },
  vehicle: {
    title: "Vehicle Categories",
    fileName: "Vehicle_Categories.xlsx",
    whereSql: "c.category_type = 'vehicle'",
  },
  property: {
    title: "Property Categories",
    fileName: "Property_Categories.xlsx",
    whereSql: "c.category_type = 'property'",
  },
  event: {
    title: "Event Categories",
    fileName: "Event_Categories.xlsx",
    whereSql: "c.category_type = 'event'",
  },
  dish: {
    title: "Dish Categories",
    fileName: "Dish_Categories.xlsx",
    whereSql: "c.category_type = 'dish'",
  },
  room: {
    title: "Room Categories",
    fileName: "Room_Categories.xlsx",
    whereSql: "c.category_type = 'room'",
  },
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const typeParam = url.searchParams.get("type")?.trim().toLowerCase() || "all";

    const colWidths = [
      { wch: 12 }, // ID
      { wch: 32 }, // Name
      { wch: 32 }, // Slug
      { wch: 15 }, // Level
      { wch: 8 },  // Depth
      { wch: 18 }, // Parent ID
      { wch: 28 }, // Parent Name
      { wch: 15 }, // Category Type
      { wch: 28 }, // Mapped Sector
      { wch: 28 }, // Mapped Subcat
      { wch: 10 }, // Status
      { wch: 14 }, // Display Order
      { wch: 35 }, // Description
      { wch: 30 }, // Synonyms
      { wch: 15 }, // Countries
      { wch: 30 }, // Icon URL
      { wch: 30 }, // Image URL
      { wch: 22 }, // Created At
    ];

    if (typeParam !== "all" && TYPE_MAP[typeParam]) {
      const config = TYPE_MAP[typeParam];
      const res = await db.query(`
        SELECT 
          c.id AS "Category ID",
          c.name AS "Category Name",
          c.slug AS "Slug",
          CASE 
            WHEN c.parent_id IS NULL THEN 'Main Category'
            ELSE 'Subcategory'
          END AS "Level",
          c.depth AS "Depth",
          c.parent_id AS "Parent Category ID",
          p.name AS "Parent Category Name",
          c.category_type AS "Category Type",
          bc.name AS "Mapped Business Sector",
          bsc.name AS "Mapped Business Subcategory",
          CASE WHEN c.is_active THEN 'Active' ELSE 'Inactive' END AS "Status",
          c.display_order AS "Display Order",
          c.description AS "Description",
          array_to_string(c.synonyms, ', ') AS "Synonyms",
          array_to_string(c.countries, ', ') AS "Countries",
          c.icon_url AS "Icon URL",
          c.image_url AS "Image URL",
          c.created_at AS "Created At"
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id
        LEFT JOIN categories bc ON bc.id = COALESCE(c.business_category_id, p.business_category_id)
        LEFT JOIN categories bsc ON bsc.id = COALESCE(c.business_subcategory_id, p.business_subcategory_id)
        WHERE c.is_deleted = FALSE AND (${config.whereSql})
        ORDER BY 
          CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
          c.display_order ASC,
          c.name ASC;
      `);

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(res.rows);
      ws["!cols"] = colWidths;
      xlsx.utils.book_append_sheet(wb, ws, config.title.slice(0, 31));

      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${config.fileName}"`,
        },
      });
    }

    // Export ALL categories in a multi-sheet workbook
    const masterWorkbook = xlsx.utils.book_new();

    for (const [key, config] of Object.entries(TYPE_MAP)) {
      const res = await db.query(`
        SELECT 
          c.id AS "Category ID",
          c.name AS "Category Name",
          c.slug AS "Slug",
          CASE 
            WHEN c.parent_id IS NULL THEN 'Main Category'
            ELSE 'Subcategory'
          END AS "Level",
          c.depth AS "Depth",
          c.parent_id AS "Parent Category ID",
          p.name AS "Parent Category Name",
          c.category_type AS "Category Type",
          bc.name AS "Mapped Business Sector",
          bsc.name AS "Mapped Business Subcategory",
          CASE WHEN c.is_active THEN 'Active' ELSE 'Inactive' END AS "Status",
          c.display_order AS "Display Order",
          c.description AS "Description",
          array_to_string(c.synonyms, ', ') AS "Synonyms",
          array_to_string(c.countries, ', ') AS "Countries",
          c.icon_url AS "Icon URL",
          c.image_url AS "Image URL",
          c.created_at AS "Created At"
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id
        LEFT JOIN categories bc ON bc.id = COALESCE(c.business_category_id, p.business_category_id)
        LEFT JOIN categories bsc ON bsc.id = COALESCE(c.business_subcategory_id, p.business_subcategory_id)
        WHERE c.is_deleted = FALSE AND (${config.whereSql})
        ORDER BY 
          CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
          c.display_order ASC,
          c.name ASC;
      `);

      const ws = xlsx.utils.json_to_sheet(res.rows);
      ws["!cols"] = colWidths;
      xlsx.utils.book_append_sheet(masterWorkbook, ws, config.title.replace(" Categories", "").slice(0, 31));
    }

    const buf = xlsx.write(masterWorkbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="All_Categories_Master.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("[Categories Export GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to export categories" }, { status: 500 });
  }
}
