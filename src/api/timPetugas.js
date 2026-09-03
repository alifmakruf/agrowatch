import apiClient from './client';

export async function getTimPetugasApi() {
    const response = await apiClient.get('/tim-petugas');
    return response.data;
}

export async function createTimPetugasApi(data) {
    const response = await apiClient.post('/tim-petugas', data);
    return response.data;
}

export async function updateTimPetugasApi(id, data) {
    const response = await apiClient.put(`/tim-petugas/${id}`, data);
    return response.data;
}

export async function deleteTimPetugasApi(id) {
    const response = await apiClient.delete(`/tim-petugas/${id}`);
    return response.data;
}
