import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1426",
          surface: "#142038",
          border: "#1E2D4A",
        },
        slate: {
          text: "#E8ECF1",
          muted: "#8892A4",
        },
        status: {
          green: "#22C55E",
          amber: "#EAB308",
          red: "#EF4444",
          blue: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
