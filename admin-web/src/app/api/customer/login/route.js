import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { verifyPassword } from "@/lib/auth.server";
import { createCustomerToken } from "@/lib/customerAuth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const customer = await db.getCustomerByEmail(email.trim().toLowerCase());
    if (!customer) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    const valid = await verifyPassword(password, customer.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    const token = await createCustomerToken({
      id: customer.id,
      email: customer.email,
      name: customer.name,
    });

    return NextResponse.json({
      ok: true,
      token,
      user: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone },
    });
  } catch (err) {
    console.error("[POST /api/customer/login]", err.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
