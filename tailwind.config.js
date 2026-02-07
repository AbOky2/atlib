/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAFB",
        surface: "#FFFFFF",
        text: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",

        primary: "#7A1E3A",
        primaryDark: "#5F162D",
        primarySoft: "#F8E9EF",

        accent: "#C8A24A",
        accentSoft: "#FFF3D6",

        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#2563EB",
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};
