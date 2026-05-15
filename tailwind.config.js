/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        medical: {
          cyan: "#5cecff",
          blue: "#2f7cff",
          ink: "#03070d",
        },
      },
      boxShadow: {
        glow: "0 0 32px rgba(92, 236, 255, 0.25)",
        glass: "inset 0 1px 0 rgba(255,255,255,0.18), 0 22px 80px rgba(0,0,0,0.36)",
      },
    },
  },
  plugins: [],
};
