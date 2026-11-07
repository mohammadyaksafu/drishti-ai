/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand: the bottle green of the Bangladesh flag (#006a4e at 700),
        // with the flag's red sun (kept under the `magenta` key) for emphasis.
        brand: {
          50: '#eefbf4',
          100: '#d5f5e3',
          200: '#aeeacb',
          300: '#78d8ac',
          400: '#3fbe88',
          500: '#1ba06d',
          600: '#0c8158',
          700: '#006a4e',
          800: '#05543f',
          900: '#064535',
          950: '#02271d',
        },
        magenta: { 300: '#ff8a98', 400: '#ff5a6e', 500: '#f42a41', 600: '#d41a30' },
        // The dark surfaces used for the hero, footer and page headers.
        night: {
          700: '#123a2e',
          800: '#0b2a21',
          900: '#071d17',
          950: '#04120e',
        },
        // Severity palette. These four are used everywhere: badges, markers,
        // charts, the annotated image, so the same colour always means the same thing.
        sev: {
          low: '#16a34a',
          moderate: '#f59e0b',
          high: '#ea580c',
          critical: '#dc2626',
        },
        ink: {
          DEFAULT: '#0f1f19',
          soft: '#3a4d45',
          muted: '#66786f',
          line: '#e1e8e4',
        },
        canvas: '#f4f8f6',
      },
      fontFamily: {
        // Latin glyphs come from the first font, Bangla glyphs fall through to
        // the Bengali face, so mixed text renders well in either language.
        display: ['"Space Grotesk"', '"Baloo Da 2"', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Hind Siliguri"', 'system-ui', '-apple-system', 'sans-serif'],
        bangla: ['Galada', '"Baloo Da 2"', 'cursive'],
        mono: ['"JetBrains Mono"', '"Hind Siliguri"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,21,43,0.04), 0 2px 12px rgba(20,21,43,0.04)',
        lift: '0 2px 4px rgba(20,21,43,0.04), 0 16px 40px -8px rgba(20,21,43,0.14)',
        glow: '0 0 0 1px rgba(27,160,109,0.3), 0 12px 40px -8px rgba(0,106,78,0.55)',
        'btn-primary':
          'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(2,39,29,0.35), 0 6px 16px -6px rgba(0,106,78,0.6)',
      },
      borderRadius: { xl2: '1.25rem' },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0c8158 0%, #006a4e 55%, #064535 100%)',
        'accent-gradient': 'linear-gradient(90deg, #5ee0a5 0%, #ff5a6e 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        scan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
        shimmer: 'shimmer 1.6s infinite',
        scan: 'scan 3.2s ease-in-out infinite alternate',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
