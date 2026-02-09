/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        antey: {
          primary: "#0D9488", // 医疗绿
          secondary: "#0F172A", // 深色背景
          accent: "#3B82F6", // 蓝色点缀
          surface: "#F8FAFC", // 浅色表面
          border: "#E2E8F0",
          gradient: {
            start: "#0D9488",
            end: "#3B82F6",
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        progress: "progress 2s ease-in-out infinite",
        blob: "blob 7s infinite",
        scan: "scan 3s linear infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        progress: {
          "0%": { width: "0%", opacity: "0.3" },
          "50%": { opacity: "1" },
          "100%": { width: "100%", opacity: "0.3" },
        },
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        scan: {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
