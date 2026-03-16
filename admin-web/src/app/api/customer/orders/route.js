import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { getCustomerFromRequest } from "@/lib/customerAuth";

export async function GET(request) {
  const customer = await getCustomerFromRequest(request);
  if (!customer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const orders = await db.getCustomerOrders(customer.id);
    return NextResponse.json(orders);
  } catch (err) {
    console.error("[GET /api/customer/orders]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
