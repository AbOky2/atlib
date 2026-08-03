/**
 * Single source of truth for the JS-side colour palette (icons, inline styles,
 * SVG). Mirrors the Tailwind tokens in tailwind.config.js — change both together.
 *
 * The language is the NOIR one: warm neutrals, near-black ink, ONE signature
 * accent (#FF5733), soft daylight elevation. Nothing else.
 */
export const COLORS = {
    /** Near-black warm ink — headlines, primary icons, dark cards. */
    ink: '#1c1b1b',
    /** Secondary content (descriptions, meta lines). */
    inkMuted: '#5f5e5e',
    /** Tertiary content (placeholders, captions). */
    inkFaint: '#8d8a87',
    /** Disabled content. */
    inkDisabled: '#c4c7c7',

    /** Cards / sheets. */
    white: '#FFFFFF',
    /** Warm screen background. */
    background: '#fcf9f8',
    /** Soft fill: inputs, chips, steppers. */
    fill: '#f6f3f2',
    /** Stronger fill (pressed states, avatars). */
    fillStrong: '#e5e2e1',
    /** Hairline separators. */
    hairline: '#e7e3e1',

    /** Brand accent — CTAs, live states, the NOIR signature. */
    accent: '#FF5733',
    /** Accent that holds AA contrast as text on white. */
    accentDark: '#D6431F',
    /** Accent wash for badges/banners. */
    accentTint: '#FFEDE7',

    /** Success (delivered). */
    green: '#22c55e',
    greenTint: 'rgba(34,197,94,0.1)',

    /** Destructive / errors. */
    red: '#ba1a1a',
    redTint: '#ffdad6',

    /** Waiting / attention. */
    amber: '#f59e0b',
    amberTint: 'rgba(245,158,11,0.1)',
} as const;

export type PaletteColor = keyof typeof COLORS;
