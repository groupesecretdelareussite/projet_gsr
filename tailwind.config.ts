import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#12AA00",
          dark: "#0e8f00",
        },
        secondary: {
          DEFAULT: "#f6b40a",
        },
        dark: "#0b2a10",
        whatsapp: "#25D366",
        background: "#f7f9fb",
        surface: "#f7f9fb",
        "surface-variant": "#e0e3e5",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #12AA00, #0e8f00)",
        "hero-gradient": "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)",
        "grid-pattern": "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", // for the dot pattern in hero
      },
      backgroundSize: {
        "grid-size": "20px 20px",
      }
    },
  },
  plugins: [],
};
export default config;
