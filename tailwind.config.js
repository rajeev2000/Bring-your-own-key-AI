/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./App.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'bg-app': '#050505',
        'card-app': '#111111',
        'accent-app': '#3b82f6',
        'border-app': '#1a1a1a',
        'orange-primary': '#f97316',
        'blue-primary': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    },
  },
  plugins: [],
};
