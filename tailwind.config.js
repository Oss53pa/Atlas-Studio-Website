/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Anthracite — neutral dark grey scale (replaces former midnight navy).
        onyx: '#15171C',
        ink: {
          DEFAULT: '#1F2128',
          50: '#1F2128',
          100: '#232629',
          200: '#2A2D34',
          300: '#353940',
          400: '#3D414A',
          500: '#474C56',
        },
        // PRIMARY ACCENT — Emerald (replaces former gold visually).
        // Class names kept as `gold-*` so existing components continue to work,
        // but values now resolve to emerald shades.
        gold: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          light: '#34D399',
          dark: '#059669',
          deep: '#047857',
        },
        // SECONDARY ACCENT — Champagne / cream — used for "Atlas Studio" brand wordmark.
        champagne: {
          DEFAULT: '#F5E6D3',
          50: '#FAF5EC',
          100: '#F5E6D3',
          200: '#EDD7B5',
          300: '#E8D4B8',
          400: '#D9BC8F',
          500: '#C8A672',
          600: '#A88753',
          light: '#FAF0E0',
          dark: '#E8D4B8',
        },
        teal: {
          DEFAULT: '#10B981',
          glow: '#34D399',
        },
        warm: {
          bg: '#FAFAF8',
          card: '#FFFFFF',
          border: '#E8E6E1',
        },
        dark: {
          bg: '#1F2128',
          bg2: '#232629',
          bg3: '#2A2D34',
          bg4: '#353940',
          border: '#3D414A',
          border2: '#474C56',
          border3: '#5A606C',
        },
        admin: {
          bg: '#1F2128',
          surface: '#2A2D34',
          'surface-alt': '#353940',
          accent: '#10B981',
          'accent-dark': '#047857',
          text: '#F5F5F5',
          muted: '#888888',
          success: '#10B981',
          error: '#C62828',
          warning: '#E65100',
          info: '#1A73E8',
        },
        neutral: {
          text: '#1A1A1A',
          body: '#525252',
          muted: '#94A3B8',
          placeholder: '#B5C0CD',
          light: '#F5F5F5',
        },
      },
      fontFamily: {
        body: ["'Exo 2'", 'sans-serif'],
        inter: ["'Inter'", 'sans-serif'],
        logo: ["'Grand Hotel'", 'cursive'],
        mono: ["'JetBrains Mono'", 'monospace'],
        display: ["'Inter'", "'Exo 2'", 'sans-serif'],
      },
      maxWidth: {
        site: '1180px',
      },
      boxShadow: {
        'gold-sm': '0 2px 8px rgba(16, 185, 129, 0.22), 0 0 0 1px rgba(16, 185, 129, 0.10)',
        'gold': '0 6px 24px rgba(16, 185, 129, 0.30), 0 0 0 1px rgba(16, 185, 129, 0.18)',
        'gold-lg': '0 12px 48px rgba(16, 185, 129, 0.38), 0 0 0 1px rgba(16, 185, 129, 0.22)',
        'gold-glow': '0 0 32px rgba(16, 185, 129, 0.30), 0 0 64px rgba(16, 185, 129, 0.18)',
        'premium': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 32px -4px rgba(0,0,0,0.6), 0 2px 8px -2px rgba(0,0,0,0.4)',
        'premium-lg': '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 56px -12px rgba(0,0,0,0.8), 0 8px 24px -8px rgba(0,0,0,0.5)',
        'inset-highlight': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        // Emerald 5-stop gradient — premium luxe shimmer
        'gradient-gold': 'linear-gradient(135deg, #047857 0%, #10B981 35%, #6EE7B7 50%, #10B981 65%, #047857 100%)',
        'gradient-gold-soft': 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(52,211,153,0.06) 100%)',
        // Champagne for brand wordmark
        'gradient-champagne': 'linear-gradient(135deg, #C8A672 0%, #E8D4B8 35%, #FAF0E0 50%, #E8D4B8 65%, #C8A672 100%)',
        'gradient-ink': 'linear-gradient(180deg, #1F2128 0%, #232629 100%)',
        'gradient-ink-radial': 'radial-gradient(ellipse at top, #2A2D34 0%, #1F2128 60%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'gradient-card-hover': 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-border': 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-border-gold': 'linear-gradient(180deg, rgba(16,185,129,0.50) 0%, rgba(16,185,129,0.05) 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      animation: {
        'page-enter': 'pageEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2.8s infinite',
        'shimmer-slow': 'shimmer 4.5s infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'aurora': 'aurora 18s ease-in-out infinite',
      },
      keyframes: {
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        gradientX: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate3d(-10%, -5%, 0) scale(1)', opacity: '0.55' },
          '50%': { transform: 'translate3d(10%, 5%, 0) scale(1.15)', opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
};
