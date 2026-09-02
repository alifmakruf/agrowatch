import axios from 'axios';

const rootUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: `${rootUrl}/api`,
    withCredentials: true,
    // Beberapa versi axios (>=1.6) mendukung opsi ini untuk memaksa
    // pengiriman XSRF header walau request-nya cross-origin. Aman
    // dibiarkan menyala meski versi axios lama akan mengabaikannya.
    withXSRFToken: true,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
});

// Fallback manual: baca cookie XSRF-TOKEN dari document.cookie dan pasang
// sebagai header X-XSRF-TOKEN di setiap request. Ini WAJIB karena axios
// hanya melakukan ini otomatis untuk request same-origin -- frontend
// (localhost:5173) dan backend (localhost:8000) dianggap beda origin
// (port berbeda), jadi mekanisme bawaan axios tidak jalan di sini.
function readCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
}

apiClient.interceptors.request.use((config) => {
    const token = readCookie('XSRF-TOKEN');
    if (token) {
        config.headers['X-XSRF-TOKEN'] = token;
    }
    return config;
});

// Helper untuk inisialisasi Sanctum CSRF Cookie
export async function getCsrfCookie() {
    try {
        await axios.get(`${rootUrl}/sanctum/csrf-cookie`, {
            withCredentials: true,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        });
    } catch (err) {
        console.warn('Gagal memuat csrf-cookie dari server:', err.message);
    }
}

export default apiClient;