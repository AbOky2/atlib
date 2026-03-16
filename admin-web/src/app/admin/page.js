"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    email: "", password: "", restaurantId: "", restaurantName: "", secret: "",
  });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, ordRes] = await Promise.all([
        fetch("/api/admin/accounts"),
        fetch("/api/admin/restaurant-ids"),
      ]);
      if (accRes.status === 401 || ordRes.status === 401) {
        router.push("/login");
        return;
      }
      const acc = await accRes.json();
      const ord = await ordRes.json();
      setAccounts(acc);
      setOrders(ord);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: "ok", text: `Compte créé : ${form.email}` });
      setForm({ email: "", password: "", restaurantId: "", restaurantName: "", secret: form.secret });
      fetchData();
    } catch (e) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (email) => {
    if (!confirm(`Supprimer le compte ${email} ?`)) return;
    const secret = prompt("SETUP_SECRET :");
    const res = await fetch("/api/admin/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, secret }),
    });
    const data = await res.json();
    if (res.ok) { fetchData(); }
    else alert(data.error);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des comptes restaurants</h1>
          <p style={styles.subtitle}>Associez chaque restaurant Sanity à un compte administrateur</p>
        </div>
        <button onClick={() => router.push("/dashboard")} style={styles.backBtn}>
          ← Dashboard
        </button>
      </div>

      {loading ? (
        <p style={styles.muted}>Chargement...</p>
      ) : error ? (
        <p style={{ color: "#EF4444" }}>{error}</p>
      ) : (
        <>
          {/* Accounts table */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Comptes existants</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["Email", "Restaurant", "restaurant_id (Sanity)", "Actions"].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr><td colSpan={4} style={styles.td}>Aucun compte</td></tr>
                  ) : accounts.map((a) => (
                    <tr key={a.id} style={styles.tr}>
                      <td style={styles.td}>{a.email}</td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{a.restaurant_name}</td>
                      <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12, color: "#6B7280" }}>
                        {a.restaurant_id}
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => handleDelete(a.email)} style={styles.delBtn}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Restaurant IDs from orders */}
          {orders.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Restaurants avec des commandes</h2>
              <p style={styles.hint}>
                Copiez le <strong>restaurant_id</strong> ci-dessous pour créer un compte associé.
              </p>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["Nom (Sanity)", "restaurant_id", "Commandes", "Compte lié"].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const linked = accounts.find((a) => a.restaurant_id === o.restaurant_id);
                      return (
                        <tr key={o.restaurant_id} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{o.restaurant_name}</td>
                          <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12, color: "#6B7280" }}>
                            <span
                              style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                              onClick={() => setForm((f) => ({ ...f, restaurantId: o.restaurant_id, restaurantName: o.restaurant_name }))}
                              title="Cliquer pour pré-remplir le formulaire"
                            >
                              {o.restaurant_id}
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: "center" }}>{o.nb}</td>
                          <td style={styles.td}>
                            {linked ? (
                              <span style={{ color: "#16A34A", fontWeight: 600 }}>✓ {linked.email}</span>
                            ) : (
                              <span style={{ color: "#EF4444", fontSize: 12 }}>Non lié</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Create account form */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Créer un compte</h2>
            <p style={styles.hint}>
              Cliquez sur un <strong>restaurant_id</strong> dans le tableau ci-dessus pour le pré-remplir.
            </p>
            {message && (
              <div style={{ ...styles.banner, background: message.type === "ok" ? "#D1FAE5" : "#FEE2E2", color: message.type === "ok" ? "#065F46" : "#991B1B" }}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleCreate} style={styles.form}>
              <div style={styles.row}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div style={styles.row}>
                <label style={styles.label}>Mot de passe</label>
                <input style={styles.input} type="password" value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              </div>
              <div style={styles.row}>
                <label style={styles.label}>Nom du restaurant</label>
                <input style={styles.input} value={form.restaurantName}
                  onChange={(e) => setForm((f) => ({ ...f, restaurantName: e.target.value }))} required />
              </div>
              <div style={styles.row}>
                <label style={styles.label}>Restaurant ID (Sanity _id)</label>
                <input style={{ ...styles.input, fontFamily: "monospace", fontSize: 13 }}
                  value={form.restaurantId}
                  onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))} required
                  placeholder="Ex: 5d3c06bf-e785-46cd-88d6-..." />
              </div>
              <div style={styles.row}>
                <label style={styles.label}>SETUP_SECRET</label>
                <input style={styles.input} type="password" value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))} required />
              </div>
              <button type="submit" disabled={creating} style={styles.submitBtn}>
                {creating ? "Création..." : "Créer le compte"}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 960, margin: "0 auto", padding: "32px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111827" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #E5E7EB" },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  backBtn: { padding: "8px 16px", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  hint: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  muted: { color: "#9CA3AF", fontSize: 14 },
  tableWrap: { overflowX: "auto", border: "1px solid #E5E7EB", borderRadius: 10, background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" },
  tr: { borderBottom: "1px solid #F3F4F6" },
  td: { padding: "12px 14px", fontSize: 14, verticalAlign: "middle" },
  delBtn: { padding: "4px 10px", background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500 },
  banner: { padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 500 },
  form: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 },
  row: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: { padding: "9px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, outline: "none" },
  submitBtn: { marginTop: 8, padding: "11px 0", background: "#7A1E3A", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 },
};
