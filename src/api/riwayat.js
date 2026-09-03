import apiClient from './client';

export async function getRiwayatApi(params) {
    const response = await apiClient.get('/riwayat', { params });
    return response.data;
}

export async function createRiwayatApi(data) {
    const response = await apiClient.post('/riwayat', data);
    return response.data;
}
