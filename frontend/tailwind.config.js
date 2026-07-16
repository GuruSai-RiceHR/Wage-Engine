/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Outfit"', 'sans-serif'],
        outfit: ['"Outfit"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a2ff',
          500: '#5374ff',
          600: '#2b47fc',
          700: '#1d2ee6',
          800: '#1925bb',
          900: '#1a2494',
        }
      }
    },
  },
  plugins: [],
}
