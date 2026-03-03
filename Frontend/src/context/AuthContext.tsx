import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/auth.service';
import { AuthContext } from './authContextInstance';
import type { User } from './types';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await authService.getProfile();
                    setUser(res.data);
                } catch (error) {
                    console.error('Auth init failed', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        setUser(userData);
    };

    const logout = () => {
        authService
            .logout()
            .catch(() => {
                /* Ignorar errores para asegurar cierre local */
            })
            .finally(() => {
                setUser(null);
            });
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
