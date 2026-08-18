import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  listRecycleBin,
  permanentlyDeleteRecycleBinRecord,
  restoreRecycleBinRecord,
} from "@/lib/recycle-bin/service";

function positiveInteger(value: string | null, fallback: number, maximum = 100) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

function recordId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("A valid recycle bin record is required");
  }
  return parsed;
}

function resourceKey(value: unknown) {
  const parsed = String(value ?? "").trim();
  if (!parsed) throw new Error("A recycle bin record type is required");
  return parsed;
}

function requestedRecords(body: Record<string, unknown>) {
  if (Array.isArray(body.records)) {
    const records = body.records.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        resourceKey: resourceKey(record.resourceKey),
        recordId: recordId(record.recordId),
      };
    });
    if (records.length === 0) throw new Error("Select at least one recycle bin record");
    if (records.length > 100) throw new Error("Bulk actions are limited to 100 records");
    return records;
  }

  return [{
    resourceKey: resourceKey(body.resourceKey),
    recordId: recordId(body.recordId),
  }];
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Recycle bin request failed";
  const status =
    message === "Forbidden: Admin access required" ||
    message.startsWith("Only Super Admin") ||
    message.includes("outside your permission scope")
      ? 403
      : message === "Unauthorized" || message === "User not found"
        ? 401
        : message.includes("not found") || message.includes("no longer available")
          ? 404
          : message.includes("constraint") || message.includes("still referenced")
            ? 409
            : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    const url = new URL(req.url);
    const page = positiveInteger(url.searchParams.get("page"), 1, 100_000);
    const limit = positiveInteger(url.searchParams.get("limit"), 20, 100);
    const result = await listRecycleBin(db, user, {
      page,
      limit,
      search: url.searchParams.get("search") ?? "",
      resourceType: url.searchParams.get("type") ?? "",
      deletedBy: url.searchParams.get("deletedBy") ?? "",
      deletedFrom: url.searchParams.get("deletedFrom") ?? "",
      deletedTo: url.searchParams.get("deletedTo") ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json() as Record<string, unknown>;
    const records = requestedRecords(body);
    const restored = [];
    for (const record of records) {
      restored.push(await restoreRecycleBinRecord(
        db,
        user,
        record.resourceKey,
        record.recordId
      ));
    }
    return NextResponse.json({ data: restored, count: restored.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json() as Record<string, unknown>;
    if (body.confirmation !== "PERMANENTLY DELETE") {
      return NextResponse.json(
        { error: 'Type "PERMANENTLY DELETE" to confirm irreversible deletion' },
        { status: 422 }
      );
    }
    const records = requestedRecords(body);
    const deleted = [];
    for (const record of records) {
      deleted.push(await permanentlyDeleteRecycleBinRecord(
        db,
        user,
        record.resourceKey,
        record.recordId
      ));
    }
    return NextResponse.json({ data: deleted, count: deleted.length });
  } catch (error) {
    return errorResponse(error);
  }
}
