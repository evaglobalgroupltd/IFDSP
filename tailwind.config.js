/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: { extend: {
    colors: { crimson: { DEFAULT: "#991B1B", 600: "#B91C1C", 900: "#5c0f0f" }, navy: { DEFAULT: "#16224A", 900: "#0C1430" }, gold: { DEFAULT: "#C9A227", 300: "#E8CB6E", 600: "#A8841C" }, ivory: "#FAF6EE", ink: "#2D2D2D" },
    fontFamily: { serif: ["\"Playfair Display\"", "Georgia", "Cambria", "Times New Roman", "serif"], sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"] } } },
};
