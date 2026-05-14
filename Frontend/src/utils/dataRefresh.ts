export const DATA_UPDATED_EVENT = 'rmparking:data-updated';

export type DataUpdatedDetail = {
    method?: string;
    url?: string;
    status?: number;
};

export const announceDataUpdated = (detail: DataUpdatedDetail = {}) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent<DataUpdatedDetail>(DATA_UPDATED_EVENT, { detail }));
};
