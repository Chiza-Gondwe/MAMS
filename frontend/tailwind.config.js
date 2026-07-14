import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: colors.indigo,
        rose: colors.rose,
        fuchsia: colors.fuchsia,
      },
    },
  },
  plugins: [],
}