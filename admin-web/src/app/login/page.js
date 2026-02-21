"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la connexion");
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          <span style={styles.brandName}>Atlib</span>
        </div>
        <h1 style={styles.title}>Connexion restaurant</h1>
        <p style={styles.subtitle}>Accédez à votre espace de gestion des commandes</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="restaurant@exemple.td"
              required
              style={styles.input}
              autoComplete="email"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
              autoComplete="current-password"
            />
          </div>

          {error && <p style={styles.errorMsg}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            ...styles.btn,
            opacity: loading ? 0.65 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#F8F8F7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    width: 400,
    background: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E2DC",
    padding: "40px 36px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#7A1E3A",
    display: "inline-block",
  },
  brandName: {
    fontWeight: 700,
    fontSize: 15,
    color: "#111",
    letterSpacing: "-0.01em",
  },
  title: {
    margin: "0 0 6px",
    fontSize: 22,
    fontWeight: 700,
    color: "#111",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "0 0 28px",
    fontSize: 14,
    color: "#888",
    lineHeight: 1.5,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#444",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #E0DDD8",
    fontSize: 14,
    color: "#111",
    background: "#FAFAF9",
    outline: "none",
    transition: "border-color 0.15s",
  },
  errorMsg: {
    margin: 0,
    padding: "10px 12px",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    fontSize: 13,
    color: "#B91C1C",
  },
  btn: {
    marginTop: 4,
    padding: "11px 16px",
    background: "#7A1E3A",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    transition: "background 0.15s",
  },
};
