import { NextResponse } from "next/server";
import { getCurrentUser, setSession, updateUserAddress, updateVendorProfile } from "@/lib/auth";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  const body = await request.json() as { address?: string; pickup?: boolean; name?: string; email?: string; phone?: string; shopName?: string };
  const address = body.address?.trim() ?? "";

  if (!currentUser) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  if (currentUser.role === "vendor" && body.name !== undefined) {
    if (!body.name.trim() || !body.shopName?.trim()) return NextResponse.json({ error: "Name and restaurant name are required." }, { status: 400 });
    const user = updateVendorProfile(currentUser.id, body.name, body.email ?? "", body.phone ?? "", body.shopName);
    const response = NextResponse.json({ user });
    response.cookies.set({ ...setSession(user), httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return response;
  }
  if (!body.pickup && address.length < 5) return NextResponse.json({ error: "Please provide a complete delivery address." }, { status: 400 });

  const updated = updateUserAddress(currentUser.id, body.pickup ? null : address, Boolean(body.pickup));
  let addresses: string[] = [];
  try {
    addresses = updated.addresses_json ? JSON.parse(updated.addresses_json) as string[] : [];
  } catch {
    addresses = [];
  }
  const user = { ...updated, addresses, pickupSelected: Boolean(updated.pickup_selected), restaurantOpen: Boolean(updated.restaurant_open) };
  delete (user as { addresses_json?: string | null }).addresses_json;
  delete (user as { pickup_selected?: number }).pickup_selected;
  const response = NextResponse.json({ user });
  response.cookies.set({ ...setSession(user), httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}