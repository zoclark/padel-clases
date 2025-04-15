/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-white",
    "text-black",
    "hover:bg-gray-200",
    "shadow-md",
    "rounded",
    "border",
    "border-gray-300"
  ],
  theme: {
    extend: {
      animation: {
        'gradient-x': 'gradientX 6s ease infinite',
      },
      keyframes: {
        gradientX: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}