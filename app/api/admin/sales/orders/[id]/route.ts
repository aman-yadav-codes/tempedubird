import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import { getSalesOrderById } from "@/lib/queries/orders";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(req);
    const { id: idParam } = await params;
    const id = Number(idParam);

    if (!id || !Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid Order ID" }, { status: 400 });
    }

    const order = await getSalesOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (order.institution_id && order.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load order details";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
