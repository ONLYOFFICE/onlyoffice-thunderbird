import { CONFIG } from './config.js';

const WINDOW_KEYS = {
    MESSAGE: 'msg_',
    COMPOSE: 'compose_'
};

export const windowManager = {
    openWindows: new Map(),

    _setupListener(windowKey, windowId) {
        const listener = (id) => {
            if (id === windowId) {
                this.openWindows.delete(windowKey);
                browser.windows.onRemoved.removeListener(listener);
            }
        };

        browser.windows.onRemoved.addListener(listener);
    },

    async open(windowKey, url, options = {}) {
        if (this.openWindows.has(windowKey)) {
            await browser.windows.update(this.openWindows.get(windowKey), { focused: true });
            return null;
        }

        const defaults = CONFIG.getWindowDefaults();
        const window = await browser.windows.create({
            url,
            type: "popup",
            width: options.width || defaults.width,
            height: options.height || defaults.height,
            ...options
        });

        this.openWindows.set(windowKey, window.id);
        this._setupListener(windowKey, window.id);

        return window;
    },

    getMessageId(windowKey) {
        if (!windowKey?.startsWith(WINDOW_KEYS.MESSAGE))
            throw new Error("Invalid window type");
        return parseInt(windowKey.replace(WINDOW_KEYS.MESSAGE, ''), 10);
    }
};

export { WINDOW_KEYS };
