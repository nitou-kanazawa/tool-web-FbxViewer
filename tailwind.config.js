/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // <html> の dark クラスで切り替える（src/theme/theme.ts。既定は OS の設定に従う）
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
