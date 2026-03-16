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

  async getAllAccounts() {
    const sql = getDb();
    return sql`SELECT id, email, restaurant_id, restaurant_name, created_at FROM restaurant_accounts ORDER BY id`;
  },

  async deleteAccount(email) {
    const sql = getDb();
    await sql`DELETE FROM restaurant_accounts WHERE email = ${email}`;
  },

  async getDistinctRestaurants() {
    const sql = getDb();
    return sql`
      SELECT restaurant_id, restaurant_name, COUNT(*) AS nb
      FROM orders
      GROUP BY restaurant_id, restaurant_name
      ORDER BY nb DESC
    `;
  },

  // ── Customer accounts ─────────────────────────────────────────────────

  async getCustomerByEmail(email) {
    const sql = getDb();
    const rows = await sql`SELECT * FROM customer_accounts WHERE email = ${email} LIMIT 1`;
    return rows[0] ?? null;
  },

  async createCustomer({ email, name, phone, passwordHash }) {
    const sql = getDb();
    const rows = await sql`
      INSERT INTO customer_accounts (email, name, phone, password_hash)
      VALUES (${email}, ${name}, ${phone ?? null}, ${passwordHash})
      RETURNING id, email, name, phone, created_at
    `;
    return rows[0];
  },

  async getCustomerOrders(customerId) {
    const sql = getDb();
    const orders = await sql`
      SELECT
        o.*,
        json_agg(json_build_object('name', oi.name, 'qty', oi.qty, 'price_xaf', oi.price_xaf)) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.customer_id = ${customerId}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    return orders;
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
        subtotal_xaf, delivery_fee_xaf, total_xaf, payment_method, customer_id
      ) VALUES (
        ${order.id}, ${order.restaurant_id}, ${order.restaurant_name ?? ""},
        ${order.customer_name}, ${order.customer_phone},
        ${order.delivery_address}, ${order.push_token ?? null},
        ${order.status ?? "PENDING"}, ${order.subtotal_xaf}, ${order.delivery_fee_xaf},
        ${order.total_xaf}, ${order.payment_method}, ${order.customer_id ?? null}
      )
      RETURNING *
    `;
    return rows[0];
  },

  async createOrderItems(items) {
    if (!items.length) return;
    const sql = getDb();
    await sql`
      INSERT INTO order_items ${sql(
      items,
      "order_id",
      "name",
      "qty",
      "price_xaf"
    )}
    `;
  },
};
