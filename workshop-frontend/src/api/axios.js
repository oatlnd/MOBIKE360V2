import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = localStorage.getItem('api_url') || import.meta.env.VITE_API_URL || 'https://mobike360.com/backend/api';

const STORAGE_BASE = API_BASE.replace(/\/api$/, '/storage');

/**
 *
 * @param {string|null} path - Relative path stored in DB e.g. "inventory/abc.png"
 * @returns {string|undefined}
 */
export const storageUrl = (path) => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        const match = path.match(/\/storage\/(.+)$/);
        if (match) return `${STORAGE_BASE}/${match[1]}`;
        return path;
    }
    return `${STORAGE_BASE}/${path}`;
};

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.config?.skipAuthToast) {
            return Promise.reject(error);
        }
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    break;
                case 403:
                    toast.error('You do not have permission.', { id: 'permission-error' });
                    break;
                case 422:
                    const errors = error.response.data.errors;
                    Object.values(errors).forEach(msg => toast.error(msg[0]));
                    break;
                default:
                    toast.error(error.response.data.message || 'An error occurred');
            }
        } else {
            toast.error('Network error. Please check your connection.', { id: 'network-error' });
        }
        return Promise.reject(error);
    }
);

export default api;