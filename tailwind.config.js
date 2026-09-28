/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        safeline: {
          950: '#0F172A',
          900: '#1E293B',
          800: '#334155',
          700: '#475569',
          100: '#F1F5F9',
          50: '#F8FAFC',
          white: '#FFFFFF',
        }
      },
      backgroundImage: {
        'grid-light': 'linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)',
        'grid-dark': 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.03)',
        'premium-hover': '0 20px 60px -10px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.04)',
        'glow': '0 0 20px -5px rgba(15,23,42,0.05)',
        'glow-blue': '0 0 40px -10px rgba(37,99,235,0.2)',
        'inner-light': 'inset 0 1px 0 0 rgba(255,255,255,0.8)',
      },
      transitionTimingFunction: {
        'cinematic': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
