import { logger } from './logger.js';
import { WINDOW_KEYS } from './constants.js';
import { ApplicationConfig } from './config.js';

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
            type: 'popup',
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
            logger.error('Error opening compose viewer:', error);
        }
    },

    async openCreateViewer(tab) {
        try {
            await this.open(
                `${WINDOW_KEYS.COMPOSE}${tab.id}_create`,
                `pages/create.html?composeTabId=${tab.id}`,
                { width: 450, height: 280 }
            );
        } catch (error) {
            logger.error('Error opening create viewer:', error);
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
            logger.error('Error opening viewer:', error);
        }
    },

    async openAttachmentViewer(info, tab) {
        try {
            const attachments = info.attachments || [];
            if (!attachments.length) {
                logger.error('No attachments found');
                return;
            }

            const attachment = attachments[0];
            const filename = attachment.name;
            if (!ApplicationConfig.isSupportedFile(filename)) {
                logger.debug('Unsupported file format:', filename);
                return;
            }

            try {
                if (tab.id) {
                    const details = await browser.compose.getComposeDetails(tab.id);
                    if (details) {
                        const url = `pages/viewer.html?composeTabId=${tab.id}` +
                            `&attachmentId=${attachment.id}` +
                            `&attachmentName=${encodeURIComponent(filename)}`;
                        await this.open(
                            `${WINDOW_KEYS.COMPOSE}${tab.id}_${attachment.id}`,
                            url
                        );
                        return;
                    }
                }
            } catch (e) {
                logger.error('Error getting compose details:', e);
            }

            let messageId = null;
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                const displayedMessage = await browser.messageDisplay.getDisplayedMessage(activeTab.id);
                if (displayedMessage?.id) messageId = displayedMessage.id;
                if (!messageId) {
                    const messages = await browser.mailTabs.getSelectedMessages(activeTab.id);
                    if (messages?.messages?.length > 0) messageId = messages.messages[0].id;
                }
            }
            
            if (!messageId) {
                logger.error('No message ID available for attachment');
                return;
            }

            const uniqueKey = attachment.id || attachment.partName;
            const urlParams = `messageId=${messageId}&attachmentName=${encodeURIComponent(filename)}`;
            const idParam = attachment.id ? `attachmentId=${attachment.id}` : attachment.partName ? `attachmentPartName=${encodeURIComponent(attachment.partName)}` : '';
            await this.open(
                `${WINDOW_KEYS.MESSAGE}${messageId}_${uniqueKey}`,
                `pages/viewer.html?${urlParams}&${idParam}`
            );
        } catch (error) {
            logger.error('Error opening attachment viewer:', error);
        }
    },

    async setupMenus() {
        browser.menus.create({
            id: 'openEditor',
            title: messenger.i18n.getMessage('openOnlyoffice'),
            contexts: ['message_list'],
            onclick: (info, tab) => this.openMessageViewer(tab)
        });

        browser.menus.create({
            id: 'openAttachment',
            title: messenger.i18n.getMessage('openOnlyoffice'),
            contexts: ['message_attachments', 'all_message_attachments', 'compose_attachments'],
            onclick: (info, tab) => this.openAttachmentViewer(info, tab)
        });
    },

    async setupActions() {
        if (browser.messageDisplayAction) {
            browser.messageDisplayAction.onClicked.addListener((tab) => 
                this.openMessageViewer(tab)
            );
        } else {
            logger.warn('messageDisplayAction not available');
        }

        if (browser.composeAction) {
            browser.menus.create({
                id: 'compose_open_editor',
                title: messenger.i18n.getMessage('openButton'),
                contexts: ['compose_action_menu'],
                onclick: (info, tab) => this.openComposeViewer(tab)
            });
            
            browser.menus.create({
                id: 'compose_create_document',
                title: messenger.i18n.getMessage('createDocument'),
                contexts: ['compose_action_menu'],
                onclick: (info, tab) => this.openCreateViewer(tab)
            });
        } else {
            logger.warn('composeAction not available');
        }
    }
};
