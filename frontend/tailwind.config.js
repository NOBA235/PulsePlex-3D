/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cardio: {
          dark: '#090d16',
          card: '#111827',
          border: '#1f2937',
          accent: '#3b82f6',
          danger: '#ef4444',
          warning: '#eab308',
          success: '#22c55e',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'heartbeat': 'heartbeat 1.2s ease-in-out infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.08)' },
          '30%': { transform: 'scale(1.02)' },
          '45%': { transform: 'scale(1.06)' },
        }
      }
    },
  },
  plugins: [],
}

