import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  canManageHelpCenter,
  deleteHelpCategory,
  updateHelpCategory,
} from "@/lib/queries/help-center";
import { helpCategorySchema } from "@/lib/validations/help-center.schema";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}

type CategoryRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, context: CategoryRouteContext) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const { id } = await context.params;
    const categoryId = Number(id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: "Invalid category id." }, { status: 400 });
    }

    const input = helpCategorySchema.parse(await req.json());
    const category = await updateHelpCategory(db, categoryId, input, user.id);
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    return NextResponse.json({ data: category });
  } catch (error: unknown) {
    const status = getErrorCode(error) === "23505" ? 409 : 400;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

export async function DELETE(req: Request, context: CategoryRouteContext) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const { id } = await context.params;
    const categoryId = Number(id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: "Invalid category id." }, { status: 400 });
    }

    await deleteHelpCategory(db, categoryId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
