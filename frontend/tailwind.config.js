/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF9',
          100: '#FAF7F2',
          200: '#F4EFEA',
          300: '#EFE8DE',
          400: '#DED5C7',
        },
        forest: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          700: '#15803D',
          800: '#166534',
          900: '#1B4332',
          950: '#0B2419',
        },
        spice: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(27, 67, 50, 0.05), 0 2px 6px -1px rgba(27, 67, 50, 0.03)',
        'card': '0 10px 30px -4px rgba(27, 67, 50, 0.08), 0 4px 12px -2px rgba(27, 67, 50, 0.04)',
        'pop': '0 20px 40px -6px rgba(27, 67, 50, 0.12), 0 8px 16px -4px rgba(27, 67, 50, 0.06)',
      }
    },
  },
  plugins: [],
}
