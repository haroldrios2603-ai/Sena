import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/useAuth';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAutoDismiss } from '../hooks/useAutoDismiss';
import { useTranslation } from 'react-i18next';
import '../features/auth/login.css';

type AuthErrorResponse = {
    message?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<AuthErrorResponse>(error)) {
        return error.response?.data?.message || fallback;
    }
    return fallback;
};

/**
 * Componente de Página de Inicio de Sesión.
 * Ofrece una interfaz premium para el acceso de empleados y administradores.
 * Gestiona la validación de credenciales y redirección al Dashboard.
 */
const Login = () => {
    const { t } = useTranslation();
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

    useAutoDismiss(Boolean(error), () => setError(''), 5000);
    useAutoDismiss(Boolean(recoveryMessage), () => setRecoveryMessage(''), 5000);

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
            setError(getErrorMessage(err, t('login.invalidCredentials')));
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

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError(t('login.sendRecoveryRequiresEmail'));
            return;
        }

        setIsSendingRecovery(true);
        try {
            const response = await authService.requestPasswordReset(normalizedEmail);
            setRecoveryEmail(normalizedEmail);
            setIsRecoveryVisible(true);
            const backendMessage = response.data.message || t('login.recoveryCodeSent');
            const debugMessage = response.data.debugCode
                ? ` Codigo de prueba: ${response.data.debugCode}`
                : '';
            setRecoveryMessage(`${backendMessage}${debugMessage}`);
        } catch (err) {
            setError(getErrorMessage(err, t('login.invalidCredentials')));
        } finally {
            setIsSendingRecovery(false);
        }
    };

    /**
     * ES: Confirma el código ingresado y aplica la nueva contraseña.
     */
    const handleConfirmRecovery = async () => {
        if (!recoveryCode || !recoveryNewPassword) {
            setError(t('login.recoveryMissingFields'));
            return;
        }

        setIsConfirmingRecovery(true);
        setError('');
        try {
            await authService.confirmPasswordReset(
                (recoveryEmail || email).trim().toLowerCase(),
                recoveryCode.trim().toUpperCase(),
                recoveryNewPassword,
            );
            setRecoveryMessage(t('login.recoveryUpdated'));
            setRecoveryCode('');
            setRecoveryNewPassword('');
            setIsRecoveryVisible(false);
        } catch (err) {
            setError(getErrorMessage(err, t('login.invalidCredentials')));
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
                    <p>{t('login.brandSubtitle')}</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-header">
                        <h2>{t('login.welcome')}</h2>
                        <p>{t('login.credentialsPrompt')}</p>
                    </div>

                    {error && (
                        <div className="error-banner">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email">{t('login.emailLabel')}</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={20} />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('login.emailPlaceholder')}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">{t('login.passwordLabel')}</label>
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
                            {t('login.forgotPassword')}
                        </a>
                        {isSendingRecovery && <span className="recovery-status">{t('login.sendingCode')}</span>}
                    </div>

                    {isRecoveryVisible && (
                        <div className="recovery-section">
                            <p className="recovery-instructions">
                                {t('login.recoveryInstructions', { email: recoveryEmail || email })}
                            </p>
                            <div className="input-group">
                                <label htmlFor="recovery-code">{t('login.recoveryCodeLabel')}</label>
                                <div className="input-wrapper">
                                    <input
                                        id="recovery-code"
                                        type="text"
                                        value={recoveryCode}
                                        onChange={(e) => setRecoveryCode(e.target.value)}
                                        placeholder={t('login.recoveryCodePlaceholder')}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label htmlFor="recovery-password">{t('login.newPasswordLabel')}</label>
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
                                    {isConfirmingRecovery ? t('login.updating') : t('login.updatePassword')}
                                </button>
                                <button
                                    type="button"
                                    className="ghost-button"
                                    onClick={handleCancelRecovery}
                                >
                                    {t('login.cancel')}
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
                                <span>{t('login.signIn')}</span>
                                <LogIn size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    &copy; 2026 RM Parking. {t('login.rightsReserved')}
                </div>
            </div>
        </div>
    );
};

export default Login;
