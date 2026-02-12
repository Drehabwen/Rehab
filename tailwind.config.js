/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        antey: {
          primary: "#0D9488",
          secondary: "#0F172A",
          accent: "#3B82F6",
          surface: "#F8FAFC",
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
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
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
            transform: "translate3d(0px, 0px, 0) scale(1)",
          },
          "33%": {
            transform: "translate3d(30px, -50px, 0) scale(1.1)",
          },
          "66%": {
            transform: "translate3d(-20px, 20px, 0) scale(0.9)",
          },
          "100%": {
            transform: "translate3d(0px, 0px, 0) scale(1)",
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translate3d(0, 10px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translate3d(0, -10px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale3d(0.95, 0.95, 1)" },
          to: { opacity: "1", transform: "scale3d(1, 1, 1)" },
        },
      },
    },
  },
  plugins: [],
};
