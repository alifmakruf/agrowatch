import apiClient from './client';

export async function registerApi(data) {
    const response = await apiClient.post('/register', data);
    return response.data;
}

export async function loginApi(credentials) {
    const response = await apiClient.post('/login', credentials);
    return response.data;
}

export async function guestApi(payload) {
    // payload opsional { name, email } -- dipakai saat guest session dibuat
    // dari alur Google Login (lihat loginWithGoogle di AppDataContext) supaya
    // akun tamu yang dibuat backend tidak selalu bernama generik
    // "Tamu (Guest ####)", melainkan memakai nama asli dari profil Google
    // jika endpoint backend /guest menerima & menyimpan field ini.
    const response = await apiClient.post('/guest', payload || {});
    return response.data;
}

export async function getUserApi() {
    const response = await apiClient.get('/user');
    return response.data;
}

export async function logoutApi() {
    const response = await apiClient.post('/logout');
    return response.data;
}
