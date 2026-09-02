import apiClient from './client';

export async function getLaporanApi(params = {}) {
    const response = await apiClient.get('/laporan', { params });
    return response.data;
}

export async function getLaporanMapApi(params = {}) {
    const response = await apiClient.get('/laporan/map', { params });
    return response.data;
}

export async function getLaporanSummaryApi() {
    const response = await apiClient.get('/laporan/summary');
    return response.data;
}

export async function getLaporanDetailApi(id) {
    const response = await apiClient.get(`/laporan/${id}`);
    return response.data;
}

export async function createLaporanApi(formData) {
    // PENTING: jangan set header Content-Type manual di sini.
    // Axios/browser otomatis menghasilkan header
    // "multipart/form-data; boundary=----WebKitFormBoundary..." saat body
    // berupa FormData. Kalau di-override manual jadi string statis tanpa
    // boundary, Laravel tidak bisa parsing body-nya sama sekali (semua
    // field dianggap kosong -> validasi required gagal -> 422).
    const response = await apiClient.post('/laporan', formData);
    return response.data;
}

export async function updateLaporanStatusApi(id, data) {
    const response = await apiClient.patch(`/laporan/${id}/status`, data);
    return response.data;
}

export async function deleteAllLaporanApi() {
    const response = await apiClient.delete('/laporan');
    return response.data;
}