import { logger } from './common/logger.js';
import { windowManager } from './common/window.js';
import { FileOperations } from './common/file.js';
import {
    processAttachments,
    getMessageAttachments,
    validateMessageRequest,
    validateComposeTab
} from './attachments.js';

export const messageHandlers = {
    async getMessageData(request, sendResponse) {
        try {
            validateMessageRequest(request);

            const messageHeader = await browser.messages.get(request.messageId);
            logger.debug("Message header:", messageHeader);

            if (!messageHeader)
                throw new Error('Message not found');

            const fullMessage = await browser.messages.getFull(request.messageId);
            logger.debug("Full message data:", fullMessage);

            const attachments = await getMessageAttachments(request.messageId, messageHeader, fullMessage);
            const processedAttachments = await processAttachments(attachments, request.messageId);
            logger.debug("Final processed attachments:", processedAttachments);

            sendResponse({
                ...fullMessage,
                attachments: processedAttachments
            });
        } catch (error) {
            logger.error("Error getting message data:", error);
            sendResponse({ error: error.message });
        }
    },

    async getComposeDetails(request, sendResponse) {
        try {
            logger.debug("Getting compose details for tab:", request.composeTabId);

            if (!request.composeTabId)
                throw new Error('No compose tab ID provided');

            const details = await browser.compose.getComposeDetails(request.composeTabId);
            logger.debug("Got compose details:", details);

            const attachments = await browser.compose.listAttachments(request.composeTabId);
            logger.debug("Compose attachments:", attachments);

            const processedAttachments = await processAttachments(attachments);

            sendResponse({
                ...details,
                attachments: processedAttachments
            });
        } catch (error) {
            logger.error("Error getting compose details:", error);
            sendResponse({ error: error.message });
        }
    },

    async getAttachmentData(request, sendResponse) {
        try {
            logger.debug("Getting attachment data:", request);

            if (request.composeTabId)
                return await this.getComposeAttachmentData(request, sendResponse);

            return await this.getMessageAttachmentData(request, sendResponse);
        } catch (error) {
            logger.error("Error getting attachment data:", error);
            sendResponse({ error: error.message });
        }
    },

    async getComposeAttachmentData(request, sendResponse) {
        const tabId = parseInt(request.composeTabId);
        logger.debug("Getting attachments for compose tab:", tabId);

        await validateComposeTab(tabId);

        const attachments = await browser.compose.listAttachments(tabId);
        logger.debug("Found attachments:", attachments);

        if (!attachments?.length)
            throw new Error("No attachments found");

        const attachment = attachments.find(att => att.id === request.attachmentId);

        if (!attachment)
            throw new Error(`Attachment ${request.attachmentId} not found`);

        logger.debug("Found attachment:", attachment);
        const file = await browser.compose.getAttachmentFile(attachment.id);
        const arrayBuffer = await file.arrayBuffer();

        return sendResponse({
            success: true,
            data: arrayBuffer,
            filename: attachment.name,
            contentType: attachment.contentType || 'application/octet-stream'
        });
    },

    async getMessageAttachmentData(request, sendResponse) {
        if (!request.windowId)
            throw new Error("No window ID provided");

        const windowKey = Array.from(windowManager.openWindows.keys()).find(
            key => windowManager.openWindows.get(key) === request.windowId
        );

        const messageId = windowManager.getMessageId(windowKey);
        const messageHeader = await browser.messages.get(messageId);

        if (!messageHeader?.attachments?.length)
            throw new Error("No attachments found");

        const officeAttachment = messageHeader.attachments.find(att => FileOperations.isFilenameSupported(att.name));
        if (!officeAttachment)
            throw new Error("No Office document attachments found");

        const file = await browser.messages.getAttachmentFile(messageId, officeAttachment.partName);
        const arrayBuffer = await file.arrayBuffer();

        sendResponse({
            success: true,
            data: arrayBuffer,
            filename: officeAttachment.name,
            contentType: officeAttachment.contentType
        });
    },

    async saveComposeAttachment(request, sendResponse) {
        try {
            const tabId = parseInt(request.composeTabId);
            const data = new Uint8Array(request.data);
            const name = request.name || 'document';

            await browser.compose.removeAttachment(tabId, request.attachmentId);

            let file;
            try {
                file = new File([data], name);
            } catch (e) {
                file = new Blob([data]);
                file.name = name;
            }

            await browser.compose.addAttachment(tabId, {
                file: file,
                name: name
            });

            sendResponse({ success: true });
        } catch (error) {
            logger.error('Error saving compose attachment:', error);
            sendResponse({ success: false, error: error.message });
        }
    },

    async getDocApiScript(request, sendResponse) {
        try {
            if (!request.apiUrl)
                throw new Error("No API URL provided");

            logger.debug(`Fetching API from ${request.apiUrl}`);
            const response = await fetch(request.apiUrl);

            if (!response.ok)
                throw new Error(`Failed to fetch API: ${response.status} ${response.statusText}`);

            const scriptText = await response.text();
            logger.debug(`Received API script (${scriptText.length} bytes)`);

            sendResponse({ success: true, script: scriptText });
        } catch (error) {
            logger.error("Error getting Document API script:", error);
            sendResponse({ success: false, error: error.message });
        }
    }
};
