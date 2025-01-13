/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#df4090',
          50: '#fdf2f7',
          100: '#fce7f2',
          200: '#fbd0e5',
          300: '#f7aace',
          400: '#f178ac',
          500: '#df4090',
          600: '#cc2672',
          700: '#ad1d5d',
          800: '#8f1b4f',
          900: '#791b45',
          950: '#4b0c27',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 