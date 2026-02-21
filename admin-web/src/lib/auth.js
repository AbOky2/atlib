/**
 * Session utilities — compatible Edge Runtime (Web Crypto API).
 * Importé par le middleware ET les API routes.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (padded.length % 4)) % 4;
  return Uint8Array.from(atob(padded + "=".repeat(pad)), (c) => c.charCodeAt(0));
}

async function getHmacKey() {
  const secret = process.env.SESSION_SECRET ?? "atlib-fallback-secret";
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSession(payload) {
  const data = b64url(enc.encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const sig = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return `${data}.${sig}`;
}

export async function verifySession(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC", key, b64urlDecode(sig), enc.encode(data),
    );
    if (!valid) return null;
    return JSON.parse(dec.decode(b64urlDecode(data)));
  } catch {
    return null;
  }
}
