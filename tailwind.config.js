/**
 * Naakul — design tokens (langage visuel NOIR).
 *
 * `fontSize` and `borderRadius` REPLACE Tailwind's defaults rather than extend
 * them. That is deliberate: as long as `text-sm` and `rounded-3xl` remain
 * available, every screen keeps inventing its own scale — the audit found 23
 * distinct text sizes and 7 radius families across the app. Removing the generic
 * names makes the system the only way to express a size, so a drift becomes a
 * build-time absence rather than a silent 2 px inconsistency.
 *
 * Everything else sits on a 4 pt grid (Tailwind's default spacing already does),
 * with 8 pt as the dominant rhythm and 24 pt as the single page gutter.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // ---- Type scale -------------------------------------------------------
    // One step per role. Line heights are set here so vertical rhythm cannot be
    // forgotten at the call site.
    fontSize: {
      display: ['40px', { lineHeight: '44px' }],
      h1: ['30px', { lineHeight: '36px' }],
      h2: ['24px', { lineHeight: '30px' }],
      h3: ['19px', { lineHeight: '25px' }],
      bodylg: ['17px', { lineHeight: '24px' }],
      body: ['15px', { lineHeight: '22px' }],
      label: ['13px', { lineHeight: '18px' }],
      caption: ['12px', { lineHeight: '16px' }],
      // Uppercase reads optically larger, so the eyebrow can sit below caption
      // without losing legibility. The only justified sub-12 px size.
      eyebrow: ['11px', { lineHeight: '14px' }],
    },

    // ---- Corner language --------------------------------------------------
    // Radius follows the size and the role of a surface, never decoration.
    borderRadius: {
      none: '0px',
      chip: '12px',   // chips, badges, small controls
      card: '16px',   // inputs, thumbnails, list tiles
      panel: '20px',  // grouped surfaces, cards
      sheet: '28px',  // bottom sheets, hero media
      full: '9999px', // pills, avatars, icon buttons
    },

    extend: {
      colors: {
        // ---- Neutrals (warm) ---------------------------------------------
        ink: "#1c1b1b",          // primary text, dark surfaces
        "ink-muted": "#5f5e5e",  // secondary text — readable, not decorative
        "ink-faint": "#706c68",  // tertiary text; darkened from #8d8a87 for outdoor legibility
        "ink-disabled": "#b9b5b1",
        hairline: "#e7e3e1",     // default border
        "hairline-soft": "#f0ecea",

        // ---- Surfaces -----------------------------------------------------
        background: "#fcf9f8",
        surface: "#ffffff",
        "surface-sunken": "#f6f3f2",
        "surface-raised": "#ffffff",
        fill: "#f6f3f2",
        "fill-strong": "#ebe7e5",

        // ---- Brand --------------------------------------------------------
        // ONE canonical orange. Reserved for the primary CTA, the active
        // selection and small brand accents — never as a general surface tint.
        accent: "#FF5733",
        "accent-dark": "#C73B19",
        "accent-pressed": "#E04A29",
        "accent-soft": "#FFEDE7",

        // ---- Feedback -----------------------------------------------------
        success: "#1E874B",
        "success-soft": "#E4F4EA",
        danger: "#BA1A1A",
        "danger-soft": "#FFDAD6",
        warning: "#B25E00",
        "warning-soft": "#FFF0DF",

        // Premium tier accent — used only by the NOIR+ teaser.
        gold: "#E8B830",

        // Dark staff surfaces (restaurant dashboard) and the text tiers on them.
        // White at 55 % on #0a0a0a is 6.3:1; the previous 40 % was under AA.
        "ink-900": "#0a0a0a",
        "ink-800": "#141313",
        "ink-700": "#1c1b1b",
        "on-dark": "#FFFFFF",
        "on-dark-muted": "rgba(255,255,255,0.62)",
        "on-dark-faint": "rgba(255,255,255,0.55)",
        "hairline-dark": "rgba(255,255,255,0.10)",
        "fill-dark": "rgba(255,255,255,0.06)",
        "fill-dark-strong": "rgba(255,255,255,0.12)",
      },

      fontFamily: {
        // Weight lives in the family, mapped to the faces loaded in app/_layout.
        display: ['Manrope_800ExtraBold'],
        title: ['Manrope_700Bold'],
        heading: ['Manrope_600SemiBold'],
        subheading: ['Manrope_500Medium'],
        body: ['Inter_400Regular'],
        label: ['Inter_500Medium'],
        labelbold: ['Inter_600SemiBold'],
      },

      // Component heights that several screens must agree on.
      height: {
        control: '52px',  // inputs, chips row, secondary buttons
        cta: '56px',      // the one primary action of a screen
        icon: '44px',     // icon button / minimum touch target
      },
      minHeight: {
        touch: '44px',
      },
      // NativeWind 2 drops any letterSpacing that is not a plain number, so em
      // values never reached React Native. Absolute values, sized for the role.
      letterSpacing: {
        eyebrow: '0.9px',   // 0.08em at 11 px
        wide: '1.4px',      // 0.12em at 12 px — counters, tags
        tight: '-0.3px',    // 0.01em at 24–30 px
        tighter: '-0.8px',  // 0.02em at 40 px
      },
    },
  },
  plugins: [],
}
