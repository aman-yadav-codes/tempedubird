import { NextResponse } from "next/server";
import { isTransientDbError, DbTimeoutError } from "@/lib/db/db";

export function handleDatabaseApiError(error: unknown, fallbackMessage = "Internal Server Error") {
  const isDbDown =
    error instanceof DbTimeoutError ||
    (error as any)?.name === "DbTimeoutError" ||
    (error as any)?.code === "ETIMEDOUT" ||
    (error as any)?.code === "ECONNREFUSED" ||
    isTransientDbError(error);

  if (isDbDown) {
    return NextResponse.json(
      {
        error: "Database service is temporarily unavailable. Please try again shortly.",
        code: "DB_UNAVAILABLE",
      },
      {
        status: 503,
        headers: {
          "Retry-After": "15",
          "Cache-Control": "no-store, no-cache",
        },
      }
    );
  }

  const rawMessage = error instanceof Error ? error.message : fallbackMessage;
  // Clean any accidental SQL leaks from error message
  const sanitizedMessage = rawMessage.replace(/\[SELECT .*?\]/i, "").trim() || fallbackMessage;

  return NextResponse.json(
    {
      error: sanitizedMessage,
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
