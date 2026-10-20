import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a1210",
          900: "#0f1c18",
          800: "#152620",
          700: "#1c332b",
          600: "#2a4a3e",
        },
        teal: {
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
        sand: {
          100: "#f3efe6",
          200: "#e6dfd0",
          400: "#c4b89a",
        },
        signal: {
          late: "#e85d4c",
          warn: "#e3a008",
          ok: "#2f9e6e",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgba(45,212,191,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(45,212,191,0.06) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(45,212,191,0.22), transparent), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(196,184,154,0.12), transparent)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
    },
  },
  plugins: [],
};

export default config;
