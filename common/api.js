import { logger } from './logger.js';
import { FileOperations } from './file.js';

const params = new URLSearchParams(window.location.search);
const getMessageId = () => params.get('messageId');
const getComposeTabId = () => params.get('composeTabId');
const sendMessage = (action, data = {}) => browser.runtime.sendMessage({ action, ...data });

const getComposeTabIdInt = () => {
    const id = getComposeTabId();
    return id ? parseInt(id) : null;
};

const getNumericMessageId = () => {
    const id = getMessageId();
    return id ? parseInt(id) : null;
};

export const ThunderbirdAPI = {
    async processAttachments(attachments, messageId = null) {
        if (!attachments?.length) return [];

        return attachments.map(attachment => ({
            ...attachment,
            _messageId: messageId
        }));
    },

    async getMessageAttachments(messageId, messageHeader, message) {
        const attachments = await browser.messages.listAttachments(messageId) 
            || messageHeader.attachments 
            || [];

        if (!attachments.length && message?.parts) {
            logger.debug("Looking for attachments in MIME parts");
            return await FileOperations.findAttachments(message.parts);
        }

        return attachments;
    },

    validateMessageRequest(request) {
        if (typeof request.messageId !== 'number')
            throw new Error('Invalid message ID');
    },

    async validateComposeTab(tabId) {
        await browser.tabs.get(tabId).catch(() => {
            throw new Error(`Invalid compose tab: ${tabId}`);
        });
    },

    async getAttachmentData(file) {
        const composeTabId = getComposeTabIdInt();
        if (composeTabId) {
            const response = await sendMessage('getAttachmentData', {
                composeTabId,
                attachmentId: file.id
            });

            if (!response.success) 
                throw new Error('Failed to get attachment data');
            return response.data;
        }
        
        const messageId = file._messageId || getNumericMessageId();
        if (messageId && file.partName) {
            try {
                const fileBlob = await browser.messages.getAttachmentFile(messageId, file.partName);
                return await fileBlob.arrayBuffer();
            } catch (error) {
                throw new Error(`Failed to get attachment file: ${error.message}`);
            }
        }
        
        throw new Error('Cannot get attachment data: no valid source or message ID');
    },

    async getAttachments() {
        const composeTabId = getComposeTabIdInt();
        if (composeTabId) {
            const details = await sendMessage('getComposeDetails', {
                composeTabId,
                windowId: (await browser.windows.getCurrent()).id
            });

            if (!details?.attachments)
                throw new Error('No attachments found');
            return details.attachments;
        }
        
        const messageId = getNumericMessageId();
        if (messageId) {
            const message = await sendMessage('getMessageData', { messageId });

            if (!message?.attachments)
                throw new Error('No attachments found');
            return message.attachments;
        }
        
        throw new Error('No valid message or compose id');
    },

    async getComposeDetails() {
        return sendMessage('getComposeDetails', {
            composeTabId: getComposeTabIdInt()
        });
    },

    async saveComposeAttachment(attachmentId, data, name, contentType) {
        return sendMessage('saveComposeAttachment', {
            composeTabId: getComposeTabIdInt(),
            attachmentId: parseInt(attachmentId),
            data: Array.from(new Uint8Array(data)),
            contentType,
            name
        });
    }
};
