import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
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

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    const requestedInstId = searchParams.get("institutionId");

    let institutionId: number | null = null;
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      institutionId = activeInst ? Number(activeInst) : null;
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
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (existing.institution_id && existing.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
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
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (existing.institution_id && existing.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
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
