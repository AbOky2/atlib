/**
 * JS-side mirror of the colour tokens declared in tailwind.config.js.
 *
 * Needed because icons, SVG and a handful of animated styles take colours as
 * values rather than class names. The two files must move together — the audit
 * that produced this palette found `#1c1b1b` written by hand 74 times and four
 * greys (#8d8a87, #a1a1aa, #747878, #6b6b70) doing the same job.
 *
 * The language stays NOIR: warm neutrals, near-black ink, ONE signature accent.
 */
export const COLORS = {
    // ---- Neutrals (warm) ---------------------------------------------------
    /** Near-black warm ink — headlines, primary icons, dark surfaces. */
    ink: '#1c1b1b',
    /** Secondary content. Readable, not decorative. */
    inkMuted: '#5f5e5e',
    /** Tertiary content. Darkened from #8d8a87 so it survives daylight. */
    inkFaint: '#706c68',
    inkDisabled: '#b9b5b1',

    // ---- Surfaces ----------------------------------------------------------
    white: '#FFFFFF',
    surface: '#FFFFFF',
    /** Warm screen background. */
    background: '#fcf9f8',
    /** Soft fill: inputs, chips, steppers. */
    fill: '#f6f3f2',
    /** Stronger fill: pressed states, thumbnails. */
    fillStrong: '#ebe7e5',
    /** Default hairline separator. */
    hairline: '#e7e3e1',
    hairlineSoft: '#f0ecea',

    // ---- Brand -------------------------------------------------------------
    /** The one canonical orange. CTA, active selection, brand accent. */
    accent: '#FF5733',
    accentPressed: '#E04A29',
    accentSoft: '#FFEDE7',
    /** Accent that holds AA contrast as text on white. */
    accentDark: '#C73B19',

    // ---- Feedback ----------------------------------------------------------
    success: '#1E874B',
    successSoft: '#E4F4EA',
    danger: '#BA1A1A',
    dangerSoft: '#FFDAD6',
    warning: '#B25E00',
    warningSoft: '#FFF0DF',

    /** Premium tier accent — the NOIR+ teaser, and nothing else. */
    gold: '#E8B830',

    // ---- Dark staff surfaces (restaurant dashboard) ------------------------
    ink900: '#0a0a0a',
    ink800: '#141313',
    ink700: '#1c1b1b',
    /** Text tiers on dark. */
    onDark: '#FFFFFF',
    onDarkMuted: 'rgba(255,255,255,0.62)',
    onDarkFaint: 'rgba(255,255,255,0.55)',
    hairlineDark: 'rgba(255,255,255,0.10)',
    fillDark: 'rgba(255,255,255,0.06)',
    fillDarkStrong: 'rgba(255,255,255,0.12)',
} as const;

export type PaletteColor = keyof typeof COLORS;
