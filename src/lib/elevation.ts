/**
 * Elevation, reduced to what actually earns it.
 *
 * The app used three shadow levels applied to nearly every white rectangle,
 * which is why so many surfaces looked like they were floating for no reason.
 * A premium interface separates surfaces with space, contrast and a hairline —
 * a shadow only means "this genuinely sits above the page".
 *
 * Level 0 is the absence of these: use a hairline border instead.
 */

/** Level 1 — a surface that really floats over content (sticky bars, cards on photo). */
export const shadowSoft = {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
} as const;

/** Level 2 — detached objects: floating nav, bottom sheets, dialogs. */
export const shadowFloat = {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
} as const;

/**
 * Alias kept for the sheets that already referenced it. Same level 2 —
 * a bottom sheet and a dialog are the same kind of object, so they cast the
 * same shadow.
 */
export const shadowSheet = shadowFloat;
