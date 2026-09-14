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
        fintonic: {
          mint: "#00D09C",
          "mint-light": "#E6FBF5",
          "mint-dark": "#00A87D",
          coral: "#FF6B6B",
          "coral-light": "#FFEBEB",
          navy: "#0F172A",
          "navy-card": "#1E293B",
          "navy-light": "#334155",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      padding: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      minHeight: {
        screen: "100dvh",
      },
      height: {
        screen: "100dvh",
      },
    },
  },
  plugins: [],
};
export default config;
