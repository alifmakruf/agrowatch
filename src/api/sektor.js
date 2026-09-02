import apiClient from './client';

export async function getSektorsApi() {
    const response = await apiClient.get('/sektors');
    return response.data;
}

export async function createSektorApi(data) {
    const response = await apiClient.post('/sektors', data);
    return response.data;
}

export async function updateSektorApi(id, data) {
    const response = await apiClient.put(`/sektors/${id}`, data);
    return response.data;
}

export async function deleteSektorApi(id) {
    const response = await apiClient.delete(`/sektors/${id}`);
    return response.data;
}
