import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          dark: 'var(--accent-dark)',
        },
        background: 'var(--bg-base)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        indigo: {
          400: 'var(--primary-light)',
          500: 'var(--primary)',
          600: 'var(--primary-dark)',
        },
        purple: {
          500: 'var(--primary)',
          600: 'var(--primary-dark)',
          700: 'var(--primary-dark)',
        },
        amber: {
          400: 'var(--accent-light)',
          500: 'var(--accent)',
        },
        gray: {
          800: 'var(--surface)',
          900: 'var(--bg-base)',
        }
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      }
    },
  },
  plugins: [],
};

export default config;
