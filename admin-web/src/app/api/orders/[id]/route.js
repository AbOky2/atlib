import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { verifySession } from "@/lib/auth";

async function getRestaurantId(request) {
  const token = request.cookies.get("restaurant_session")?.value;
  const session = await verifySession(token);
  return session?.restaurantId ?? null;
}

// Transitions autorisées : CANCEL n'est possible que depuis PENDING
const VALID_TRANSITIONS = {
  PENDING:          ["ACCEPTED", "CANCELLED"],
  ACCEPTED:         ["PREPARING"],
  PREPARING:        ["READY"],
  READY:            ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED:        [],
  CANCELLED:        [],
};

const STATUS_LABELS = {
  PENDING:          "En attente de confirmation",
  ACCEPTED:         "Votre commande a été acceptée",
  PREPARING:        "Votre commande est en préparation",
  READY:            "Votre commande est prête",
  OUT_FOR_DELIVERY: "Votre commande est en cours de livraison",
  DELIVERED:        "Votre commande a été livrée !",
  CANCELLED:        "Votre commande a été annulée",
};

const sendExpoPush = async (token, title, body) => {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default", data: { type: "order_status" } }),
    });
  } catch {
    // push errors are non-blocking
  }
};

export async function GET(request, { params }) {
  const { id } = await params;
  const restaurantId = await getRestaurantId(request);
  if (!restaurantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const order = await db.getOrderById(id, restaurantId);
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    const items = await db.getOrderItems(id);
    return NextResponse.json({ order, items });
  } catch (err) {
    console.error(`[GET /api/orders/${id}]`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const restaurantId = await getRestaurantId(request);
  if (!restaurantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { status: newStatus } = await request.json();
    const order = await db.getOrderById(id, restaurantId);

    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Transition ${order.status} → ${newStatus} non autorisée` },
        { status: 422 },
      );
    }

    await db.updateOrderStatus(id, newStatus);

    if (order.push_token && newStatus !== order.status) {
      const pushBody = STATUS_LABELS[newStatus] ?? `Statut mis à jour`;
      await sendExpoPush(order.push_token, "Atlib — Mise à jour commande", pushBody);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[PATCH /api/orders/${id}]`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
