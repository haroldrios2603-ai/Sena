import api from '../api';

/**
 * Servicio para manejar llamadas a la API de Autenticación.
 */
const authService = {
    /**
     * Login user and return token.
     * 
     * ES: Iniciar sesión y retornar token.
     */
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.accessToken) {
            localStorage.setItem('token', response.data.accessToken);
        }
        return response.data;
    },

    /**
     * Logout user by removing token.
     * 
     * ES: Cerrar sesión eliminando token.
     */
    logout: () => {
        localStorage.removeItem('token');
    },

    /**
     * Get current user profile.
     * 
     * ES: Obtener perfil del usuario actual.
     */
    getProfile: async () => {
        return api.get('/auth/me');
    }
};

export default authService;
