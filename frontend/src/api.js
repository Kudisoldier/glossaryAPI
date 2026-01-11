import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const termsAPI = {
  getAll: () => api.get('/terms/'),
  getByKeyword: (keyword) => api.get(`/terms/${encodeURIComponent(keyword)}`),
  create: (data) => api.post('/terms/', data),
  update: (keyword, data) => api.put(`/terms/${encodeURIComponent(keyword)}`, data),
  delete: (keyword) => api.delete(`/terms/${encodeURIComponent(keyword)}`),
};

export const sourcesAPI = {
  getByTerm: (keyword) => api.get(`/sources/term/${encodeURIComponent(keyword)}`),
  create: (keyword, data) => api.post(`/sources/term/${encodeURIComponent(keyword)}`, data),
  delete: (id) => api.delete(`/sources/${id}`),
};

export const relationsAPI = {
  getByTerm: (keyword) => api.get(`/relations/term/${encodeURIComponent(keyword)}`),
  create: (keyword, data) => api.post(`/relations/term/${encodeURIComponent(keyword)}`, data),
  delete: (id) => api.delete(`/relations/${id}`),
};

export const graphAPI = {
  get: () => api.get('/graph/'),
};

export default api;
