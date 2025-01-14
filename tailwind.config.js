/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./server/src/**/*.{jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        PRIMARY: '#4F46E5',
        PRIMARY_HOVER: '#6366F1',
        DANGER: '#F87171',
        SUCCESS: '#10a37f',
      }
    }
  },
  plugins: [require('@tailwindcss/forms')],
}