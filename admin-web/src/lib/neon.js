import { neon } from "@neondatabase/serverless";

const getDb = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in .env.local");
  return neon(url);
};

export const db = {
  // ── Restaurant accounts ───────────────────────────────────────────────

  async getAccountByEmail(email) {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM restaurant_accounts WHERE email = ${email} LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async createAccount({ email, passwordHash, restaurantId, restaurantName }) {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO restaurant_accounts (email, password_hash, restaurant_id, restaurant_name)
      VALUES (${email}, ${passwordHash}, ${restaurantId}, ${restaurantName})
      RETURNING *
    `;
    return rows[0];
  },

  // ── Orders ────────────────────────────────────────────────────────────

  async getOrders(restaurantId) {
    const sql = getDb();
    return sql`
      SELECT * FROM orders
      WHERE restaurant_id = ${restaurantId}
      ORDER BY created_at DESC
    `;
  },

  async getOrderById(id, restaurantId) {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM orders
      WHERE id = ${id} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async getOrderItems(orderId) {
    const sql = getDb();
    return sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  },

  async updateOrderStatus(id, status) {
    const sql = getDb();
    await sql`
      UPDATE orders
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
    `;
  },

  async createOrder(order) {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO orders (
        id, restaurant_id, restaurant_name, customer_name, customer_phone,
        delivery_address, push_token, status,
        subtotal_xaf, delivery_fee_xaf, total_xaf, payment_method
      ) VALUES (
        ${order.id}, ${order.restaurant_id}, ${order.restaurant_name ?? ""},
        ${order.customer_name}, ${order.customer_phone},
        ${order.delivery_address}, ${order.push_token ?? null},
        ${order.status ?? "PENDING"}, ${order.subtotal_xaf}, ${order.delivery_fee_xaf},
        ${order.total_xaf}, ${order.payment_method}
      )
      RETURNING *
    `;
    return rows[0];
  },

  async createOrderItems(items) {
    if (!items.length) return;
    const sql = getDb();
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, name, qty, price_xaf)
        VALUES (${item.order_id}, ${item.name}, ${item.qty}, ${item.price_xaf})
      `;
    }
  },
};
