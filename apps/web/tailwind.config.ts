import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic surfaces (light corporate)
        ink: {
          950: "#f4f6f9",
          900: "#e9eef4",
          800: "#ffffff",
          700: "#f0f3f7",
          600: "#d7dee8",
        },
        teal: {
          300: "#0f766e",
          400: "#0d6e6e",
          500: "#0b5f5f",
          600: "#084848",
        },
        sand: {
          100: "#0b1f33",
          200: "#1a3348",
          400: "#5b6b7c",
        },
        navy: {
          800: "#13293d",
          900: "#0b1f33",
        },
        signal: {
          late: "#c23b2a",
          warn: "#b8860b",
          ok: "#1f7a4d",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgba(13,110,110,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(13,110,110,0.05) 1px, transparent 1px)",
        "hero-glow":
          "linear-gradient(180deg, #e8eef5 0%, #f4f6f9 42%, #f4f6f9 100%)",
        "corp-band":
          "linear-gradient(90deg, #0b1f33 0%, #0d6e6e 100%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(11, 31, 51, 0.04), 0 1px 3px rgba(11, 31, 51, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
