/**
 * Archivo fuente que requiere comentarios descriptivos.
 */
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/auth.service';
import { AuthContext } from './authContextInstance';
import type { User } from './types';

let authBootstrapStarted = false;

// Proveedor de Autenticación.
// Mantiene el estado del usuario, maneja inicio/cierre de sesión y expiración de sesión en localStorage.
const SESSION_DURATION_MS = 10 * 60 * 60 * 1000;
const TOKEN_STORAGE_KEY = 'token';
const SESSION_EXPIRES_AT_KEY = 'session_expires_at';

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Constante AuthProvider utilizada en la configuración o la lógica de context.
 */
/**
 * Constante AuthProvider utilizada en la configuración o la lógica de context.
 */
/**
 * Constante AuthProvider utilizada en la configuración o la lógica de context.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Limpia la información de sesión almacenada en localStorage.
    const clearSessionStorage = () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    };

    // Establece la expiración de sesión (para cerrar sesión automáticamente tras duración definida).
    const setSessionExpiration = () => {
        const expiresAt = Date.now() + SESSION_DURATION_MS;
        localStorage.setItem(SESSION_EXPIRES_AT_KEY, String(expiresAt));
    };

    // Comprueba si la sesión ha expirado comparando la marca temporal almacenada.
    const isSessionExpired = () => {
        const expiresAtRaw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
        if (!expiresAtRaw) {
            return true;
        }

        const expiresAt = Number(expiresAtRaw);
        if (!Number.isFinite(expiresAt)) {
            return true;
        }

        return Date.now() >= expiresAt;
    };

    // Inicializa el estado de autenticación al montar el proveedor.
    useEffect(() => {
        if (authBootstrapStarted) {
            return;
        }

        authBootstrapStarted = true;

        const initAuth = async () => {
            const token = localStorage.getItem(TOKEN_STORAGE_KEY);
            if (token) {
                if (isSessionExpired()) {
                    clearSessionStorage();
                    setUser(null);
                    setLoading(false);
                    return;
                }

                try {
                    const res = await authService.getProfile();
                    setUser(res.data);
                } catch (error) {
                    console.error('Auth init failed', error);
                    clearSessionStorage();
                }
            }
            setLoading(false);
        };

        void initAuth();
    }, []);

    // Efecto que programa el cierre automático cuando la sesión expire.
    useEffect(() => {
        if (!user) {
            return;
        }

        const expiresAtRaw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
        if (!expiresAtRaw) {
            clearSessionStorage();
            setUser(null);
            return;
        }

        const expiresAt = Number(expiresAtRaw);
        if (!Number.isFinite(expiresAt)) {
            clearSessionStorage();
            setUser(null);
            return;
        }

        const remainingMs = expiresAt - Date.now();
        if (remainingMs <= 0) {
            clearSessionStorage();
            setUser(null);
            return;
        }

        // ES: Programamos el cierre automático para forzar nueva autenticación al superar 10 horas.
        const timeoutId = window.setTimeout(() => {
            authService
                .logout()
                .catch(() => {
                    /* Ignorar errores para asegurar cierre local */
                })
                .finally(() => {
                    clearSessionStorage();
                    setUser(null);
                });
        }, remainingMs);

        return () => window.clearTimeout(timeoutId);
    }, [user]);

    // Manejo de login: almacena token y estado de usuario.
    const login = (token: string, userData: User) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        setSessionExpiration();
        setUser(userData);
    };

    // Manejo de logout: intenta cerrar sesión en servidor y limpia estado local.
    const logout = () => {
        authService
            .logout()
            .catch(() => {
                /* Ignorar errores para asegurar cierre local */
            })
            .finally(() => {
                clearSessionStorage();
                setUser(null);
            });
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
