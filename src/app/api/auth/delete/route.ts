import { NextResponse } from "next/server";
import { deleteUser, getCurrentUser, SESSION_COOKIE } from "@/lib/auth";

export async function DELETE() {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error: "You must be signed in to delete your account." }, { status: 401 });

  deleteUser(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}