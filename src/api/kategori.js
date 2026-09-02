import apiClient from './client';

export async function getKategorisApi() {
    const response = await apiClient.get('/kategoris');
    return response.data;
}

export async function createKategoriApi(data) {
    const response = await apiClient.post('/kategoris', data);
    return response.data;
}

export async function deleteKategoriApi(id) {
    const response = await apiClient.delete(`/kategoris/${id}`);
    return response.data;
}
