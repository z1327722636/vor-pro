import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        valorant: {
          red: "#FF4655",
          navy: "#0F1923",
          blue: "#94d2ff",
          ink: "#0A0E13",
          panel: "#13141B",
          panel2: "#1C1F2A",
          text: "#ECE8E1",
          muted: "#9BA0A6"
        }
      },
      boxShadow: {
        neon: "0 0 24px rgba(255,70,85,0.35)",
        blueNeon: "0 0 24px rgba(148,210,255,0.25)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
