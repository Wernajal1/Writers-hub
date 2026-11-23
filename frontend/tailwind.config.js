/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#255640",
        ink: "#17251f",
        mint: "#eef4e9",
        canvas: "#f5f7f4"
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        card: "0 8px 26px rgba(27, 44, 35, .055)"
      }
    }
  },
  plugins: []
};
