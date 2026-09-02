/** @type {import('tailwindcss').Config} */
export default {
    // 'class' -- Tailwind hanya menerapkan style dark:* saat elemen leluhur
    // (di sini: <html>) punya class "dark". Tanpa baris ini, toggle
    // "Mode Tampilan Gelap" di Pengaturan hanya menyimpan boolean ke
    // localStorage tapi TIDAK PERNAH benar-benar mengubah tampilan apa pun --
    // itulah sebabnya fitur ini terasa "tidak fungsional" sebelumnya.
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}