import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import '../features/auth/login.css';

/**
 * Componente de Página de Inicio de Sesión.
 * Ofrece una interfaz premium para el acceso de empleados y administradores.
 * Gestiona la validación de credenciales y redirección al Dashboard.
 */
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const data = await authService.login(email, password);
            const profileRes = await authService.getProfile();
            login(data.accessToken, profileRes.data);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Credenciales inválidas o error en el servidor');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-visual-bg"></div>
            <div className="login-card-container">
                <div className="login-brand">
                    <div className="brand-logo">RM</div>
                    <h1>Parking</h1>
                    <p>Gestión Inteligente de Espacios</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-header">
                        <h2>Bienvenido</h2>
                        <p>Ingresa tus credenciales para acceder</p>
                    </div>

                    {error && (
                        <div className="error-banner">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email">Correo Electrónico</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={20} />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ejemplo@rmparking.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Contraseña</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="submit-button" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="loader"></span>
                        ) : (
                            <>
                                <span>Iniciar Sesión</span>
                                <LogIn size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    &copy; 2026 RM Parking. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
};

export default Login;
