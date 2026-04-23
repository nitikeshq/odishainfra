/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF8240',
          orangeLight: 'rgba(255,130,64,0.12)',
          bg: '#010409',
          card: '#0D1117',
          card2: '#161B22',
          surface: '#1A1F26',
          elevated: '#21262D',
          text: '#E6EDF3',
          textSecondary: '#8B949E',
          muted: '#6E7681',
          border: '#1E1E1E',
          borderLight: 'rgba(255,255,255,0.08)',
        },
      },
    },
  },
  plugins: [],
}
