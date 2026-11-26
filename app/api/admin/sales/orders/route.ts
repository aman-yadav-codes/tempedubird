import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser, isPlatformFullAccess } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrderById,
  getSalesOrdersList,
  updateSalesOrderStatus,
} from "@/lib/queries/orders";

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    const { searchParams } = new URL(req.url);

    const isPlatform = isPlatformAdminUser(user) || isPlatformFullAccess(user);
    const requestedInstId = searchParams.get("institutionId");

    let institutionId: number | null = null;
    let sellerBusinessIds: number[] = [];
    let sellerProfessionalIds: number[] = [];
    let institutionIds: number[] = [];

    if (!isPlatform) {
      const [bpRes, ppRes, instRes] = await Promise.all([
        db.query(`SELECT id FROM business_profiles WHERE user_id = $1`, [user.id]).catch(() => ({ rows: [] })),
        db.query(`SELECT id FROM professional_profiles WHERE user_id = $1`, [user.id]).catch(() => ({ rows: [] })),
        db.query(`SELECT institution_id FROM institution_memberships WHERE user_id = $1 UNION SELECT id FROM institution_profiles WHERE user_id = $1`, [user.id]).catch(() => ({ rows: [] })),
      ]);
      sellerBusinessIds = bpRes.rows.map((r: any) => Number(r.id)).filter(Boolean);
      sellerProfessionalIds = ppRes.rows.map((r: any) => Number(r.id)).filter(Boolean);
      const instIdsFromUser = (user.memberships || []).map((m: any) => Number(m.institution_id)).filter(Boolean);
      institutionIds = Array.from(new Set([...instRes.rows.map((r: any) => Number(r.institution_id || r.id)).filter(Boolean), ...instIdsFromUser]));
    } else if (requestedInstId && requestedInstId !== "all") {
      institutionId = Number(requestedInstId);
    }

    const search = searchParams.get("search") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const fulfillmentStatus = searchParams.get("fulfillmentStatus") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");

    const result = await getSalesOrdersList({
      search,
      paymentStatus,
      fulfillmentStatus,
      institutionId,
      institutionIds: !isPlatform && institutionIds.length > 0 ? institutionIds : undefined,
      sellerOrCustomerUserId: !isPlatform ? user.id : undefined,
      sellerBusinessIds: !isPlatform && sellerBusinessIds.length > 0 ? sellerBusinessIds : undefined,
      sellerProfessionalIds: !isPlatform && sellerProfessionalIds.length > 0 ? sellerProfessionalIds : undefined,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load orders";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    let institutionId = body.institution_id ? Number(body.institution_id) : null;

    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      institutionId = activeInst ? Number(activeInst) : null;
    }

    if (!body.customer_name || !body.customer_name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    if (!body.customer_email || !body.customer_email.trim()) {
      return NextResponse.json({ error: "Customer email is required" }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "At least one product item is required" }, { status: 400 });
    }

    const newOrder = await createSalesOrder({
      institution_id: institutionId,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      subtotal_amount: Number(body.subtotal_amount) || 0,
      discount_amount: Number(body.discount_amount) || 0,
      tax_amount: Number(body.tax_amount) || 0,
      total_amount: Number(body.total_amount) || 0,
      payment_status: body.payment_status || "Paid",
      payment_method: body.payment_method || "Online (UPI / Card)",
      fulfillment_status: body.fulfillment_status || "Delivered",
      shipping_address: body.shipping_address,
      notes: body.notes,
      created_by: user.id,
      items: body.items.map((i: any) => ({
        product_name: i.product_name || "Product Item",
        product_code: i.product_code || null,
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.unit_price) || 0,
        total_price: (Number(i.quantity) || 1) * (Number(i.unit_price) || 0),
      })),
    });

    return NextResponse.json({ success: true, data: newOrder });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();

    const id = Number(body.id);
    if (!id || !Number.isInteger(id)) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const existing = await getSalesOrderById(id);
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const isOwnerOrSeller = Boolean(
        user.id === existing.seller_user_id ||
        user.id === existing.created_by ||
        user.role_codes?.includes("business_owner") ||
        user.role_codes?.includes("professional") ||
        user.memberships?.some(
          (m) =>
            (m.institution_id && m.institution_id === existing.institution_id) ||
            m.role_code === "business_owner" ||
            m.role_code === "professional"
        )
      );
      if (!isOwnerOrSeller) {
        const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
        if (existing.institution_id && existing.institution_id !== activeInst) {
          return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
        }
      }
    }

    const updated = await updateSalesOrderStatus(id, {
      payment_status: body.payment_status,
      fulfillment_status: body.fulfillment_status,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update order";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || !Number.isInteger(id)) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const existing = await getSalesOrderById(id);
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const isOwnerOrSeller = Boolean(
        user.id === existing.seller_user_id ||
        user.id === existing.created_by ||
        user.role_codes?.includes("business_owner") ||
        user.role_codes?.includes("professional") ||
        user.memberships?.some(
          (m) =>
            (m.institution_id && m.institution_id === existing.institution_id) ||
            m.role_code === "business_owner" ||
            m.role_code === "professional"
        )
      );
      if (!isOwnerOrSeller) {
        const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
        if (existing.institution_id && existing.institution_id !== activeInst) {
          return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
        }
      }
    }

    await deleteSalesOrder(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete order";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
