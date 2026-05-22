/**
 * Archivo fuente que requiere comentarios descriptivos.
 */
/**
 * Constante DATA_UPDATED_EVENT utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante DATA_UPDATED_EVENT utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante DATA_UPDATED_EVENT utilizada en la configuración o la lógica de utils.
 */
export const DATA_UPDATED_EVENT = 'rmparking:data-updated';

/**
 * Tipo DataUpdatedDetail para definir la estructura de datos utilizada en utils.
 */
/**
 * Tipo DataUpdatedDetail para definir la estructura de datos utilizada en utils.
 */
/**
 * Tipo DataUpdatedDetail para definir la estructura de datos utilizada en utils.
 */
export type DataUpdatedDetail = {
    method?: string;
    url?: string;
    status?: number;
};

/**
 * Constante announceDataUpdated utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante announceDataUpdated utilizada en la configuración o la lógica de utils.
 */
/**
 * Constante announceDataUpdated utilizada en la configuración o la lógica de utils.
 */
export const announceDataUpdated = (detail: DataUpdatedDetail = {}) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent<DataUpdatedDetail>(DATA_UPDATED_EVENT, { detail }));
};
