import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Access environment variable or fallback to localhost
const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? '/api' : 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401s (optional logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export default api;
