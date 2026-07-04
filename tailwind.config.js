/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sun: '#FFD166', coral: '#EF476F', aqua: '#06D6A0', sky: '#4CC9F0',
        deep: '#073B4C', cream: '#FFF8E7', card: '#FFFFFF', stone: '#8A857B',
      },
      fontFamily: {
        display: ['"Baloo 2 Variable"', 'system-ui', 'sans-serif'],
        body: ['"Nunito Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '24px', modal: '28px' },
      boxShadow: {
        soft: '0 4px 16px rgba(7,59,76,.08)',
        lift: '0 8px 24px rgba(7,59,76,.14)',
      },
    },
  },
  plugins: [],
};
