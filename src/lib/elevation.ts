/**
 * Three soft, diffuse elevation tokens — one source of truth replacing the
 * hand-tuned per-component shadows. Low opacity + large blur + warm ink colour =
 * the calm, daylight-like elevation of a premium UI (Apple never colours shadows).
 */
export const shadowSoft = {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
} as const;

export const shadowFloat = {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
} as const;

export const shadowSheet = {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
} as const;
