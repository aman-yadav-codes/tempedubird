import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { requireAdmin } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
    try {
        // Verify authentication
        await requireAdmin(req);

        // Get total count
        const totalResult = await db.query(
            `SELECT COUNT(*) as count FROM designations WHERE is_deleted = false`
        );
        const total = totalResult.rows[0]?.count || 0;

        // Get active count
        const activeResult = await db.query(
            `SELECT COUNT(*) as count FROM designations WHERE is_deleted = false AND is_active = true`
        );
        const active = activeResult.rows[0]?.count || 0;

        // Get disabled count
        const disabledResult = await db.query(
            `SELECT COUNT(*) as count FROM designations WHERE is_deleted = false AND is_active = false`
        );
        const disabled = disabledResult.rows[0]?.count || 0;

        // Get deleted count
        const deletedResult = await db.query(
            `SELECT COUNT(*) as count FROM designations WHERE is_deleted = true`
        );
        const deleted = deletedResult.rows[0]?.count || 0;

        return NextResponse.json({
            data: {
                total: parseInt(total),
                active: parseInt(active),
                disabled: parseInt(disabled),
                deleted: parseInt(deleted),
            },
        });
    } catch (error) {
        console.error("Error fetching designation stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
