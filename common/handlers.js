import { logger } from './logger.js';
import { ThunderbirdAPI } from './api.js';

const withErrorHandling = (handler) => async (request, sendResponse) => {
    try {
        await handler(request, sendResponse);
    } catch (error) {
        logger.error(`Handler error for ${request.action}:`, error);
        sendResponse({ success: false, error: error.message });
    }
};

export const MessageHandlers = {
    getMessageData: withErrorHandling(async (request, sendResponse) => {
        ThunderbirdAPI.validateMessageRequest(request);

        const messageHeader = await browser.messages.get(request.messageId);
        if (!messageHeader) throw new Error(messenger.i18n.getMessage('errorMessageNotFound'));

        const fullMessage = await browser.messages.getFull(request.messageId);
        const attachments = await ThunderbirdAPI.getMessageAttachments(request.messageId, messageHeader, fullMessage);
        const processedAttachments = await ThunderbirdAPI.processAttachments(attachments, request.messageId);

        sendResponse({
            ...fullMessage,
            attachments: processedAttachments
        });
    }),

    getComposeDetails: withErrorHandling(async (request, sendResponse) => {
        if (!request.composeTabId) throw new Error(messenger.i18n.getMessage('errorNoComposeTabId'));

        const details = await browser.compose.getComposeDetails(request.composeTabId);
        const attachments = await browser.compose.listAttachments(request.composeTabId);
        const processedAttachments = await ThunderbirdAPI.processAttachments(attachments);

        sendResponse({
            ...details,
            attachments: processedAttachments
        });
    }),

    getAttachmentData: withErrorHandling(async (request, sendResponse) => {
        if (!request.composeTabId) throw new Error(messenger.i18n.getMessage('errorNoComposeTabId'));

        const tabId = parseInt(request.composeTabId);
        await ThunderbirdAPI.validateComposeTab(tabId);

        const attachments = await browser.compose.listAttachments(tabId);
        if (!attachments?.length) throw new Error(messenger.i18n.getMessage('errorNoAttachmentsFound'));

        const attachment = attachments.find(att => att.id === request.attachmentId);
        if (!attachment) throw new Error(messenger.i18n.getMessage('errorAttachmentNotFound').replace('__%ATTACHMENT_ID%__', request.attachmentId));

        const file = await browser.compose.getAttachmentFile(attachment.id);
        const arrayBuffer = await file.arrayBuffer();

        sendResponse({
            success: true,
            data: arrayBuffer,
            filename: attachment.name,
            contentType: attachment.contentType || 'application/octet-stream'
        });
    }),

    saveComposeAttachment: withErrorHandling(async (request, sendResponse) => {
        const tabId = parseInt(request.composeTabId);
        const data = new Uint8Array(request.data);
        const name = request.name || 'document';

        await browser.compose.removeAttachment(tabId, request.attachmentId);

        let file;
        try {
            file = new File([data], name);
        } catch {
            file = new Blob([data]);
            file.name = name;
        }

        await browser.compose.addAttachment(tabId, { file, name });
        sendResponse({ success: true });
    }),

    getUserInfo: withErrorHandling(async (request, sendResponse) => {
        try {
            const accounts = await browser.accounts.list();
            if (accounts.length > 0) {
                const account = accounts[0];
                const identity = account.identities?.[0];
                
                if (identity && identity.id && identity.name && identity.email) {
                    sendResponse({
                        success: true,
                        userInfo: {
                            id: identity.id,
                            name: identity.name,
                            email: identity.email
                        }
                    });
                    return;
                }
            }
        } catch (error) {
            logger.error('Error fetching user info:', error);
        }

        sendResponse({
            success: false,
            userInfo: {}
        });
    })
};
