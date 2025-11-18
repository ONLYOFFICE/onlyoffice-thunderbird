import { logger } from './logger.js';
import { ApplicationConfig } from './config.js';

const WINDOW_KEYS = {
    MESSAGE: 'msg_',
    COMPOSE: 'compose_'
};

export const WindowManager = {
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

        const defaults = ApplicationConfig.getWindowDefaults();
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

    async openComposeViewer(tab) {
        try {
            await this.open(
                `${WINDOW_KEYS.COMPOSE}${tab.id}`,
                `pages/viewer.html?composeTabId=${tab.id}`
            );
        } catch (error) {
            logger.error("Error opening compose viewer:", error);
        }
    },

    async openMessageViewer(tab) {
        try {
            const messages = await browser.mailTabs.getSelectedMessages(tab.id);
            if (!messages?.messages?.length)
                throw new Error(messenger.i18n.getMessage('errorNoMessageSelected'));

            const message = messages.messages[0];
            await this.open(
                `${WINDOW_KEYS.MESSAGE}${message.id}`,
                `pages/viewer.html?messageId=${message.id}`
            );
        } catch (error) {
            logger.error("Error opening viewer:", error);
        }
    },

    async setupMenus() {
        browser.menus.create({
            id: "openEditor",
            title: messenger.i18n.getMessage("openEditor"),
            contexts: ["message_list"],
            onclick: (info, tab) => this.openMessageViewer(tab)
        });
    },

    async setupActions() {
        if (browser.messageDisplayAction) {
            browser.messageDisplayAction.onClicked.addListener((tab) => 
                this.openMessageViewer(tab)
            );
        } else {
            logger.warn("messageDisplayAction not available");
        }

        if (browser.composeAction) {
            browser.composeAction.onClicked.addListener((tab) => 
                this.openComposeViewer(tab)
            );
        } else {
            logger.warn("composeAction not available");
        }
    }
};
