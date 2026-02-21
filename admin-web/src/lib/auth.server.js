/**
 * Password hashing — Node.js runtime uniquement (jamais importé par le middleware).
 * Utilise scrypt via le module crypto natif Node.js.
 */
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [salt, storedHex] = stored.split(":");
  if (!salt || !storedHex) return false;
  const hash = await scryptAsync(password, salt, 64);
  const storedBuf = Buffer.from(storedHex, "hex");
  return hash.byteLength === storedBuf.byteLength && timingSafeEqual(hash, storedBuf);
}
