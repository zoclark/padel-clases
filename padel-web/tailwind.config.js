/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  theme: {
    extend: {
      // Tus animaciones personalizadas
      animation: {
        'gradient-x': 'gradientX 6s ease infinite',
      },
      keyframes: {
        gradientX: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },

      // Nuevas extensiones
      colors: {
        primary: '#1F4E79',
        'primary-dark': '#163E60',
        'background-light': '#E8E6E0',
        danger: '#DC2626',
      },

      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
      },
      screens: {
        'menu': '920px',
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
