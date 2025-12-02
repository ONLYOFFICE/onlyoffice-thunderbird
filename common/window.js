/**
 *
 * (c) Copyright Ascensio System SIA 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
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
      ...options,
    });

    this.openWindows.set(windowKey, window.id);
    this._setupListener(windowKey, window.id);

    return window;
  },

  async openComposeViewer(tab) {
    try {
      await this.open(
        `${WINDOW_KEYS.COMPOSE}${tab.id}`,
        `pages/viewer.html?composeTabId=${tab.id}`,
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
        { width: 480, height: 280 },
      );
    } catch (error) {
      logger.error('Error opening create viewer:', error);
    }
  },

  async openMessageViewer(tab) {
    try {
      const messages = await browser.mailTabs.getSelectedMessages(tab.id);
      if (!messages?.messages?.length) throw new Error(messenger.i18n.getMessage('errorNoMessageSelected'));

      const message = messages.messages[0];
      await this.open(
        `${WINDOW_KEYS.MESSAGE}${message.id}`,
        `pages/viewer.html?messageId=${message.id}`,
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
            const url = `pages/viewer.html?composeTabId=${tab.id}`
                            + `&attachmentId=${attachment.id}`
                            + `&attachmentName=${encodeURIComponent(filename)}`;
            await this.open(
              `${WINDOW_KEYS.COMPOSE}${tab.id}_${attachment.id}`,
              url,
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
      let idParam = '';
      if (attachment.id) {
        idParam = `attachmentId=${attachment.id}`;
      } else if (attachment.partName) {
        idParam = `attachmentPartName=${encodeURIComponent(attachment.partName)}`;
      }
      await this.open(
        `${WINDOW_KEYS.MESSAGE}${messageId}_${uniqueKey}`,
        `pages/viewer.html?${urlParams}&${idParam}`,
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
      onclick: (info, tab) => this.openMessageViewer(tab),
    });

    browser.menus.create({
      id: 'openAttachment',
      title: messenger.i18n.getMessage('openOnlyoffice'),
      contexts: ['message_attachments', 'all_message_attachments', 'compose_attachments'],
      onclick: (info, tab) => this.openAttachmentViewer(info, tab),
    });

    browser.menus.onShown.addListener(async (info) => {
      if (info.contexts.includes('message_attachments')
          || info.contexts.includes('all_message_attachments')
          || info.contexts.includes('compose_attachments')) {
        const attachments = info.attachments || [];
        let visible = false;

        if (attachments.length === 1) {
          const attachment = attachments[0];
          visible = ApplicationConfig.isSupportedFile(attachment.name);
        }

        await browser.menus.update('openAttachment', {
          visible,
        });
        await browser.menus.refresh();
      }
    });
  },

  _updateMenuIcons(isDark) {
    browser.menus.update('compose_open_editor', {
      icons: { 16: isDark ? 'images/open_dark.svg' : 'images/open.svg' },
    });
    browser.menus.update('compose_create_document', {
      icons: { 16: isDark ? 'images/create_dark.svg' : 'images/create.svg' },
    });
  },

  async setupActions() {
    if (browser.messageDisplayAction) {
      browser.messageDisplayAction.onClicked.addListener((tab) => this.openMessageViewer(tab));
    } else {
      logger.warn('messageDisplayAction not available');
    }

    if (browser.composeAction) {
      const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
      const isDark = mediaQuery?.matches;

      browser.menus.create({
        id: 'compose_open_editor',
        title: messenger.i18n.getMessage('openButton'),
        contexts: ['compose_action_menu'],
        icons: {
          16: isDark ? 'images/open_dark.svg' : 'images/open.svg',
        },
        onclick: (info, tab) => this.openComposeViewer(tab),
      });

      browser.menus.create({
        id: 'compose_create_document',
        title: messenger.i18n.getMessage('createDocument'),
        contexts: ['compose_action_menu'],
        icons: {
          16: isDark ? 'images/create_dark.svg' : 'images/create.svg',
        },
        onclick: (info, tab) => this.openCreateViewer(tab),
      });

      mediaQuery?.addEventListener('change', (e) => {
        this._updateMenuIcons(e.matches);
      });
    } else {
      logger.warn('composeAction not available');
    }
  },
};
