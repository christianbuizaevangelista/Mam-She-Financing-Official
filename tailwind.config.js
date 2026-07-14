/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // StockUp PH — Red primary (#b91c1c at 600)
        brand: {
          50: '#fdf3f3',
          100: '#fbe5e5',
          200: '#f6cccc',
          300: '#efa3a3',
          400: '#e46d6d',
          500: '#d43d3d',
          600: '#b91c1c',
          700: '#9a1717',
          800: '#7f1616',
          900: '#6a1717',
          950: '#3a0a0a',
        },
        // Gold accent (#f4b942 at 400)
        gold: {
          50: '#fef8ec',
          100: '#fdeecb',
          200: '#fbdd93',
          300: '#f8cb60',
          400: '#f4b942',
          500: '#e9a41f',
          600: '#c98217',
          700: '#a25f16',
          800: '#864b19',
          900: '#723e18',
        },
        cream: '#faf3ea',
        ink: {
          DEFAULT: '#2b1210',
          800: '#3a1b18',
          700: '#4a2622',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
