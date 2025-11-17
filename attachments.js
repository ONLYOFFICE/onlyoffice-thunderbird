import { FileOperations } from './common/file.js';
import { logger } from './common/logger.js';

export async function processAttachments(attachments, messageId = null) {
    if (!attachments || !Array.isArray(attachments)) {
        return [];
    }

    return Promise.all(attachments.map(att => processAttachment(att, messageId)));
}

async function processAttachment(att, messageId) {
    try {
        const baseAttachment = {
            name: att.name,
            size: att.size,
            id: att.id,
            contentType: att.contentType || 'application/octet-stream',
            partName: messageId ? att.partName : att.id
        };

        if (messageId) {
            const file = await browser.messages.getAttachmentFile(messageId, att.partName);
            return {
                ...baseAttachment,
                content: null,
                url: URL.createObjectURL(file)
            };
        }

        return baseAttachment;
    } catch (error) {
        logger.error(`Error processing attachment ${att.name}:`, error);
        return att;
    }
}

export async function getMessageAttachments(messageId, messageHeader, fullMessage) {
    const listedAttachments = await browser.messages.listAttachments(messageId);
    logger.debug("Attachments from listAttachments API:", listedAttachments);

    let attachments = messageHeader.attachments || listedAttachments || [];

    if (attachments.length === 0 && fullMessage?.parts) {
        logger.debug("Looking for attachments in MIME parts");
        attachments = await FileOperations.findAttachments(fullMessage.parts);
        logger.debug("Attachments found in MIME parts:", attachments);
    }

    return attachments;
}

export function validateMessageRequest(request) {
    if (!request.messageId || typeof request.messageId !== 'number')
        throw new Error('Invalid message ID');
}

export async function validateComposeTab(tabId) {
    try {
        await browser.tabs.get(tabId);
    } catch (e) {
        throw new Error(`Invalid compose tab: ${tabId}`);
    }
}
