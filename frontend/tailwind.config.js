/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: {
          700: '#0369a1',
          800: '#075985',
        },
      },
    },
  },
  plugins: [],
}