import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

let schemaChecked = false;
async function ensureFavoritesSchema() {
  if (schemaChecked) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(120) NOT NULL,
        title VARCHAR(255),
        subtitle VARCHAR(255),
        image_url TEXT,
        target_url TEXT,
        badge VARCHAR(100),
        price VARCHAR(50),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_favorites_entity UNIQUE (user_id, entity_type, entity_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites (user_id);
      CREATE INDEX IF NOT EXISTS idx_user_favorites_type ON user_favorites (user_id, entity_type);
    `);
    schemaChecked = true;
  } catch (e) {
    console.error("Failed to ensure user_favorites schema:", e);
  }
}

export async function GET(req: Request) {
  try {
    await ensureFavoritesSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: true, data: [], authenticated: false });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("type");

    let query = `
      SELECT id, user_id, entity_type, entity_id, title, subtitle, image_url, target_url, badge, price, metadata, created_at
      FROM user_favorites
      WHERE user_id = $1
    `;
    const params: any[] = [user.id];

    if (entityType && entityType !== "all") {
      params.push(entityType.toLowerCase());
      query += ` AND LOWER(entity_type) = $2`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      authenticated: true,
    });
  } catch (err: any) {
    console.error("GET /api/favorites error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFavoritesSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please login to save favorites." }, { status: 401 });
    }

    const body = await req.json();
    const {
      entity_type,
      entity_id,
      title,
      subtitle,
      image_url,
      target_url,
      badge,
      price,
      metadata = {},
      action, // 'toggle' | 'add'
    } = body;

    if (!entity_type || !entity_id) {
      return NextResponse.json({ error: "entity_type and entity_id are required" }, { status: 400 });
    }

    const normalizedType = String(entity_type).toLowerCase().trim();
    const normalizedId = String(entity_id).trim();

    // Check if exists
    const existing = await db.query(
      `SELECT id FROM user_favorites WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3 LIMIT 1`,
      [user.id, normalizedType, normalizedId]
    );

    if (action === "toggle" && existing.rows.length > 0) {
      // Remove
      await db.query(`DELETE FROM user_favorites WHERE id = $1`, [existing.rows[0].id]);
      return NextResponse.json({
        success: true,
        favorited: false,
        message: "Removed from favorites",
      });
    }

    // Insert or update
    const result = await db.query(
      `
      INSERT INTO user_favorites (
        user_id, entity_type, entity_id, title, subtitle, image_url, target_url, badge, price, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, entity_type, entity_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        image_url = EXCLUDED.image_url,
        target_url = EXCLUDED.target_url,
        badge = EXCLUDED.badge,
        price = EXCLUDED.price,
        metadata = EXCLUDED.metadata
      RETURNING *
      `,
      [
        user.id,
        normalizedType,
        normalizedId,
        title || null,
        subtitle || null,
        image_url || null,
        target_url || null,
        badge || null,
        price || null,
        JSON.stringify(metadata || {}),
      ]
    );

    return NextResponse.json({
      success: true,
      favorited: true,
      data: result.rows[0],
      message: "Added to favorites",
    });
  } catch (err: any) {
    console.error("POST /api/favorites error:", err);
    return NextResponse.json({ error: err.message || "Failed to update favorite" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFavoritesSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const entityType = searchParams.get("type") || searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    if (id) {
      await db.query(`DELETE FROM user_favorites WHERE id = $1 AND user_id = $2`, [id, user.id]);
    } else if (entityType && entityId) {
      await db.query(
        `DELETE FROM user_favorites WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3`,
        [user.id, entityType.toLowerCase().trim(), String(entityId).trim()]
      );
    } else {
      return NextResponse.json({ error: "Missing identifier for favorite deletion" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Removed from favorites" });
  } catch (err: any) {
    console.error("DELETE /api/favorites error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete favorite" }, { status: 500 });
  }
}
