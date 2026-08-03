/**
 * UUID v4 generator for idempotency keys.
 *
 * Prefers the runtime's crypto implementation when present; falls back to
 * Math.random on engines without it. These keys de-duplicate retried order
 * submissions — they are correlation ids, not security tokens, so the
 * fallback's weaker entropy is acceptable.
 */
export function uuidv4(): string {
    const cryptoObj = (globalThis as any).crypto;
    if (cryptoObj?.randomUUID) {
        return cryptoObj.randomUUID();
    }
    let bytes: number[];
    if (cryptoObj?.getRandomValues) {
        bytes = Array.from(cryptoObj.getRandomValues(new Uint8Array(16)));
    } else {
        bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex
        .slice(8, 10)
        .join('')}-${hex.slice(10, 16).join('')}`;
}
