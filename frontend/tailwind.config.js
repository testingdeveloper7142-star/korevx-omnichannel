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
        darkBg: '#030508',
        cardBg: '#05080F',
        kxCyan: '#00F0FF',
        kxEmerald: '#10B981',
        kxAmber: '#F59E0B',
        kxRose: '#EF4444',
      },
      fontFamily: {
        tech: ['Space Grotesk', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
