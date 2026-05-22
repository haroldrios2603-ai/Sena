/**
 * Archivo fuente que requiere comentarios descriptivos.
 */
/**
 * Constante SETTINGS_UPDATED_EVENT utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante SETTINGS_UPDATED_EVENT utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante SETTINGS_UPDATED_EVENT utilizada en la configuración o la lógica de utils.
 */
export const SETTINGS_UPDATED_EVENT = 'rmparking:settings-updated';

/**
 * Constante announceSettingsUpdated utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante announceSettingsUpdated utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante announceSettingsUpdated utilizada en la configuración o la lógica de utils.
 */
export const announceSettingsUpdated = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
};
