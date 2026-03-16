import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { hashPassword } from "@/lib/auth.server";
import { createCustomerToken } from "@/lib/customerAuth";

export async function POST(request) {
  const { email, password, name, phone } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Nom, email et mot de passe requis" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mot de passe trop court (6 caractères min)" }, { status: 400 });
  }

  const existing = await db.getCustomerByEmail(email.trim().toLowerCase());
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const customer = await db.createCustomer({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      phone: phone?.trim() || null,
      passwordHash,
    });

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
    console.error("[POST /api/customer/register]", err.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
