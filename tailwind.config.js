/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#111118',
        'surface-hover': '#1A1A24',
        border: '#22222E',
        'border-focus': '#333344',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8A8A9E',
        'text-tertiary': '#5A5A6E',
        accent: '#F59E0B',
        'accent-glow': 'rgba(245, 158, 11, 0.15)',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        demo: '#8B5CF6',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
