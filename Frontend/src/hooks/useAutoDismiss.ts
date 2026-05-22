/**
 * Hook React para cerrar notificaciones automáticamente tras un tiempo.
 */
import { useEffect, useRef } from 'react';

/**
 * Cierra automáticamente banners de estado (éxito/error) tras un tiempo.
 */
/**
 * Constante useAutoDismiss utilizada en la configuración o la lógica de hooks.
 */
/**
 * Constante useAutoDismiss utilizada en la configuración o la lógica de hooks.
 */
/**
 * Constante useAutoDismiss utilizada en la configuración o la lógica de hooks.
 */
export const useAutoDismiss = (
    shouldDismiss: boolean,
    onDismiss: () => void,
    delayMs = 5000,
) => {
    const dismissRef = useRef(onDismiss);

    useEffect(() => {
        dismissRef.current = onDismiss;
    }, [onDismiss]);

    useEffect(() => {
        if (!shouldDismiss) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            dismissRef.current();
        }, delayMs);

        return () => window.clearTimeout(timeoutId);
    }, [delayMs, shouldDismiss]);
};
