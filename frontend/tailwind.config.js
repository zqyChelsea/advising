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
        primary: '#8EB19D',
        primaryDark: '#7B9D8A',
        secondary: '#6B8E7B',
        background: '#F2F4F2',
        text: '#5D6D7E',
        dark: {
          bg: '#1a1a2e',
          card: '#16213e',
          border: '#2d3748',
          text: '#e2e8f0',
          muted: '#a0aec0',
        }
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out forwards',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(-20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
