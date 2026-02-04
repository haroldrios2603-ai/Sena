import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/useAuth';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import '../features/auth/login.css';

type AuthErrorResponse = {
    message?: string;
};

const getErrorMessage = (error: unknown) => {
    if (isAxiosError<AuthErrorResponse>(error)) {
        return error.response?.data?.message || 'Credenciales inválidas o error en el servidor';
    }
    return 'Credenciales inválidas o error en el servidor';
};

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
    // Estados dedicados al flujo de recuperación de contraseña
    const [isRecoveryVisible, setIsRecoveryVisible] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
    const [recoveryMessage, setRecoveryMessage] = useState('');
    const [isSendingRecovery, setIsSendingRecovery] = useState(false);
    const [isConfirmingRecovery, setIsConfirmingRecovery] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    /**
     * ES: Maneja el inicio de sesión tradicional.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const data = await authService.login(email, password);
            const profileRes = await authService.getProfile();
            login(data.accessToken, profileRes.data);
            navigate('/dashboard');
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * ES: Envía solicitud para generar código de recuperación, exige un correo previo.
     */
    const handleSendRecoveryCode = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setError('');
        setRecoveryMessage('');

        if (!email) {
            setError('Ingresa tu correo antes de solicitar la recuperación.');
            return;
        }

        setIsSendingRecovery(true);
        try {
            await authService.requestPasswordReset(email);
            setRecoveryEmail(email);
            setIsRecoveryVisible(true);
            setRecoveryMessage('Hemos enviado un código de confirmación a tu correo.');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSendingRecovery(false);
        }
    };

    /**
     * ES: Confirma el código ingresado y aplica la nueva contraseña.
     */
    const handleConfirmRecovery = async () => {
        if (!recoveryCode || !recoveryNewPassword) {
            setError('Debes ingresar el código y la nueva contraseña.');
            return;
        }

        setIsConfirmingRecovery(true);
        setError('');
        try {
            await authService.confirmPasswordReset(recoveryEmail || email, recoveryCode, recoveryNewPassword);
            setRecoveryMessage('Tu contraseña se actualizó correctamente. Inicia sesión con la nueva clave.');
            setRecoveryCode('');
            setRecoveryNewPassword('');
            setIsRecoveryVisible(false);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsConfirmingRecovery(false);
        }
    };

    /**
     * ES: Permite abandonar el flujo de recuperación y limpiar campos.
     */
    const handleCancelRecovery = () => {
        setIsRecoveryVisible(false);
        setRecoveryCode('');
        setRecoveryNewPassword('');
        setRecoveryMessage('');
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

                    <div className="recovery-link-wrapper">
                        <a
                            href="#recuperar"
                            className="recovery-link"
                            onClick={handleSendRecoveryCode}
                        >
                            ¿Olvidaste tu contraseña?
                        </a>
                        {isSendingRecovery && <span className="recovery-status">Enviando código...</span>}
                    </div>

                    {isRecoveryVisible && (
                        <div className="recovery-section">
                            <p className="recovery-instructions">
                                Ingresa el código que enviamos a {recoveryEmail || email} y define una nueva contraseña segura.
                            </p>
                            <div className="input-group">
                                <label htmlFor="recovery-code">Código de confirmación</label>
                                <div className="input-wrapper">
                                    <input
                                        id="recovery-code"
                                        type="text"
                                        value={recoveryCode}
                                        onChange={(e) => setRecoveryCode(e.target.value)}
                                        placeholder="ABC123"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label htmlFor="recovery-password">Nueva contraseña</label>
                                <div className="input-wrapper">
                                    <input
                                        id="recovery-password"
                                        type="password"
                                        value={recoveryNewPassword}
                                        onChange={(e) => setRecoveryNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="recovery-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={handleConfirmRecovery}
                                    disabled={isConfirmingRecovery}
                                >
                                    {isConfirmingRecovery ? 'Actualizando...' : 'Actualizar contraseña'}
                                </button>
                                <button
                                    type="button"
                                    className="ghost-button"
                                    onClick={handleCancelRecovery}
                                >
                                    Cancelar
                                </button>
                            </div>
                            {recoveryMessage && <p className="recovery-message">{recoveryMessage}</p>}
                        </div>
                    )}

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
