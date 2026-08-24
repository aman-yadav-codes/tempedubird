import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getCertificationProviderById,
  updateCertificationProvider,
  softDeleteCertificationProvider,
  toggleCertificationProviderActive,
} from "@/lib/queries/certification-providers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const providerId = Number(id);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const provider = await getCertificationProviderById(db, providerId);
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    return NextResponse.json({ data: provider });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const providerId = Number(id);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();

    if (typeof body.isActive === "boolean") {
      await toggleCertificationProviderActive(db, providerId, body.isActive);
    }

    const updated = await updateCertificationProvider(db, providerId, {
      name: body.name,
      slug: body.slug,
      provider_type: body.provider_type,
      code: body.code,
      website_url: body.website_url,
      logo_url: body.logo_url,
      description: body.description,
      is_active: body.is_active ?? body.isActive,
    });

    if (!updated) {
      return NextResponse.json({ error: "Provider not found or deleted" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "A certification or affiliation provider with that slug already exists" },
        { status: 409 }
      );
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const providerId = Number(id);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await softDeleteCertificationProvider(db, providerId, currentUser.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
