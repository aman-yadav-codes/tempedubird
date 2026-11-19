import { NextResponse } from "next/server";
import { db, getDatabaseHealth } from "@/lib/db/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkLive = searchParams.get("live") === "true" || searchParams.get("ping") === "true";

  const health = getDatabaseHealth();

  let pingLatencyMs: number | null = null;
  let liveError: string | null = null;

  if (checkLive) {
    const start = Date.now();
    try {
      await db.query("SELECT 1 AS alive");
      pingLatencyMs = Date.now() - start;
    } catch (err: any) {
      liveError = err?.message || "Ping query failed";
    }
  }

  const isHealthy = health.status === "healthy" && (!checkLive || pingLatencyMs !== null);

  return NextResponse.json(
    {
      success: isHealthy,
      timestamp: new Date().toISOString(),
      database: {
        ...health,
        pingLatencyMs,
        liveError,
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
