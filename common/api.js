import { logger } from './logger.js';
import { ACTIONS } from './constants.js';

import { FileOperations } from './file.js';

const params = new URLSearchParams(window.location.search);
const getMessageId = () => params.get('messageId');
const getComposeTabId = () => params.get('composeTabId');
const sendMessage = (action, data = {}) => browser.runtime.sendMessage({ action, ...data });

const getComposeTabIdInt = () => {
  const id = getComposeTabId();
  return id ? parseInt(id, 10) : null;
};

const getNumericMessageId = () => {
  const id = getMessageId();
  return id ? parseInt(id, 10) : null;
};

export const ThunderbirdAPI = {
  async processAttachments(attachments, messageId = null) {
    if (!attachments?.length) return [];

    return attachments.map((attachment) => ({
      ...attachment,
      _messageId: messageId,
    }));
  },

  async getMessageAttachments(messageId, messageHeader, message) {
    const attachments = await browser.messages.listAttachments(messageId)
            || messageHeader.attachments
            || [];

    if (!attachments.length && message?.parts) {
      logger.debug('Looking for attachments in MIME parts');
      return await FileOperations.findAttachments(message.parts);
    }

    return attachments;
  },

  validateMessageRequest(request) {
    if (typeof request.messageId !== 'number') throw new Error(messenger.i18n.getMessage('errorInvalidMessageId'));
  },

  async validateComposeTab(tabId) {
    await browser.tabs.get(tabId).catch(() => {
      throw new Error(messenger.i18n.getMessage('errorInvalidComposeTab').replace('__%TAB_ID%__', tabId));
    });
  },

  async getAttachmentData(file) {
    const composeTabId = getComposeTabIdInt();
    if (composeTabId) {
      const response = await sendMessage(ACTIONS.GET_ATTACHMENT_DATA, {
        composeTabId,
        attachmentId: file.id,
      });

      if (!response.success) throw new Error(messenger.i18n.getMessage('errorFailedGetAttachmentData'));
      return response.data;
    }

    const messageId = file._messageId || getNumericMessageId();
    if (messageId && file.partName) {
      try {
        const fileBlob = await browser.messages.getAttachmentFile(messageId, file.partName);
        return await fileBlob.arrayBuffer();
      } catch (error) {
        const errMsg = messenger.i18n.getMessage('errorFailedGetAttachmentFile');
        throw new Error(errMsg.replace('__%ERROR%__', error.message));
      }
    }

    throw new Error(messenger.i18n.getMessage('errorCannotGetAttachmentData'));
  },

  async getAttachments() {
    const composeTabId = getComposeTabIdInt();
    if (composeTabId) {
      const details = await sendMessage(ACTIONS.GET_COMPOSE_DETAILS, {
        composeTabId,
        windowId: (await browser.windows.getCurrent()).id,
      });

      if (!details?.attachments) throw new Error(messenger.i18n.getMessage('errorNoAttachmentsFound'));
      return details.attachments;
    }

    const messageId = getNumericMessageId();
    if (messageId) {
      const message = await sendMessage(ACTIONS.GET_MESSAGE_DATA, { messageId });

      if (!message?.attachments) throw new Error(messenger.i18n.getMessage('errorNoAttachmentsFound'));
      return message.attachments;
    }

    throw new Error(messenger.i18n.getMessage('errorNoValidId'));
  },

  async getComposeDetails() {
    return sendMessage(ACTIONS.GET_COMPOSE_DETAILS, {
      composeTabId: getComposeTabIdInt(),
    });
  },

  async saveComposeAttachment(attachmentId, data, name, contentType) {
    return sendMessage(ACTIONS.SAVE_COMPOSE_ATTACHMENT, {
      composeTabId: getComposeTabIdInt(),
      attachmentId: parseInt(attachmentId, 10),
      data: Array.from(new Uint8Array(data)),
      contentType,
      name,
    });
  },
};
