/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./src/sidepanel/**/*.{html,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        douyin: {
          dark: '#161823',
          red: '#FE2C55',
          cyan: '#25F4EE',
          card: '#1F2232',
          border: '#2E3245'
        }
      }
    },
  },
  plugins: [],
}
