import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getOptionalAuthenticatedUser } from "@/lib/auth/optional-auth";
import { db } from "@/lib/db/db";
import {
  canManageHelpCenter,
  listHelpArticles,
  saveHelpArticle,
} from "@/lib/queries/help-center";
import { helpArticleSchema } from "@/lib/validations/help-center.schema";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}

export async function GET(req: Request) {
  const user = await getOptionalAuthenticatedUser(req);
  const url = new URL(req.url);
  const includeDrafts = url.searchParams.get("admin") === "1" && canManageHelpCenter(user);
  const articles = await listHelpArticles(db, {
    user,
    includeDrafts,
    search: url.searchParams.get("search") ?? "",
    categorySlug: url.searchParams.get("category") ?? "",
    limit: Math.min(Number(url.searchParams.get("limit")) || 100, 200),
  });
  return NextResponse.json({ data: articles });
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const input = helpArticleSchema.parse(await req.json());
    const article = await saveHelpArticle(db, input, user.id);
    return NextResponse.json({ data: article }, { status: 201 });
  } catch (error: unknown) {
    const status = getErrorCode(error) === "23505" ? 409 : 400;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
