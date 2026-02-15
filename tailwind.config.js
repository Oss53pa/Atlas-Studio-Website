/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        onyx: '#0A0A0A',
        gold: {
          DEFAULT: '#C8A960',
          light: '#D4BC7C',
          dark: '#B89A50',
        },
        warm: {
          bg: '#FAFAF8',
          card: '#FFFFFF',
          border: '#E8E6E1',
        },
        neutral: {
          text: '#1A1A1A',
          body: '#525252',
          muted: '#737373',
          placeholder: '#A3A3A3',
          light: '#F5F5F5',
        },
      },
      fontFamily: {
        body: ["'Exo 2'", 'sans-serif'],
        logo: ["'Grand Hotel'", 'cursive'],
      },
      maxWidth: {
        site: '1200px',
      },
      animation: {
        'page-enter': 'pageEnter 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(32px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
