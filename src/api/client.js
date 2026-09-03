import axios from 'axios';

const rawRootUrl = import.meta.env.VITE_API_URL || 'https://backend-perkebunan-tebu-production.up.railway.app';

// Pengaman: kalau VITE_API_URL diisi tanpa skema (mis. cuma
// "xxx.up.railway.app" tanpa "https://" di depan), browser/axios akan
// memperlakukannya sebagai path RELATIF terhadap domain frontend saat ini
// -- request akan salah nyasar ke "https://domain-fe-nya/xxx.up.railway.app/api/..."
// alih-alih ke backend. Ini persis penyebab error 404 yang muncul kalau env
// var di Vercel lupa/salah diisi tanpa "https://". Tambahkan otomatis
// supaya kesalahan konfigurasi seperti ini tidak bikin seluruh API gagal.
const rootUrl = /^https?:\/\//i.test(rawRootUrl) ? rawRootUrl : `https://${rawRootUrl}`;

export const apiClient = axios.create({
    baseURL: `${rootUrl}/api`,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
});

// Autentikasi berbasis token (Bearer), BUKAN lagi cookie/session Sanctum SPA.
//
// SEBELUMNYA project ini pakai cookie-based Sanctum SPA auth (CSRF cookie +
// withCredentials + baca cookie XSRF-TOKEN manual). Itu cuma reliable kalau
// FE & BE satu root domain (mis. app.domain.com & api.domain.com). Karena
// FE (Vercel) & BE (Railway) di domain BEDA tanpa custom domain, cookie
// cross-site semacam itu gampang diblokir browser (Safari ITP, dan makin
// lama makin ketat juga di Chrome) -- efeknya login terlihat sukses tapi
// request berikutnya balik dianggap guest lagi.
//
// Token di header Authorization tidak kena batasan cross-site cookie sama
// sekali, jadi ini yang dipakai sekarang. Token disimpan di localStorage
// supaya sesi tidak hilang saat halaman di-refresh.
const AUTH_TOKEN_STORAGE_KEY = 'agrowatch_auth_token';

let authToken = null;
try {
    authToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || null;
} catch (err) {
    authToken = null;
}

export function setAuthToken(token) {
    authToken = token || null;
    try {
        if (token) {
            localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        } else {
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        }
    } catch (err) {
        console.warn('Gagal menyimpan auth token ke localStorage:', err);
    }
}

export function getAuthToken() {
    return authToken;
}

apiClient.interceptors.request.use((config) => {
    if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return config;
});

export default apiClient;
