import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { getCustomerFromRequest } from "@/lib/customerAuth";

const ALLOWED_PAYMENT_METHODS = ["cash", "airtel_money", "tigo_cash", "credit_card"];
const MAX_FIELD_LENGTH = 500;

function validateOrder(order) {
  if (!order?.id || typeof order.id !== "string") return "order.id est requis";
  if (!order.restaurant_id) return "restaurant_id est requis";
  if (order.status && order.status !== "PENDING") return "status doit être PENDING à la création";
  if (order.payment_method && !ALLOWED_PAYMENT_METHODS.includes(order.payment_method)) {
    return `payment_method invalide — valeurs acceptées : ${ALLOWED_PAYMENT_METHODS.join(", ")}`;
  }
  if (order.customer_name && order.customer_name.length > MAX_FIELD_LENGTH) return "customer_name trop long";
  if (order.delivery_address && order.delivery_address.length > MAX_FIELD_LENGTH) return "delivery_address trop long";
  if (typeof order.subtotal_xaf !== "number" || order.subtotal_xaf < 0) return "subtotal_xaf invalide";
  if (typeof order.total_xaf !== "number" || order.total_xaf < 0) return "total_xaf invalide";
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { order, items } = body;

    const validationError = validateOrder(order);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Force status to PENDING on creation — never trust client-supplied status
    order.status = "PENDING";

    // Optionally link order to authenticated customer
    const customer = await getCustomerFromRequest(request);
    if (customer?.id) {
      order.customer_id = customer.id;
      if (!order.customer_name || order.customer_name === "Client") {
        order.customer_name = customer.name;
      }
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
