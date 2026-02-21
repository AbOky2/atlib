/**
 * Route de création de comptes restaurant (protégée par SETUP_SECRET).
 * POST /api/setup
 * Body: { secret, email, password, restaurantId, restaurantName }
 *
 * Exemple curl:
 *   curl -X POST http://localhost:3000/api/setup \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"VOTRE_SETUP_SECRET","email":"restaurant@atlib.td","password":"motdepasse","restaurantId":"r3","restaurantName":"Istanbul Grill"}'
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { hashPassword } from "@/lib/auth.server";

export async function POST(request) {
  const { secret, email, password, restaurantId, restaurantName } = await request.json();

  if (secret !== process.env.SETUP_SECRET && secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!email || !password || !restaurantId || !restaurantName) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const account = await db.createAccount({
      email: email.trim().toLowerCase(),
      passwordHash,
      restaurantId,
      restaurantName,
    });
    return NextResponse.json({ ok: true, id: account.id, email: account.email });
  } catch (err) {
    console.error("[POST /api/setup]", err.message);
    if (err.message.includes("unique")) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
