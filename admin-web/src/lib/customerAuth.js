/**
 * Customer token utilities — Node.js runtime (API routes only, not middleware).
 * Uses Web Crypto API (available in Node.js 18+).
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function b64urlDecode(str) {
  return Buffer.from(str, "base64url");
}

function getSecret() {
  const secret = process.env.CUSTOMER_SECRET;
  if (!secret) throw new Error("CUSTOMER_SECRET environment variable is not set");
  return secret;
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createCustomerToken(payload) {
  const data = b64url(enc.encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const sig = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return `${data}.${sig}`;
}

export async function verifyCustomerToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      enc.encode(data),
    );
    if (!valid) return null;
    return JSON.parse(dec.decode(b64urlDecode(data)));
  } catch {
    return null;
  }
}

/** Extract and verify customer token from Authorization: Bearer <token> header. */
export async function getCustomerFromRequest(request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return verifyCustomerToken(auth.slice(7));
}
