import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const itemType = searchParams.get("itemType"); // 'product' | 'service' | 'all'
    const countryCode = searchParams.get("countryCode"); // 'IN' | 'US' | 'all'
    const status = searchParams.get("status"); // 'active' | 'draft' | 'archived' | 'all'
    const format = searchParams.get("format"); // 'csv' | 'json'

    let query = `
      SELECT 
        csp.id,
        csp.item_type,
        csp.item_id,
        csp.country_code,
        csp.currency,
        csp.min_price,
        csp.max_price,
        csp.fixed_price,
        csp.unit,
        csp.effective_date,
        csp.status,
        csp.notes,
        COALESCE(csp.price_history, '[]'::jsonb) AS price_history,
        csp.created_at,
        csp.updated_at,
        CASE 
          WHEN csp.item_type = 'product' THEN mp.name 
          WHEN csp.item_type = 'service' THEN ms.name 
          ELSE 'Unknown Item'
        END AS item_name,
        CASE 
          WHEN csp.item_type = 'product' THEN mp.sku 
          ELSE NULL 
        END AS item_sku,
        CASE 
          WHEN csp.item_type = 'product' THEN mp.default_image_url 
          WHEN csp.item_type = 'service' THEN ms.default_image_url 
          ELSE NULL 
        END AS item_image_url
      FROM country_suggested_prices csp
      LEFT JOIN master_products mp ON mp.id = csp.item_id AND csp.item_type = 'product'
      LEFT JOIN master_services ms ON ms.id = csp.item_id AND csp.item_type = 'service'
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (itemType && itemType !== "all") {
      query += ` AND csp.item_type = $${pIdx}`;
      params.push(itemType);
      pIdx++;
    }

    if (countryCode && countryCode !== "all") {
      query += ` AND csp.country_code = $${pIdx}`;
      params.push(countryCode.toUpperCase());
      pIdx++;
    }

    if (status && status !== "all") {
      query += ` AND csp.status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    if (search) {
      query += ` AND (
        mp.name ILIKE $${pIdx} 
        OR ms.name ILIKE $${pIdx} 
        OR csp.unit ILIKE $${pIdx}
        OR csp.notes ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    query += ` ORDER BY csp.updated_at DESC LIMIT 300`;

    const { rows } = await db.query(query, params);

    // CSV Export option
    if (format === "csv") {
      const headers = [
        "id",
        "item_type",
        "item_id",
        "item_name",
        "country_code",
        "currency",
        "min_price",
        "max_price",
        "fixed_price",
        "unit",
        "effective_date",
        "status",
        "notes",
      ];
      const csvRows = [headers.join(",")];
      for (const r of rows) {
        csvRows.push([
          r.id,
          r.item_type,
          r.item_id,
          `"${(r.item_name || "").replace(/"/g, '""')}"`,
          r.country_code,
          r.currency,
          r.min_price || 0,
          r.max_price || 0,
          r.fixed_price !== null ? r.fixed_price : "",
          `"${r.unit || ""}"`,
          r.effective_date ? new Date(r.effective_date).toISOString().split("T")[0] : "",
          r.status,
          `"${(r.notes || "").replace(/"/g, '""')}"`,
        ].join(","));
      }

      return new Response(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="country_suggested_prices_${Date.now()}.csv"`,
        },
      });
    }

    // Fetch list of master products and master services for dropdown options
    const [productsRes, servicesRes] = await Promise.all([
      db.query(`SELECT id, name, sku, unit_of_measurement, suggested_price_inr, suggested_price_usd FROM master_products WHERE is_active = true ORDER BY name ASC LIMIT 200`),
      db.query(`SELECT id, name, duration_unit, suggested_price_inr, suggested_price_usd FROM master_services WHERE is_active = true ORDER BY name ASC LIMIT 200`),
    ]);

    return NextResponse.json({
      success: true,
      pricing: rows,
      products: productsRes.rows,
      services: servicesRes.rows,
    });
  } catch (error: any) {
    console.error("Failed to fetch country suggested pricing:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch pricing records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Support bulk import
    if (Array.isArray(body.records)) {
      const inserted: any[] = [];
      for (const r of body.records) {
        if (!r.item_type || !r.item_id || !r.country_code) continue;
        const currency = r.currency || (r.country_code === "US" ? "USD" : "INR");
        const ins = await db.query(
          `INSERT INTO country_suggested_prices (
             item_type, item_id, country_code, currency, min_price, max_price,
             fixed_price, unit, effective_date, status, notes, price_history, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
           )
           ON CONFLICT (item_type, item_id, country_code)
           DO UPDATE SET
             currency = EXCLUDED.currency,
             min_price = EXCLUDED.min_price,
             max_price = EXCLUDED.max_price,
             fixed_price = EXCLUDED.fixed_price,
             unit = EXCLUDED.unit,
             effective_date = EXCLUDED.effective_date,
             status = EXCLUDED.status,
             notes = EXCLUDED.notes,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [
            r.item_type,
            Number(r.item_id),
            r.country_code.toUpperCase(),
            currency,
            Number(r.min_price || 0),
            Number(r.max_price || 0),
            r.fixed_price !== undefined && r.fixed_price !== null && r.fixed_price !== "" ? Number(r.fixed_price) : null,
            r.unit || "Unit",
            r.effective_date || new Date().toISOString().split("T")[0],
            r.status || "active",
            r.notes?.trim() || null,
          ]
        );
        inserted.push(ins.rows[0].id);
      }
      return NextResponse.json({ success: true, count: inserted.length, ids: inserted });
    }

    const {
      item_type,
      item_id,
      country_code,
      currency,
      min_price,
      max_price,
      fixed_price,
      unit,
      effective_date,
      status,
      notes,
    } = body;

    if (!item_type || !["product", "service"].includes(item_type)) {
      return NextResponse.json({ error: "item_type must be 'product' or 'service'" }, { status: 400 });
    }
    if (!item_id || isNaN(Number(item_id))) {
      return NextResponse.json({ error: "Valid item_id is required" }, { status: 400 });
    }
    if (!country_code?.trim()) {
      return NextResponse.json({ error: "country_code is required" }, { status: 400 });
    }

    const cCode = country_code.trim().toUpperCase();
    const effectiveCurrency = currency?.trim() || (cCode === "US" ? "USD" : "INR");
    const minP = Number(min_price || 0);
    const maxP = Number(max_price || 0);
    const fixedP = fixed_price !== undefined && fixed_price !== null && fixed_price !== "" ? Number(fixed_price) : null;

    const initialHistory = [
      {
        action: "created",
        by: user.id,
        date: new Date().toISOString(),
        min_price: minP,
        max_price: maxP,
        fixed_price: fixedP,
        effective_date: effective_date || new Date().toISOString().split("T")[0],
      },
    ];

    const result = await db.query(
      `
      INSERT INTO country_suggested_prices (
        item_type,
        item_id,
        country_code,
        currency,
        min_price,
        max_price,
        fixed_price,
        unit,
        effective_date,
        status,
        notes,
        price_history,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (item_type, item_id, country_code)
      DO UPDATE SET
        currency = EXCLUDED.currency,
        min_price = EXCLUDED.min_price,
        max_price = EXCLUDED.max_price,
        fixed_price = EXCLUDED.fixed_price,
        unit = EXCLUDED.unit,
        effective_date = EXCLUDED.effective_date,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        price_history = country_suggested_prices.price_history || $12::jsonb,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `,
      [
        item_type,
        Number(item_id),
        cCode,
        effectiveCurrency,
        minP,
        maxP,
        fixedP,
        (unit || "Unit").trim(),
        effective_date || new Date().toISOString().split("T")[0],
        status || "active",
        notes?.trim() || null,
        JSON.stringify(initialHistory),
      ]
    );

    return NextResponse.json({ success: true, record: result.rows[0] });
  } catch (error: any) {
    console.error("Failed to create country suggested price:", error);
    return NextResponse.json({ error: error.message || "Failed to create pricing record" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      min_price,
      max_price,
      fixed_price,
      unit,
      effective_date,
      status,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    // Retrieve previous price for history logging
    const prevRes = await db.query(`SELECT * FROM country_suggested_prices WHERE id = $1`, [Number(id)]);
    const prev = prevRes.rows[0];
    if (!prev) {
      return NextResponse.json({ error: "Pricing record not found" }, { status: 404 });
    }

    const historyEntry = {
      action: "updated",
      by: user.id,
      date: new Date().toISOString(),
      previous: {
        min_price: prev.min_price,
        max_price: prev.max_price,
        fixed_price: prev.fixed_price,
        effective_date: prev.effective_date,
        status: prev.status,
      },
      updated: {
        min_price: min_price !== undefined ? Number(min_price) : prev.min_price,
        max_price: max_price !== undefined ? Number(max_price) : prev.max_price,
        fixed_price: fixed_price !== undefined ? (fixed_price !== null && fixed_price !== "" ? Number(fixed_price) : null) : prev.fixed_price,
      },
    };

    const existingHistory = Array.isArray(prev.price_history) ? prev.price_history : [];
    existingHistory.unshift(historyEntry);

    const result = await db.query(
      `
      UPDATE country_suggested_prices
      SET
        min_price = COALESCE($1, min_price),
        max_price = COALESCE($2, max_price),
        fixed_price = CASE WHEN $3::text IS NOT NULL THEN $3::numeric ELSE fixed_price END,
        unit = COALESCE($4, unit),
        effective_date = COALESCE($5, effective_date),
        status = COALESCE($6, status),
        notes = COALESCE($7, notes),
        price_history = $8::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `,
      [
        min_price !== undefined ? Number(min_price) : null,
        max_price !== undefined ? Number(max_price) : null,
        fixed_price !== undefined ? (fixed_price !== null && fixed_price !== "" ? Number(fixed_price) : null) : null,
        unit !== undefined ? unit.trim() : null,
        effective_date !== undefined ? effective_date : null,
        status !== undefined ? status : null,
        notes !== undefined ? notes.trim() : null,
        JSON.stringify(existingHistory),
        Number(id),
      ]
    );

    return NextResponse.json({ success: true, record: result.rows[0] });
  } catch (error: any) {
    console.error("Failed to update country suggested price:", error);
    return NextResponse.json({ error: error.message || "Failed to update pricing record" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, ids, percentage, countryCode, newStatus } = body;

    if (action === "percentage_adjust") {
      const factor = 1 + Number(percentage || 0) / 100;
      if (isNaN(factor) || factor <= 0) {
        return NextResponse.json({ error: "Invalid percentage adjustment factor" }, { status: 400 });
      }

      let q = `
        UPDATE country_suggested_prices
        SET
          min_price = ROUND(min_price * $1, 2),
          max_price = ROUND(max_price * $1, 2),
          fixed_price = CASE WHEN fixed_price IS NOT NULL THEN ROUND(fixed_price * $1, 2) ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
        WHERE 1=1
      `;
      const p: any[] = [factor];
      if (countryCode && countryCode !== "all") {
        p.push(countryCode.toUpperCase());
        q += ` AND country_code = $${p.length}`;
      }
      if (Array.isArray(ids) && ids.length > 0) {
        p.push(ids);
        q += ` AND id = ANY($${p.length})`;
      }

      await db.query(q, p);
      return NextResponse.json({ success: true, message: `Prices adjusted by ${percentage}% successfully` });
    }

    if (action === "status_update" && Array.isArray(ids) && newStatus) {
      await db.query(
        `UPDATE country_suggested_prices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)`,
        [newStatus, ids]
      );
      return NextResponse.json({ success: true, message: `Status updated to ${newStatus}` });
    }

    return NextResponse.json({ error: "Unsupported bulk action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to perform bulk pricing update:", error);
    return NextResponse.json({ error: error.message || "Failed to perform bulk update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM country_suggested_prices WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true, message: "Suggested pricing record deleted" });
  } catch (error: any) {
    console.error("Failed to delete suggested pricing record:", error);
    return NextResponse.json({ error: error.message || "Failed to delete record" }, { status: 500 });
  }
}

