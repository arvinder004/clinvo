import axios from 'axios';
import { getToken, clearToken } from './auth';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const baseURL = String(rawBaseUrl).replace(/\/+$/, '');

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(undefined, (err) => {
  if (err.response?.status === 401) {
    clearToken();
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export default api;
