"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Status configuration ────────────────────────────────────────────────────

const STATUS = {
  PENDING:          { label: "En attente",    short: "Attente",    color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  ACCEPTED:         { label: "Acceptée",       short: "Acceptée",   color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  PREPARING:        { label: "Préparation",    short: "Préparation",color: "#6D28D9", bg: "#F5F3FF", border: "#DDD6FE" },
  READY:            { label: "Prête",          short: "Prête",      color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
  OUT_FOR_DELIVERY: { label: "En livraison",   short: "Livraison",  color: "#9A3412", bg: "#FFF7ED", border: "#FDBA74" },
  DELIVERED:        { label: "Livrée",         short: "Livrée",     color: "#14532D", bg: "#F0FDF4", border: "#86EFAC" },
  CANCELLED:        { label: "Annulée",        short: "Annulée",    color: "#7F1D1D", bg: "#FEF2F2", border: "#FECACA" },
};

// Transitions autorisées côté client (miroir du serveur)
const NEXT_ACTIONS = {
  PENDING:          [{ to: "ACCEPTED", label: "Accepter" }, { to: "CANCELLED", label: "Refuser" }],
  ACCEPTED:         [{ to: "PREPARING", label: "Commencer la préparation" }],
  PREPARING:        [{ to: "READY", label: "Marquer comme prête" }],
  READY:            [{ to: "OUT_FOR_DELIVERY", label: "Partie en livraison" }],
  OUT_FOR_DELIVERY: [{ to: "DELIVERED", label: "Marquer comme livrée" }],
  DELIVERED:        [],
  CANCELLED:        [],
};

const FILTER_TABS = [
  { id: "ALL", label: "Toutes" },
  { id: "PENDING", label: "En attente" },
  { id: "ACCEPTED", label: "Acceptées" },
  { id: "PREPARING", label: "Préparation" },
  { id: "READY", label: "Prêtes" },
  { id: "OUT_FOR_DELIVERY", label: "En livraison" },
  { id: "DELIVERED", label: "Livrées" },
];

// ── Formatters ──────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("fr-FR");
const fmtAmount = (n) => n != null ? `${fmt.format(n)} XAF` : "—";
const fmtTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
const fmtRelative = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return fmtTime(iso);
};
const fmtPayment = (m) =>
  m === "cash" ? "Espèces" : m === "airtel_money" ? "Airtel Money" : m === "tigo_cash" ? "Tigo Cash" : m ?? "—";

// ── Components ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status, size = "sm" }) => {
  const cfg = STATUS[status] ?? { label: status, color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" };
  return (
    <span style={{
      display: "inline-block",
      padding: size === "sm" ? "2px 8px" : "4px 12px",
      borderRadius: 4,
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: size === "sm" ? 11 : 12,
      fontWeight: 600,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
};

const Divider = () => <div style={{ height: 1, background: "#F3F0EB", margin: "16px 0" }} />;

// ── Main Component ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [now, setNow] = useState(new Date());
  const intervalRef = useRef(null);

  // Tick every minute for relative timestamps
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? `Erreur ${res.status}`);
        if (res.status === 401) { router.push("/login"); return; }
      } else {
        setApiError(null);
        setOrders(data);
        // Extract restaurant name from first order if not already set
        if (!restaurantName && data.length > 0 && data[0].restaurant_name) {
          setRestaurantName(data[0].restaurant_name);
        }
      }
    } catch (e) {
      setApiError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }, [restaurantName, router]);

  const fetchDetails = useCallback(async (id) => {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSelected(data.order);
      setItems(data.items ?? []);
    }
  }, []);

  const updateStatus = useCallback(async (id, newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Erreur lors de la mise à jour");
        return;
      }
      await fetchOrders();
      if (selected?.id === id) await fetchDetails(id);
    } finally {
      setUpdating(false);
    }
  }, [selected, fetchOrders, fetchDetails]);

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  useEffect(() => {
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 12_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchOrders]);

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);
  const countByStatus = (s) => orders.filter((o) => o.status === s).length;
  const pendingCount = countByStatus("PENDING");
  const activeCount = orders.filter((o) => !["DELIVERED","CANCELLED"].includes(o.status)).length;

  return (
    <div style={s.root}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>
            <span style={s.logoDot} />
            <span style={s.logoText}>Atlib</span>
          </div>
          {restaurantName && (
            <>
              <span style={s.headerSep}>·</span>
              <span style={s.headerRestaurant}>{restaurantName}</span>
            </>
          )}
          {pendingCount > 0 && (
            <span style={s.pendingBadge}>{pendingCount} en attente</span>
          )}
        </div>
        <div style={s.headerRight}>
          <span style={s.headerTime}>
            {now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button onClick={() => fetchOrders()} style={s.btnGhost} disabled={loading}>
            Actualiser
          </button>
          <button onClick={logout} style={s.btnGhost}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={s.body}>
        {/* ── Error banner ── */}
        {apiError && (
          <div style={s.errorBanner}>
            <strong>Erreur de connexion : </strong>{apiError}
          </div>
        )}

        {/* ── Stats bar ── */}
        <div style={s.statsBar}>
          {[
            { label: "Actives", count: activeCount },
            { label: "En attente", count: countByStatus("PENDING") },
            { label: "Préparation", count: countByStatus("PREPARING") },
            { label: "Prêtes", count: countByStatus("READY") },
            { label: "Livrées auj.", count: countByStatus("DELIVERED") },
          ].map((stat) => (
            <div key={stat.label} style={s.statItem}>
              <span style={s.statCount}>{stat.count}</span>
              <span style={s.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div style={s.tabs}>
          {FILTER_TABS.map((tab) => {
            const count = tab.id === "ALL" ? orders.length : countByStatus(tab.id);
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{ ...s.tab, ...(active ? s.tabActive : {}) }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{ ...s.tabCount, ...(active ? s.tabCountActive : {}) }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Main grid ── */}
        <div style={s.grid}>
          {/* Orders list */}
          <div style={s.listPanel}>
            {loading ? (
              <div style={s.empty}>Chargement…</div>
            ) : filtered.length === 0 ? (
              <div style={s.empty}>Aucune commande dans cette catégorie</div>
            ) : (
              filtered.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isSelected={selected?.id === order.id}
                  onClick={() => fetchDetails(order.id)}
                  onAction={(newStatus) => updateStatus(order.id, newStatus)}
                  disabled={updating}
                />
              ))
            )}
          </div>

          {/* Detail panel */}
          <div style={s.detailPanel}>
            {!selected ? (
              <div style={s.emptyDetail}>
                <div style={s.emptyDetailIcon} />
                <p style={s.emptyDetailText}>Sélectionnez une commande pour voir les détails</p>
              </div>
            ) : (
              <OrderDetail
                order={selected}
                items={items}
                onAction={(newStatus) => updateStatus(selected.id, newStatus)}
                disabled={updating}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OrderRow ────────────────────────────────────────────────────────────────

function OrderRow({ order, isSelected, onClick, onAction, disabled }) {
  const actions = NEXT_ACTIONS[order.status] ?? [];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.row,
        background: isSelected ? "#FDF5F7" : hovered ? "#FAFAF9" : "#FFFFFF",
        borderColor: isSelected ? "#E8C5CF" : "#F3F0EB",
      }}
    >
      <div style={s.rowMain}>
        <div style={s.rowLeft}>
          <span style={s.rowId}>#{String(order.id).slice(-6).toUpperCase()}</span>
          <span style={s.rowTime}>{fmtRelative(order.created_at)}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div style={s.rowCustomer}>
        {order.customer_name && order.customer_name !== "Client" ? order.customer_name : "Client anonyme"}
        {order.delivery_address ? <span style={s.rowAddress}> · {order.delivery_address}</span> : null}
      </div>

      <div style={s.rowFooter}>
        <span style={s.rowAmount}>{fmtAmount(order.total_xaf)}</span>
        <span style={s.rowPayment}>{fmtPayment(order.payment_method)}</span>
        {actions.length > 0 && (
          <div style={s.rowActions} onClick={(e) => e.stopPropagation()}>
            {actions.map((a) => (
              <button
                key={a.to}
                onClick={() => onAction(a.to)}
                disabled={disabled}
                style={{
                  ...s.actionBtn,
                  ...(a.to === "CANCELLED" ? s.actionBtnDanger : s.actionBtnPrimary),
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── OrderDetail ─────────────────────────────────────────────────────────────

function OrderDetail({ order, items, onAction, disabled }) {
  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <div style={s.detail}>
      {/* Header */}
      <div style={s.detailHeader}>
        <div>
          <div style={s.detailId}>#{String(order.id).slice(-6).toUpperCase()}</div>
          <div style={s.detailTime}>{fmtTime(order.created_at)}</div>
        </div>
        <StatusBadge status={order.status} size="md" />
      </div>

      <Divider />

      {/* Info */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Livraison</div>
        <DetailRow label="Adresse" value={order.delivery_address || "—"} />
        {order.customer_name && order.customer_name !== "Client" && (
          <DetailRow label="Client" value={order.customer_name} />
        )}
        {order.customer_phone && (
          <DetailRow label="Téléphone" value={order.customer_phone} />
        )}
      </div>

      <Divider />

      {/* Items */}
      {items.length > 0 && (
        <>
          <div style={s.section}>
            <div style={s.sectionTitle}>Articles ({items.length})</div>
            <div style={s.itemList}>
              {items.map((it) => (
                <div key={it.id} style={s.itemRow}>
                  <span style={s.itemQty}>{it.qty}×</span>
                  <span style={s.itemName}>{it.name}</span>
                  <span style={s.itemPrice}>{fmtAmount(it.price_xaf * it.qty)}</span>
                </div>
              ))}
            </div>
          </div>
          <Divider />
        </>
      )}

      {/* Payment summary */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Paiement</div>
        <DetailRow label="Méthode" value={fmtPayment(order.payment_method)} />
        <DetailRow label="Sous-total" value={fmtAmount(order.subtotal_xaf)} />
        <DetailRow label="Livraison" value={fmtAmount(order.delivery_fee_xaf)} />
        <div style={s.totalRow}>
          <span>Total</span>
          <span style={s.totalAmount}>{fmtAmount(order.total_xaf)}</span>
        </div>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <>
          <Divider />
          <div style={s.detailActions}>
            {actions.map((a) => (
              <button
                key={a.to}
                onClick={() => onAction(a.to)}
                disabled={disabled}
                style={{
                  ...s.detailActionBtn,
                  ...(a.to === "CANCELLED" ? s.detailActionBtnDanger : s.detailActionBtnPrimary),
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={s.detailRow}>
      <span style={s.detailRowLabel}>{label}</span>
      <span style={s.detailRowValue}>{value}</span>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = {
  root: {
    minHeight: "100vh",
    background: "#F8F8F7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    color: "#111",
  },

  // Header
  header: {
    height: 52,
    background: "#FFFFFF",
    borderBottom: "1px solid #E8E4DC",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logo: { display: "flex", alignItems: "center", gap: 7 },
  logoDot: { width: 7, height: 7, borderRadius: "50%", background: "#7A1E3A" },
  logoText: { fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em", color: "#111" },
  headerSep: { color: "#CCC", fontSize: 14, margin: "0 2px" },
  headerRestaurant: { fontSize: 13, fontWeight: 600, color: "#444" },
  pendingBadge: {
    marginLeft: 6,
    background: "#FEF3C7",
    color: "#92400E",
    border: "1px solid #FDE68A",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 7px",
    letterSpacing: "0.01em",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  headerTime: { fontSize: 12, color: "#999", marginRight: 6 },
  btnGhost: {
    background: "none",
    border: "1px solid #E8E4DC",
    borderRadius: 6,
    padding: "5px 11px",
    fontSize: 12,
    fontWeight: 500,
    color: "#555",
    cursor: "pointer",
  },

  // Body
  body: { padding: "20px 24px", maxWidth: 1400, margin: "0 auto" },

  errorBanner: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#B91C1C",
    marginBottom: 16,
  },

  // Stats bar
  statsBar: {
    display: "flex",
    gap: 2,
    marginBottom: 16,
    background: "#FFFFFF",
    border: "1px solid #E8E4DC",
    borderRadius: 8,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px 8px",
    borderRight: "1px solid #F3F0EB",
  },
  statCount: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "#111" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 2, letterSpacing: "0.01em" },

  // Tabs
  tabs: {
    display: "flex",
    gap: 2,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  tab: {
    background: "#FFFFFF",
    border: "1px solid #E8E4DC",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 500,
    color: "#666",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.1s",
  },
  tabActive: {
    background: "#7A1E3A",
    borderColor: "#7A1E3A",
    color: "#FFFFFF",
  },
  tabCount: {
    background: "#F3F0EB",
    color: "#666",
    borderRadius: 3,
    padding: "0 5px",
    fontSize: 11,
    fontWeight: 700,
    minWidth: 18,
    textAlign: "center",
  },
  tabCountActive: {
    background: "rgba(255,255,255,0.25)",
    color: "#fff",
  },

  // Grid
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 16,
    alignItems: "start",
  },

  // Orders list
  listPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  empty: {
    background: "#FFFFFF",
    border: "1px solid #E8E4DC",
    borderRadius: 8,
    padding: "40px 24px",
    textAlign: "center",
    fontSize: 13,
    color: "#AAA",
  },

  // Order row
  row: {
    background: "#FFFFFF",
    border: "1px solid #F3F0EB",
    borderRadius: 8,
    padding: "12px 16px",
    cursor: "pointer",
    transition: "background 0.1s, border-color 0.1s",
  },
  rowMain: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  rowLeft: { display: "flex", alignItems: "baseline", gap: 8 },
  rowId: { fontSize: 13, fontWeight: 700, color: "#111", letterSpacing: "0.02em" },
  rowTime: { fontSize: 11, color: "#AAA" },
  rowCustomer: { fontSize: 13, color: "#555", marginBottom: 8 },
  rowAddress: { color: "#999" },
  rowFooter: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  rowAmount: { fontSize: 13, fontWeight: 700, color: "#111" },
  rowPayment: { fontSize: 11, color: "#999", flex: 1 },
  rowActions: { display: "flex", gap: 6 },
  actionBtn: {
    border: "none",
    borderRadius: 5,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.01em",
  },
  actionBtnPrimary: { background: "#7A1E3A", color: "#FFFFFF" },
  actionBtnDanger: { background: "#F3F0EB", color: "#666" },

  // Detail panel
  detailPanel: {
    position: "sticky",
    top: 68,
    background: "#FFFFFF",
    border: "1px solid #E8E4DC",
    borderRadius: 8,
    overflow: "hidden",
  },
  emptyDetail: {
    padding: "48px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  emptyDetailIcon: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#F3F0EB",
  },
  emptyDetailText: {
    margin: 0,
    fontSize: 13,
    color: "#AAA",
    lineHeight: 1.5,
    maxWidth: 200,
  },
  detail: { padding: "20px" },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailId: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "#111" },
  detailTime: { fontSize: 12, color: "#AAA", marginTop: 3 },

  // Sections
  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#AAA",
    marginBottom: 10,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 13,
  },
  detailRowLabel: { color: "#888" },
  detailRowValue: { color: "#111", fontWeight: 500, maxWidth: "60%", textAlign: "right" },

  // Items
  itemList: { display: "flex", flexDirection: "column", gap: 6 },
  itemRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  itemQty: { color: "#999", minWidth: 20, fontWeight: 600 },
  itemName: { flex: 1, color: "#333" },
  itemPrice: { color: "#111", fontWeight: 600 },

  // Total
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTop: "1px solid #F3F0EB",
    fontSize: 14,
    fontWeight: 700,
  },
  totalAmount: { color: "#7A1E3A" },

  // Detail actions
  detailActions: { display: "flex", flexDirection: "column", gap: 8 },
  detailActionBtn: {
    width: "100%",
    padding: "10px 16px",
    border: "none",
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "-0.01em",
  },
  detailActionBtnPrimary: { background: "#7A1E3A", color: "#FFFFFF" },
  detailActionBtnDanger: {
    background: "#F8F8F7",
    color: "#888",
    border: "1px solid #E8E4DC",
  },
};
