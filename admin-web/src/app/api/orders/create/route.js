import { NextResponse } from "next/server";
import { db } from "@/lib/neon";

export async function POST(request) {
  try {
    const body = await request.json();
    const { order, items } = body;

    if (!order?.id) {
      return NextResponse.json({ error: "order.id is required" }, { status: 400 });
    }

    await db.createOrder(order);

    if (Array.isArray(items) && items.length > 0) {
      await db.createOrderItems(items);
    }

    return NextResponse.json({ ok: true, id: order.id });
  } catch (err) {
    console.error("[POST /api/orders/create]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
