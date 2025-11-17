function getParams() {
    return new URLSearchParams(window.location.search);
}

function getMessageId() {
    return getParams().get('messageId');
}

function getComposeTabId() {
    return getParams().get('composeTabId');
}

export const ThunderbirdAPI = {
    async getAttachmentData(file) {
        const composeTabId = getComposeTabId();
        if (composeTabId) {
            const response = await browser.runtime.sendMessage({
                action: 'getAttachmentData',
                composeTabId: parseInt(composeTabId),
                attachmentId: file.id
            });

            if (!response.success) 
                throw new Error(response.error || 'Failed to get attachment data');

            return response.data;
        }
        
        const response = await fetch(file.url, { credentials: 'include' });
        if (!response.ok)
            throw new Error(`Failed to fetch file: ${response.status}`);

        return response.arrayBuffer();
    },

    async getAttachments() {
        const composeTabId = getComposeTabId();
        const messageId = getMessageId();
        
        if (composeTabId) {
            const details = await browser.runtime.sendMessage({
                action: 'getComposeDetails',
                composeTabId: parseInt(composeTabId),
                windowId: (await browser.windows.getCurrent()).id
            });

            if (!details?.attachments)
                throw new Error('No attachments found');

            return details.attachments;
        }
        
        if (messageId) {
            const message = await browser.runtime.sendMessage({
                action: 'getMessageData',
                messageId: parseInt(messageId)
            });

            if (!message?.attachments)
                throw new Error('No attachments found');

            return message.attachments;
        }
        
        throw new Error('No valid message or compose id');
    },

    async getComposeDetails() {
        const composeTabId = getComposeTabId();
        return browser.runtime.sendMessage({
            action: 'getComposeDetails',
            composeTabId: parseInt(composeTabId)
        });
    },

    async saveComposeAttachment(attachmentId, data, name, contentType) {
        const composeTabId = getComposeTabId();
        return browser.runtime.sendMessage({
            action: 'saveComposeAttachment',
            composeTabId: parseInt(composeTabId),
            attachmentId: parseInt(attachmentId),
            data: Array.from(new Uint8Array(data)),
            contentType,
            name
        });
    }
};
