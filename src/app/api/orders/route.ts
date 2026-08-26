import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrder, getCustomerOrder, getCustomerOrders, validateOrderLimits } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const body = await request.json() as { items?: unknown[]; totalAmount?: number; fulfillmentType?: "pickup" | "delivery"; orderNumber?: string; vendorId?: string };
  if (!Array.isArray(body.items) || typeof body.totalAmount !== "number") {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }

  const limitError = validateOrderLimits(body.items);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 409 });

  const orderId = createOrder(user.id, body.items, body.totalAmount, body.fulfillmentType === "pickup" ? "pickup" : "delivery", body.orderNumber, body.vendorId);
  return NextResponse.json({ orderId }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const orderId = new URL(request.url).searchParams.get("id");
  if (!orderId) return NextResponse.json({ orders: getCustomerOrders(user.id) });
  const order = getCustomerOrder(orderId.replace(/^#/, ""), user.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}