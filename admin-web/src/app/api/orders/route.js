import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { verifySession } from "@/lib/auth";

async function getRestaurantId(request) {
  const token = request.cookies.get("restaurant_session")?.value;
  const session = await verifySession(token);
  return session?.restaurantId ?? null;
}

export async function GET(request) {
  const restaurantId = await getRestaurantId(request);
  if (!restaurantId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const orders = await db.getOrders(restaurantId);
    return NextResponse.json(orders);
  } catch (err) {
    console.error("[GET /api/orders]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
