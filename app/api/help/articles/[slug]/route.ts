import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getOptionalAuthenticatedUser } from "@/lib/auth/optional-auth";
import { db } from "@/lib/db/db";
import {
  canManageHelpCenter,
  deleteHelpArticle,
  getHelpArticleBySlug,
  logHelpArticleView,
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

type ArticleRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: Request, context: ArticleRouteContext) {
  const user = await getOptionalAuthenticatedUser(req);
  const { slug } = await context.params;
  const article = await getHelpArticleBySlug(db, slug, user, canManageHelpCenter(user));

  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  await logHelpArticleView(db, article.id, user?.id ?? null).catch(() => null);
  return NextResponse.json({ data: article });
}

export async function PUT(req: Request, context: ArticleRouteContext) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const { slug } = await context.params;
    const id = Number(slug);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid article id." }, { status: 400 });
    }

    const input = helpArticleSchema.parse(await req.json());
    const article = await saveHelpArticle(db, input, user.id, id);
    return NextResponse.json({ data: article });
  } catch (error: unknown) {
    const status = getErrorCode(error) === "23505" ? 409 : 400;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

export async function DELETE(req: Request, context: ArticleRouteContext) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const { slug } = await context.params;
    const id = Number(slug);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid article id." }, { status: 400 });
    }

    await deleteHelpArticle(db, id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
