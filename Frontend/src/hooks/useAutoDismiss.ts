import { useEffect, useRef } from 'react';

/**
 * Cierra automáticamente banners de estado (éxito/error) tras un tiempo.
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
