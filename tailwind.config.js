/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1A6DFF',
          light: '#5C9BFF',
          glow: 'rgba(26, 109, 255, 0.35)',
          dark: '#0e4cd1'
        },
        dark: {
          950: '#03060D',
          900: '#070D1A',
          850: '#0C1426',
          800: '#111B33',
          700: '#1A2747',
          600: '#26375E'
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(26, 109, 255, 0.2)' },
          '100%': { boxShadow: '0 0 30px rgba(92, 155, 255, 0.6)' }
        }
      }
    },
  },
  plugins: [],
}
