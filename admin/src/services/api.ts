import axios from 'axios';
import { auth } from '../lib/firebase';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403) {
      console.error('Admin access required');
    }
    return Promise.reject(err);
  },
);
