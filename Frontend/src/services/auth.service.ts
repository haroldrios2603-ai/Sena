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
     * Cerrar sesión del usuario en el servidor y eliminar token local.
     * 
     * ES: Llama al endpoint /auth/logout (protegido) para registrar checkOut,
     * luego elimina el token localmente.
     */
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // ES: Ante error al notificar logout al backend, continuamos limpiando sesión local.
            console.error('Error al cerrar sesión en el servidor', error);
        } finally {
            localStorage.removeItem('token');
        }
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
