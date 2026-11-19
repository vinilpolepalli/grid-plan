import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent: signal red. Deliberate choice: a high-voltage / engineering-safety
        // read suited to a power-infrastructure tool. It is a true red (#b91c1c), distinct
        // from the sibling wine-crimson #9f1239 and from every other sibling accent, and
        // stays out of the indigo/violet band. Hover is the darker #991b1b.
        signal: { DEFAULT: '#b91c1c', hover: '#991b1b' },
        ink: { DEFAULT: '#18181b', soft: '#52525b', faint: '#71717a' },
        hair: '#e4e4e7',
        ground: '#fcfcfd',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { btn: '8px', card: '10px', field: '8px' },
    },
  },
  plugins: [],
};
export default config;
