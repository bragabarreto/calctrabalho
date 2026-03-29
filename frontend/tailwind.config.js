/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primaria: {
          DEFAULT: '#1a3a5c',
          hover: '#0f2540',
        },
        secundaria: '#c8a96e',
        acento: '#2d6a4f',
        fundo: '#f4f1eb',
        monetario: '#1a3a5c',
      },
      fontFamily: {
        titulo: ['"Playfair Display"', 'serif'],
        corpo: ['"Source Sans Pro"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};
