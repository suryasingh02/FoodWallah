import { NextResponse } from "next/server";
import { createUser, setSession, type UserRole } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; password?: string; role?: UserRole; email?: string; address?: string; phone?: string; shopName?: string };
  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const role = body.role === "vendor" ? "vendor" : "customer";

  if (name.length < 2 || phone.length < 7 || !email || !email.includes("@") || password.length < 6) {
    return NextResponse.json({ error: "Name, email, and a valid mobile number are required. Passwords need 6+ characters." }, { status: 400 });
  }

  const exists = db.prepare("SELECT 1 FROM users WHERE lower(email) = ? OR phone = ? OR id = ?").get(email || null, phone, email || phone);
  if (exists) return NextResponse.json({ error: "That email or mobile number is already in use." }, { status: 409 });

  const user = createUser(name, password, role, email, body.address, phone, body.shopName);
  const response = NextResponse.json({ user });
  response.cookies.set({ ...setSession(user), httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}