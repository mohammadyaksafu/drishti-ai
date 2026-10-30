/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand: a deep violet that reads as "infrastructure intelligence"
        // rather than consumer app, with a magenta used only for emphasis.
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        magenta: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3' },
        // The dark surfaces used for the hero, footer and page headers.
        night: {
          700: '#2a2d55',
          800: '#1a1c3a',
          900: '#11122b',
          950: '#0a0b1d',
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
          DEFAULT: '#14152b',
          soft: '#3d4060',
          muted: '#6b6f8a',
          line: '#e4e5ef',
        },
        canvas: '#f6f6fb',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,21,43,0.04), 0 2px 12px rgba(20,21,43,0.04)',
        lift: '0 2px 4px rgba(20,21,43,0.04), 0 16px 40px -8px rgba(20,21,43,0.14)',
        glow: '0 0 0 1px rgba(139,92,246,0.25), 0 12px 40px -8px rgba(124,58,237,0.45)',
        'btn-primary':
          'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(46,16,101,0.3), 0 6px 16px -6px rgba(76,29,149,0.55)',
      },
      borderRadius: { xl2: '1.25rem' },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 55%, #2e1065 100%)',
        'accent-gradient': 'linear-gradient(90deg, #a78bfa 0%, #e879f9 100%)',
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
