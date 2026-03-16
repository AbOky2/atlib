import { NextResponse } from "next/server";
import { db } from "@/lib/neon";
import { verifySession } from "@/lib/auth";

export async function GET(request) {
  const token = request.cookies.get("restaurant_session")?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const rows = await db.getDistinctRestaurants();
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
