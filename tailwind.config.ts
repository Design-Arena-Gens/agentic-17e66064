import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(225 20% 8%)",
        "background-alt": "hsl(225 20% 12%)",
        surface: "hsl(225 24% 18%)",
        "surface-alt": "hsl(225 26% 24%)",
        accent: "hsl(271 91% 62%)",
        "accent-soft": "hsl(271 91% 72%)",
        "accent-strong": "hsl(271 91% 52%)"
      }
    }
  },
  plugins: []
};

export default config;
