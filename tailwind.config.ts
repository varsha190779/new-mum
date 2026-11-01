import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F6F3",
        panel: "#FFFFFF",
        ink: { DEFAULT: "#0C100D", 2: "#3A413C", 3: "#6B726D", 4: "#9AA09B" },
        line: { DEFAULT: "#E6E6E0", 2: "#D5D5CD" },
        accent: { DEFAULT: "#1E8A4C", dark: "#146B39", soft: "#E7F3EB", mid: "#9FD1B3" },
        warn: "#B4572F",
      },
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(12,16,13,0.03), 0 12px 32px -16px rgba(12,16,13,0.10)",
        soft: "0 1px 2px rgba(12,16,13,0.05)",
      },
      borderRadius: { panel: "24px" },
    },
  },
  plugins: [],
};
export default config;
