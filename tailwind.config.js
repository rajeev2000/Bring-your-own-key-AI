// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'bg-app': '#050505',
        'card-app': '#111111',
        'accent-app': '#3b82f6',
        'border-app': '#1a1a1a',
      },
    },
  },
  plugins: [],
};
