/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette active (A/B) — variables CSS ; opacités Tailwind supportées.
        p: {
          bg: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
          surface: 'rgb(var(--c-surface-rgb) / <alpha-value>)',
          'surface-alt': 'rgb(var(--c-surface-alt-rgb) / <alpha-value>)',
          ink: 'rgb(var(--c-ink-rgb) / <alpha-value>)',
          accent: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          'accent-dark': 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          'on-accent': 'rgb(var(--c-on-accent-rgb) / <alpha-value>)',
          text: 'rgb(var(--c-text-rgb) / <alpha-value>)',
          'text-2': 'rgb(var(--c-text-2-rgb) / <alpha-value>)',
          muted: 'rgb(var(--c-muted-rgb) / <alpha-value>)',
          border: 'rgb(var(--c-border-rgb) / <alpha-value>)',
          ok: 'rgb(var(--c-ok-rgb) / <alpha-value>)',
          warn: 'rgb(var(--c-warn-rgb) / <alpha-value>)',
          err: 'rgb(var(--c-err-rgb) / <alpha-value>)',
        },
        // Basculés en clair (palette) — anciennement surfaces sombres.
        onyx: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
          50: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
          100: 'rgb(var(--c-surface-rgb) / <alpha-value>)',
          200: 'rgb(var(--c-surface-alt-rgb) / <alpha-value>)',
          300: 'rgb(var(--c-surface-alt-rgb) / <alpha-value>)',
          400: 'rgb(var(--c-border-rgb) / <alpha-value>)',
          500: 'rgb(var(--c-border-rgb) / <alpha-value>)',
        },
        // PRIMARY ACCENT — Olive sauge (replaces former emerald visually).
        // Class names kept as `gold-*` so existing components continue to work,
        // but values now resolve to olive shades.
        gold: {
          DEFAULT: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          50: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          100: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          200: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          300: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          400: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          500: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          600: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          700: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          800: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          light: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          dark: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          deep: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
        },
        // SECONDARY ACCENT — wordmark « Atlas Studio » → copper foncé (visible sur clair).
        champagne: {
          DEFAULT: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          50: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          100: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          200: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          300: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          400: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          500: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          600: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          light: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          dark: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
        },
        // Remap Tailwind's stock `emerald` + `teal` palettes to olive so that
        // any `emerald-*` / `teal-*` utility used across the app resolves to the
        // Olive Noir accent (the former primary accent was emerald).
        emerald: {
          50: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          100: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          200: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          300: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          400: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          500: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          600: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          700: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          800: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          900: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          950: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
        },
        teal: {
          DEFAULT: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          glow: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          50: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          100: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          200: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          300: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          400: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          500: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          600: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          700: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          800: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          900: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          950: 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
        },
        // Remap stock cool-gray palettes to a single near-neutral CHARCOAL ramp
        // (dark end pinned to the Olive Noir surfaces) so every slate/zinc/gray/stone
        // usage across admin + portal becomes warm-charcoal-cohesive in one shot.
        slate: { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        gray:  { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        zinc:  { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        stone: { 50: '#F5F5F4', 100: '#E9E8E6', 200: '#D6D5D1', 300: '#B9B7B1', 400: '#8E8C86', 500: '#6A6862', 600: '#4C4A46', 700: '#2a2a30', 800: '#212126', 900: '#17171a', 950: '#131316' },
        warm: {
          bg: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
          card: 'rgb(var(--c-surface-rgb) / <alpha-value>)',
          border: 'rgb(var(--c-border-rgb) / <alpha-value>)',
        },
        dark: {
          bg: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
          bg2: 'rgb(var(--c-surface-rgb) / <alpha-value>)',
          bg3: 'rgb(var(--c-surface-alt-rgb) / <alpha-value>)',
          bg4: 'rgb(var(--c-surface-alt-rgb) / <alpha-value>)',
          border: 'rgb(var(--c-border-rgb) / <alpha-value>)',
          border2: 'rgb(var(--c-border-rgb) / <alpha-value>)',
          border3: 'rgb(var(--c-border-rgb) / <alpha-value>)',
        },
        admin: {
          bg: 'rgb(var(--c-bg-rgb) / <alpha-value>)',
          surface: 'rgb(var(--c-surface-rgb) / <alpha-value>)',
          'surface-alt': 'rgb(var(--c-surface-alt-rgb) / <alpha-value>)',
          accent: 'rgb(var(--c-accent-rgb) / <alpha-value>)',
          'accent-dark': 'rgb(var(--c-accent-dark-rgb) / <alpha-value>)',
          text: 'rgb(var(--c-text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--c-muted-rgb) / <alpha-value>)',
          success: 'rgb(var(--c-ok-rgb) / <alpha-value>)',
          error: 'rgb(var(--c-err-rgb) / <alpha-value>)',
          warning: 'rgb(var(--c-warn-rgb) / <alpha-value>)',
          info: '#7E94B8',
        },
        neutral: {
          text: 'rgb(var(--c-text-rgb) / <alpha-value>)',
          body: 'rgb(var(--c-text-2-rgb) / <alpha-value>)',
          muted: 'rgb(var(--c-muted-rgb) / <alpha-value>)',
          placeholder: '#bdbab0',
          light: 'rgb(var(--c-text-rgb) / <alpha-value>)',
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
        'gold-sm': '0 2px 8px rgba(201, 148, 58, 0.22), 0 0 0 1px rgba(201, 148, 58, 0.12)',
        'gold': '0 6px 24px rgba(201, 148, 58, 0.28), 0 0 0 1px rgba(201, 148, 58, 0.20)',
        'gold-lg': '0 12px 48px rgba(201, 148, 58, 0.34), 0 0 0 1px rgba(201, 148, 58, 0.24)',
        'gold-glow': '0 0 32px rgba(201, 148, 58, 0.26), 0 0 64px rgba(201, 148, 58, 0.15)',
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
        'focus-ring': '0 0 0 3px rgba(201,148,58,0.32), 0 0 0 1px rgba(201,148,58,0.55)',
      },
      backgroundImage: {
        // Olive 5-stop gradient — premium feutré shimmer
        'gradient-gold': 'linear-gradient(135deg, var(--c-accent-dark) 0%, var(--c-accent) 35%, #E8C88A 50%, var(--c-accent) 65%, var(--c-accent-dark) 100%)',
        'gradient-gold-soft': 'linear-gradient(135deg, rgba(201,148,58,0.14) 0%, rgba(221,184,118,0.06) 100%)',
        // Cream for brand wordmark
        'gradient-champagne': 'linear-gradient(135deg, #A39E87 0%, #DEDBCF 35%, #FAF9F5 50%, #DEDBCF 65%, #A39E87 100%)',
        'gradient-ink': 'linear-gradient(180deg, #17171a 0%, #1c1c20 100%)',
        'gradient-ink-radial': 'radial-gradient(ellipse at top, #212126 0%, #17171a 60%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'gradient-card-hover': 'linear-gradient(180deg, rgba(201,148,58,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-border': 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-border-gold': 'linear-gradient(180deg, rgba(201,148,58,0.50) 0%, rgba(201,148,58,0.05) 100%)',
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
