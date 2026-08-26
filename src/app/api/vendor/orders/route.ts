import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { advanceOrderStatus, confirmOrderPayment, getVendorOrders, setRestaurantStatus, type OrderStatus } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "vendor") return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  return NextResponse.json({ orders: getVendorOrders(user.id), restaurantOpen: user.restaurantOpen });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "vendor") return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  const body = await request.json() as { orderId?: string; isOpen?: boolean; nextStatus?: OrderStatus };
  if (typeof body.isOpen === "boolean") {
    setRestaurantStatus(user.id, body.isOpen);
    return NextResponse.json({ ok: true, restaurantOpen: body.isOpen });
  }
  if (body.orderId && body.nextStatus) {
    const result = advanceOrderStatus(body.orderId, body.nextStatus);
    return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 409 });
  }
  if (!body.orderId || !confirmOrderPayment(body.orderId)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}