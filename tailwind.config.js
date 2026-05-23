/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Olive Noir — charcoal feutré + olive sauge (neumorphique sombre)
        onyx: '#0f0f11',
        ink: {
          DEFAULT: '#17171a',
          50: '#17171a',
          100: '#1c1c20',
          200: '#212126',
          300: '#2a2a30',
          400: '#33333a',
          500: '#3d3d45',
        },
        // PRIMARY ACCENT — Olive sauge (replaces former emerald visually).
        // Class names kept as `gold-*` so existing components continue to work,
        // but values now resolve to olive shades.
        gold: {
          DEFAULT: '#A9B57E',
          50: '#F4F6EC',
          100: '#E8ECD3',
          200: '#D6DDB3',
          300: '#C2CC92',
          400: '#B5C07D',
          500: '#A9B57E',
          600: '#8E9A63',
          700: '#74804F',
          800: '#5B6440',
          light: '#C2CC92',
          dark: '#8E9A63',
          deep: '#74804F',
        },
        // SECONDARY ACCENT — Cream / ivoire — used for "Atlas Studio" brand wordmark.
        champagne: {
          DEFAULT: '#ECEAE3',
          50: '#FAF9F5',
          100: '#ECEAE3',
          200: '#DEDBCF',
          300: '#CFCBBB',
          400: '#BAB5A0',
          500: '#A39E87',
          600: '#847F6A',
          light: '#FAF9F5',
          dark: '#DEDBCF',
        },
        // Remap Tailwind's stock `emerald` + `teal` palettes to olive so that
        // any `emerald-*` / `teal-*` utility used across the app resolves to the
        // Olive Noir accent (the former primary accent was emerald).
        emerald: {
          50: '#F4F6EC',
          100: '#E8ECD3',
          200: '#D6DDB3',
          300: '#C2CC92',
          400: '#B5C07D',
          500: '#A9B57E',
          600: '#8E9A63',
          700: '#74804F',
          800: '#5B6440',
          900: '#474F33',
          950: '#2C3120',
        },
        teal: {
          DEFAULT: '#A9B57E',
          glow: '#C2CC92',
          50: '#F4F6EC',
          100: '#E8ECD3',
          200: '#D6DDB3',
          300: '#C2CC92',
          400: '#B5C07D',
          500: '#A9B57E',
          600: '#8E9A63',
          700: '#74804F',
          800: '#5B6440',
          900: '#474F33',
          950: '#2C3120',
        },
        // Remap stock cool-gray palettes to a single near-neutral CHARCOAL ramp
        // (dark end pinned to the Olive Noir surfaces) so every slate/zinc/gray/stone
        // usage across admin + portal becomes warm-charcoal-cohesive in one shot.
        slate: { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        gray:  { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        zinc:  { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        stone: { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        warm: {
          bg: '#FAF9F5',
          card: '#FFFFFF',
          border: '#E5E3DB',
        },
        dark: {
          bg: '#17171a',
          bg2: '#1c1c20',
          bg3: '#212126',
          bg4: '#2a2a30',
          border: '#33333a',
          border2: '#3d3d45',
          border3: '#4a4a52',
        },
        admin: {
          bg: '#17171a',
          surface: '#212126',
          'surface-alt': '#2a2a30',
          accent: '#A9B57E',
          'accent-dark': '#74804F',
          text: '#ECEAE3',
          muted: '#8a8a82',
          success: '#A9B57E',
          error: '#C0635C',
          warning: '#C9924A',
          info: '#7E94B8',
        },
        neutral: {
          text: '#1A1A1A',
          body: '#525252',
          muted: '#9a978c',
          placeholder: '#bdbab0',
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
      // Radius scale (design-system token) — cards lean generous (20–24px)
      borderRadius: {
        '2xl': '1.25rem',   // 20px (was 16) — default card radius
        '3xl': '1.75rem',   // 28px — large feature cards / hero panels
        card: '1.5rem',     // 24px — semantic card token
        pill: '9999px',
      },
      boxShadow: {
        'gold-sm': '0 2px 8px rgba(169, 181, 126, 0.22), 0 0 0 1px rgba(169, 181, 126, 0.12)',
        'gold': '0 6px 24px rgba(169, 181, 126, 0.28), 0 0 0 1px rgba(169, 181, 126, 0.20)',
        'gold-lg': '0 12px 48px rgba(169, 181, 126, 0.34), 0 0 0 1px rgba(169, 181, 126, 0.24)',
        'gold-glow': '0 0 32px rgba(169, 181, 126, 0.26), 0 0 64px rgba(169, 181, 126, 0.15)',
        // Elevation scale (design-system token) — soft, diffuse, neumorphic on charcoal.
        // Light comes from the top: faint top inner highlight + soft, layered drop shadow.
        'elev-1': 'inset 0 1px 0 0 rgba(255,255,255,0.045), 0 1px 2px rgba(0,0,0,0.4)',
        'elev-2': 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 14px -2px rgba(0,0,0,0.5), 0 2px 6px -2px rgba(0,0,0,0.4)',
        'elev-3': 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 16px 36px -10px rgba(0,0,0,0.62), 0 6px 14px -6px rgba(0,0,0,0.45)',
        'elev-4': 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 28px 60px -14px rgba(0,0,0,0.74), 0 10px 24px -10px rgba(0,0,0,0.5)',
        'elev-5': 'inset 0 1px 0 0 rgba(255,255,255,0.07), 0 40px 88px -18px rgba(0,0,0,0.85), 0 14px 30px -12px rgba(0,0,0,0.55)',
        // Aliases kept for existing usages — now resolve to the soft elevation scale.
        'premium': 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 14px -2px rgba(0,0,0,0.5), 0 2px 6px -2px rgba(0,0,0,0.4)',
        'premium-lg': 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 28px 60px -14px rgba(0,0,0,0.74), 0 10px 24px -10px rgba(0,0,0,0.5)',
        'inset-highlight': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
        // Soft neumorphic dual shadow (raised) + inset (pressed)
        'neu': '7px 7px 18px rgba(0,0,0,0.5), -7px -7px 18px rgba(255,255,255,0.022)',
        'neu-sm': '4px 4px 10px rgba(0,0,0,0.42), -4px -4px 10px rgba(255,255,255,0.02)',
        'neu-inset': 'inset 4px 4px 10px rgba(0,0,0,0.5), inset -3px -3px 8px rgba(255,255,255,0.025)',
        'focus-ring': '0 0 0 3px rgba(169,181,126,0.32), 0 0 0 1px rgba(169,181,126,0.55)',
      },
      backgroundImage: {
        // Olive 5-stop gradient — premium feutré shimmer
        'gradient-gold': 'linear-gradient(135deg, #74804F 0%, #A9B57E 35%, #D6DDB3 50%, #A9B57E 65%, #74804F 100%)',
        'gradient-gold-soft': 'linear-gradient(135deg, rgba(169,181,126,0.14) 0%, rgba(194,204,146,0.06) 100%)',
        // Cream for brand wordmark
        'gradient-champagne': 'linear-gradient(135deg, #A39E87 0%, #DEDBCF 35%, #FAF9F5 50%, #DEDBCF 65%, #A39E87 100%)',
        'gradient-ink': 'linear-gradient(180deg, #17171a 0%, #1c1c20 100%)',
        'gradient-ink-radial': 'radial-gradient(ellipse at top, #212126 0%, #17171a 60%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'gradient-card-hover': 'linear-gradient(180deg, rgba(169,181,126,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-border': 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-border-gold': 'linear-gradient(180deg, rgba(169,181,126,0.50) 0%, rgba(169,181,126,0.05) 100%)',
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
