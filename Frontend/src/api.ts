import axios from 'axios';
import { announceDataUpdated } from './utils/dataRefresh';

// Obtener URL del API desde variables de entorno o valor local por defecto
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Configuración global de la instancia de Axios.
 * Establece la URL base y encabezados por defecto.
 */
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Interceptor de Peticiones para añadir el Token Bearer.
 */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        const method = response.config.method?.toUpperCase();
        if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            announceDataUpdated({
                method,
                url: response.config.url,
                status: response.status,
            });
        }
        return response;
    },
    (error) => Promise.reject(error),
);

export default api;
