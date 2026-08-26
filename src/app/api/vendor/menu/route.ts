import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addMenuItem, deleteMenuItem, getAllMenu, setMenuAvailability, updateMenuItem } from "@/lib/db";

async function requireVendor() {
  const user = await getCurrentUser();
  return user?.role === "vendor" ? user : null;
}

export async function GET() {
  if (!await requireVendor()) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  return NextResponse.json({ menu: getAllMenu() });
}

export async function POST(request: Request) {
  const vendor = await requireVendor();
  if (!vendor) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  const body = await request.json() as { name?: string; description?: string; price?: number; category?: string; image_url?: string; maxPerCustomer?: number; maxPerDay?: number };
  const maxPerCustomer = body.maxPerCustomer;
  const maxPerDay = body.maxPerDay;
  if (!body.name || !body.category || typeof body.price !== "number" || typeof maxPerCustomer !== "number" || !Number.isInteger(maxPerCustomer) || maxPerCustomer < 1 || typeof maxPerDay !== "number" || !Number.isInteger(maxPerDay) || maxPerDay < 1) return NextResponse.json({ error: "Name, category, price, and valid purchase limits are required." }, { status: 400 });
  return NextResponse.json({ item: addMenuItem(body.name, body.description ?? "", body.price, body.category, body.image_url ?? "", maxPerCustomer, maxPerDay, vendor.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await requireVendor()) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  const body = await request.json() as { id?: number; action?: "availability" | "edit"; name?: string; description?: string; price?: number; category?: string; image_url?: string; isAvailable?: boolean; maxPerCustomer?: number; maxPerDay?: number };
  const maxPerCustomer = body.maxPerCustomer;
  const maxPerDay = body.maxPerDay;
  if (typeof body.id !== "number") return NextResponse.json({ error: "Menu item id is required." }, { status: 400 });
  if (body.action === "availability") setMenuAvailability(body.id, Boolean(body.isAvailable));
  else if (typeof maxPerCustomer !== "number" || !Number.isInteger(maxPerCustomer) || maxPerCustomer < 1 || typeof maxPerDay !== "number" || !Number.isInteger(maxPerDay) || maxPerDay < 1) return NextResponse.json({ error: "Valid purchase limits are required." }, { status: 400 });
  else updateMenuItem(body.id, body.name ?? "", body.description ?? "", body.price ?? 0, body.category ?? "", body.image_url ?? "", maxPerCustomer, maxPerDay);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!await requireVendor()) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
  const body = await request.json() as { id?: number };
  if (typeof body.id !== "number") return NextResponse.json({ error: "Menu item id is required." }, { status: 400 });
  deleteMenuItem(body.id);
  return NextResponse.json({ ok: true });
}
