import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { verifyPassword } from "@/lib/auth.server";
import { createSession } from "@/lib/auth";

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  let account;
  try {
    account = await db.getAccountByEmail(email.trim().toLowerCase());
  } catch (err) {
    console.error("[POST /api/login]", err.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  const valid = await verifyPassword(password, account.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  const token = await createSession({
    restaurantId: account.restaurant_id,
    restaurantName: account.restaurant_name,
  });

  const res = NextResponse.json({ ok: true, restaurantName: account.restaurant_name });
  res.cookies.set("restaurant_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 16,
  });
  return res;
}
