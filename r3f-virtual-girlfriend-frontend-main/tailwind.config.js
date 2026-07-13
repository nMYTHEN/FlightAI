/** @type {import('tailwindcss').Config} */
// Marken-Farben zentral. Zum Re-Branding nur diese Paletten anpassen —
// alle UI-Klassen nutzen `brand-*` / `accent-*` statt fixer Farben.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        // Primär: vertrauenswürdiges Petrol/Teal (weg vom "Girlfriend"-Pink).
        brand: {
          50: "#eefafa",
          100: "#d3f0f1",
          200: "#ace0e3",
          300: "#74c8cc",
          400: "#3aa8ae",
          500: "#1f8b92",
          600: "#127279",
          700: "#125c62",
          800: "#134b50",
          900: "#133f44",
        },
        // Akzent: warmes Bernstein (Sonne/Aufbruch).
        accent: {
          400: "#e5a24a",
          500: "#d9862b",
          600: "#bd6d1c",
        },
      },
    },
  },
  plugins: [],
};
