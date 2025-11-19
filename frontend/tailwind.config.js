import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pp-bg': '#050816',
        'pp-surface': '#0B1020',
        'pp-primary': '#35D07F',
        'pp-secondary': '#8B5CF6',
        'pp-highlight': '#F97316',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(53, 208, 127, 0.35)',
        'glow-purple': '0 0 25px rgba(139, 92, 246, 0.35)',
      },
      backgroundImage: {
        'pp-radial': 'radial-gradient(circle at top, rgba(53,208,127,0.25), transparent 55%)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 0.8 },
          '50%': { opacity: 1 },
        },
        'deal-card': {
          '0%': { transform: 'translateY(-20px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'flip-card': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite',
        'deal-card': 'deal-card 0.35s ease-out forwards',
        'flip-card': 'flip-card 0.25s ease-in forwards',
      },
    },
  },
  plugins: [],
}

export default config
