import axios from 'axios';

// Obtener URL del API desde variables de entorno o default local
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

export default api;
