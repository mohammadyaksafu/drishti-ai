import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'drishti_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({ baseURL: BASE_URL, timeout: 45000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Turn every failure shape into one predictable message the UI can render.
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    }
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Check your connection and try again.'
        : error.request && !error.response
        ? 'Unable to connect to the server. Make sure the API is running.'
        : 'Something went wrong. Try again.');
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status }));
  }
);

const unwrap = (response) => response.data?.data ?? response.data;

/* ------------------------------- auth ------------------------------- */
export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then(unwrap),
  login: (payload) => api.post('/auth/login', payload).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  updateProfile: (payload) => api.put('/auth/me', payload).then(unwrap),
  changePassword: (payload) => api.put('/auth/password', payload).then(unwrap),
};

/* ------------------------------ reports ----------------------------- */
export const reportsApi = {
  create: (formData, onUploadProgress) =>
    api
      .post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      })
      .then(unwrap),
  list: (params) => api.get('/reports', { params }).then(unwrap),
  get: (id) => api.get(`/reports/${id}`).then(unwrap),
  status: (id) => api.get(`/reports/${id}/status`).then(unwrap),
  update: (id, payload) => api.put(`/reports/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/reports/${id}`).then(unwrap),
  retry: (id) => api.post(`/reports/${id}/retry`).then(unwrap),
};

/* ----------------------------- dashboard ---------------------------- */
export const dashboardApi = {
  statistics: () => api.get('/dashboard/statistics').then(unwrap),
  hazards: (params) => api.get('/dashboard/hazards', { params }).then(unwrap),
  map: (params) => api.get('/dashboard/map', { params }).then(unwrap),
  pipeline: () => api.get('/dashboard/pipeline').then(unwrap),
};

/* ------------------------------- admin ------------------------------ */
export const adminApi = {
  users: (params) => api.get('/admin/users', { params }).then(unwrap),
  updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload).then(unwrap),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then(unwrap),
  resolveReport: (id, payload) => api.post(`/admin/reports/${id}/resolve`, payload).then(unwrap),
  deleteReport: (id) => api.delete(`/admin/reports/${id}`).then(unwrap),
  jobs: (params) => api.get('/jobs', { params }).then(unwrap),
};

export const healthApi = { check: () => api.get('/health').then(unwrap) };

export default api;
