import { NextResponse } from "next/server";
import { authenticateUser, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json() as { identifier?: string; password?: string };
  const user = authenticateUser(body.identifier ?? "", body.password ?? "");

  if (!user) return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });

  const response = NextResponse.json({ user });
  response.cookies.set({ ...setSession(user), httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}