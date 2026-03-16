import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { verifySession } from "@/lib/auth";

async function requireAdmin(request) {
  const token = request.cookies.get("restaurant_session")?.value;
  const session = await verifySession(token);
  return session ?? null;
}

export async function GET(request) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const accounts = await db.getAllAccounts();
    return NextResponse.json(accounts);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { email, secret } = await request.json();
  if (secret !== process.env.SETUP_SECRET && secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await db.deleteAccount(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
