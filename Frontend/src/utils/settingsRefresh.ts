export const SETTINGS_UPDATED_EVENT = 'rmparking:settings-updated';

export const announceSettingsUpdated = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
};
