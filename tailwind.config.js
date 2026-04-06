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
        teal: '#1D9E75',
        warm: {
          bg: '#FAFAF8',
          card: '#FFFFFF',
          border: '#E8E6E1',
        },
        dark: {
          bg: '#0a0a0a',
          bg2: '#111111',
          bg3: '#1a1a1a',
          border: '#2a2a2a',
          border2: '#333333',
        },
        admin: {
          bg: '#0A0A0A',
          surface: '#1E1E2E',
          'surface-alt': '#2A2A3A',
          accent: '#EF9F27',
          'accent-dark': '#C47E00',
          text: '#F5F5F5',
          muted: '#888888',
          success: '#2E7D32',
          error: '#C62828',
          warning: '#E65100',
          info: '#1A73E8',
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
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      maxWidth: {
        site: '1100px',
      },
      animation: {
        'page-enter': 'pageEnter 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        shimmer: 'shimmer 2.5s infinite',
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
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
