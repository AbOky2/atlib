-- Atlib — Schéma de base de données Neon PostgreSQL
-- À exécuter une seule fois dans la console SQL de ton projet Neon
-- https://console.neon.tech → ton projet → SQL Editor

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT        PRIMARY KEY,
  restaurant_id    TEXT        NOT NULL DEFAULT '',
  customer_name    TEXT        NOT NULL DEFAULT 'Client',
  customer_phone   TEXT        NOT NULL DEFAULT '',
  delivery_address TEXT        NOT NULL DEFAULT '',
  push_token       TEXT,
  status           TEXT        NOT NULL DEFAULT 'PENDING',
  subtotal_xaf     INTEGER     NOT NULL DEFAULT 0,
  delivery_fee_xaf INTEGER     NOT NULL DEFAULT 0,
  total_xaf        INTEGER     NOT NULL DEFAULT 0,
  payment_method   TEXT        NOT NULL DEFAULT 'cash',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id        SERIAL  PRIMARY KEY,
  order_id  TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name      TEXT    NOT NULL,
  qty       INTEGER NOT NULL DEFAULT 1,
  price_xaf INTEGER NOT NULL DEFAULT 0
);

-- Index pour accélérer les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
