import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/auth.service';
import { AuthContext } from './authContextInstance';
import type { User } from './types';

const SESSION_DURATION_MS = 10 * 60 * 60 * 1000;
const TOKEN_STORAGE_KEY = 'token';
const SESSION_EXPIRES_AT_KEY = 'session_expires_at';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const clearSessionStorage = () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    };

    const setSessionExpiration = () => {
        const expiresAt = Date.now() + SESSION_DURATION_MS;
        localStorage.setItem(SESSION_EXPIRES_AT_KEY, String(expiresAt));
    };

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

    useEffect(() => {
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
        initAuth();
    }, []);

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

    const login = (token: string, userData: User) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        setSessionExpiration();
        setUser(userData);
    };

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
