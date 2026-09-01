import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createUnifiedFinanceCategory,
  deleteUnifiedFinanceCategory,
  listUnifiedFinanceCategories,
  type FinanceScope,
} from "@/lib/queries/finance";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

function jsonError(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Something went wrong" },
    { status }
  );
}

function userInstitutionIds(user: CurrentUser) {
  return new Set(
    (user.memberships ?? [])
      .filter((membership) =>
        [
          "institution_admin",
          "professional_organization",
          "school_owner",
          "college_owner",
          "university_owner",
          "library_owner",
          "pg_owner",
        ].includes(membership.role_code)
      )
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, institutionId: number | null): { scope: FinanceScope; institutionId: number | null } {
  if (isPlatformAdminUser(user)) {
    if (institutionId) {
      return { scope: "institution", institutionId };
    }
    return { scope: "platform", institutionId: null };
  }

  if (!isInstitutionAdminUser(user)) {
    throw new Error("Forbidden: Admin access required");
  }

  const institutionIds = userInstitutionIds(user);
  const targetId = institutionId ?? Array.from(institutionIds)[0] ?? null;
  if (!targetId || !institutionIds.has(targetId)) {
    throw new Error("Forbidden: Institution access required");
  }

  return { scope: "institution", institutionId: targetId };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const searchParams = req.nextUrl.searchParams;
    const instParam = searchParams.get("institutionId");
    const rawInstitutionId = instParam ? Number(instParam) : null;
    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && (rawInstitutionId ?? 0) > 0 ? rawInstitutionId : null
    );

    const data = await listUnifiedFinanceCategories(db, {
      scope_type: scope,
      institution_id: institutionId,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const rawInstitutionId = body.institutionId ? Number(body.institutionId) : null;
    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && (rawInstitutionId ?? 0) > 0 ? rawInstitutionId : null
    );

    const name = String(body.name || "").trim();
    if (!name) {
      return jsonError("Category name is required", 400);
    }

    const targets = Array.isArray(body.targets)
      ? (body.targets.filter((t: string) => ["income", "expense", "recurring"].includes(t)) as ("income" | "expense" | "recurring")[])
      : [];

    if (targets.length === 0) {
      return jsonError("Select at least one page for this category (Income, Expense, or Recurring Expenses)", 400);
    }

    await createUnifiedFinanceCategory(db, {
      scope_type: scope,
      institution_id: institutionId,
      name,
      targets,
      user_id: user.id,
    });

    const data = await listUnifiedFinanceCategories(db, {
      scope_type: scope,
      institution_id: institutionId,
    });

    return NextResponse.json({ success: true, message: "Finance category created successfully", data });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const searchParams = req.nextUrl.searchParams;
    const name = searchParams.get("name")?.trim();
    if (!name) {
      return jsonError("Category name is required", 400);
    }

    const instParam = searchParams.get("institutionId");
    const rawInstitutionId = instParam ? Number(instParam) : null;
    const { scope, institutionId } = resolveScope(
      user,
      Number.isInteger(rawInstitutionId) && (rawInstitutionId ?? 0) > 0 ? rawInstitutionId : null
    );

    await deleteUnifiedFinanceCategory(db, {
      scope_type: scope,
      institution_id: institutionId,
      name,
    });

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    return jsonError(error, 400);
  }
}
