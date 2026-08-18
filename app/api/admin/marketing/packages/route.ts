import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import {
  createMarketingPackage,
  deleteMarketingPackage,
  listMarketingPackages,
  listProgramCourseFees,
  updateMarketingPackage,
  updateProgramCourseFee,
} from "@/lib/queries/marketing-packages";

export async function GET(req: Request) {
  try {
    const adminUser = await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const rawInstId = searchParams.get("institutionId") || req.headers.get("x-institution-id");
    const institutionId = rawInstId ? parseInt(rawInstId, 10) : null;
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const offset = (page - 1) * limit;
    const isPlatformAdmin = Boolean(isPlatformFullAccess(adminUser) || adminUser?.role_codes?.includes("platform_admin"));

    const programFees = await listProgramCourseFees({
      institutionId: Number.isInteger(institutionId) && institutionId! > 0 ? institutionId : undefined,
      userId: !isPlatformAdmin ? adminUser.id : undefined,
      search,
    });

    const result = await listMarketingPackages({
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      packages: result.packages,
      programFees,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching admin marketing packages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const { name, packageFor, packageForTypes, price, priceUnit, storageLimitGb, validityCount, validityUnit, description, isActive } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 });
    }

    const created = await createMarketingPackage({
      name: name.trim(),
      packageFor: packageFor || "Institute",
      packageForTypes: Array.isArray(packageForTypes) ? packageForTypes : [],
      price: typeof price === "number" ? price : parseFloat(price) || 0,
      priceUnit: priceUnit || "month",
      storageLimitGb: storageLimitGb ? parseFloat(storageLimitGb) : null,
      validityCount: parseInt(validityCount, 10) || 1,
      validityUnit: validityUnit || "month",
      description: description || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return NextResponse.json({
      success: true,
      package: created,
    });
  } catch (error) {
    console.error("Error creating marketing package:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    if (body.isProgramFee) {
      const programId = parseInt(body.programId, 10);
      const feeAmount = parseFloat(body.feeAmount) || 0;
      const feeUnit = body.feeUnit || "year";
      const admissionFee = parseFloat(body.admissionFee) || 0;

      const ok = await updateProgramCourseFee(programId, feeAmount, feeUnit, admissionFee);
      return NextResponse.json({ success: ok });
    }

    const { id, name, packageFor, packageForTypes, price, priceUnit, storageLimitGb, validityCount, validityUnit, description, isActive } = body;

    const pkgId = parseInt(id, 10);
    if (isNaN(pkgId) || pkgId <= 0) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    const updated = await updateMarketingPackage(pkgId, {
      name: name ? name.trim() : undefined,
      packageFor: packageFor || undefined,
      packageForTypes: Array.isArray(packageForTypes) ? packageForTypes : undefined,
      price: price !== undefined ? (typeof price === "number" ? price : parseFloat(price) || 0) : undefined,
      priceUnit: priceUnit || undefined,
      storageLimitGb: storageLimitGb !== undefined ? (storageLimitGb ? parseFloat(storageLimitGb) : null) : undefined,
      validityCount: validityCount ? parseInt(validityCount, 10) : undefined,
      validityUnit: validityUnit || undefined,
      description: description !== undefined ? description : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      package: updated,
    });
  } catch (error) {
    console.error("Error updating marketing package:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "0", 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    const ok = await deleteMarketingPackage(id);
    if (!ok) {
      return NextResponse.json({ error: "Package not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting marketing package:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
