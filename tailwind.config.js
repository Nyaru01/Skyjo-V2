/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'system-ui', 'sans-serif'],
            },
            colors: {
                'skyjo-blue': '#1A4869',
            },
        },
    },
    plugins: [],
}
