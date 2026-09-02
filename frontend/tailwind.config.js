/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#f2ece9',
          100: '#e5d9d3',
          200: '#cbb3a7',
          300: '#bfa899',
          400: '#a78c7c',
          500: '#937B69', // Primary
          600: '#846f5f',
          700: '#6e5c4f',
          800: '#5c4d42',
          900: '#4b3f36',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}