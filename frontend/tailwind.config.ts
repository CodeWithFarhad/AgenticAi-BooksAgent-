import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './node_modules/shadcn/ui/dist/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        card: '#18181b',
        accent: '#2563eb',
        glass: 'rgba(24,24,27,0.7)',
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.37)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config; 