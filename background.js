let openWindows = new Map();

const logger = {
    log: (...args) => console.log('[ONLYOFFICE]', ...args),
    error: (...args) => console.error('[ONLYOFFICE]', ...args)
};

async function createOrFocusWindow(windowKey, url, options = {}) {
    if (openWindows.has(windowKey)) {
        logger.log("Window exists, focusing...");
        await browser.windows.update(openWindows.get(windowKey), { focused: true });
        return null;
    }

    logger.log("Creating new window...");
    const window = await browser.windows.create({
        url,
        type: "popup",
        width: options.width || 800,
        height: options.height || 600,
        ...options
    });
    logger.log("Window created:", window);

    openWindows.set(windowKey, window.id);

    browser.windows.onRemoved.addListener(function listener(windowId) {
        if (windowId === window.id) {
            logger.log("Window closed, cleaning up...");
            openWindows.delete(windowKey);
            browser.windows.onRemoved.removeListener(listener);
        }
    });

    return window;
}

async function processAttachments(attachments, messageId = null, composeTabId = null) {
    if (!attachments || !Array.isArray(attachments)) {
        return [];
    }

    return Promise.all(attachments.map(async (att) => {
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
    }));
}

function isOfficeFile(filename) {
    return /\.(docx|xlsx|pptx|doc|xls|ppt)$/i.test(filename);
}

async function findAttachmentsInParts(parts) {
    const found = [];
    for (const part of parts) {
        const hasName = part.name && typeof part.name === 'string';
        const hasContentType = part.contentType && typeof part.contentType === 'string';
        const hasPartName = part.partName && typeof part.partName === 'string';
        
        if ((hasName && hasContentType && hasPartName) || (hasName && isOfficeFile(part.name))) {
            found.push({
                name: part.name,
                contentType: part.contentType || 'application/octet-stream',
                partName: part.partName,
                size: part.size || 0
            });
        }
        if (part.parts?.length > 0) {
            found.push(...await findAttachmentsInParts(part.parts));
        }
    }
    return found;
}

async function openComposeViewer(tab) {
    logger.log("openComposeViewer called with tab:", tab);
    try {
        const details = await browser.compose.getComposeDetails(tab.id);
        logger.log("Initial compose details:", details);
        await createOrFocusWindow(
            `compose_${tab.id}`,
            `editor/viewer.html?composeTabId=${tab.id}`
        );
    } catch (error) {
        logger.error("Error opening compose viewer:", error);
    }
}

async function openMessageViewer(tab) {
    logger.log("openMessageViewer called with tab:", tab);
    try {
        const messages = await browser.mailTabs.getSelectedMessages(tab.id);
        logger.log("Selected messages:", messages);
        
        if (!messages?.messages?.length) {
            throw new Error("No message selected");
        }
        
        const message = messages.messages[0];
        logger.log("Working with message:", message);
        
        await createOrFocusWindow(
            `msg_${message.id}`,
            `editor/viewer.html?messageId=${message.id}`
        );
    } catch (error) {
        logger.error("Error opening viewer:", error);
    }
}

async function handleDocServerApiProxy(request) {
    logger.log("Handling Document Server API proxy request:", request);
    
    try {
        if (!request.apiUrl) {
            throw new Error("No API URL provided");
        }
        
        logger.log(`Fetching API from ${request.apiUrl}`);
        const response = await fetch(request.apiUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch API: ${response.status} ${response.statusText}`);
        }

        const scriptText = await response.text();
        logger.log(`Received API script (${scriptText.length} bytes)`);
        
        return { success: true, script: scriptText };
    } catch (error) {
        logger.error("Error proxying Document Server API:", error);
        return { success: false, error: error.message };
    }
}

async function handleGetMessageData(request, sendResponse) {
    try {
        if (!request.messageId || typeof request.messageId !== 'number') {
            throw new Error('Invalid message ID provided');
        }
        
        const messageHeader = await browser.messages.get(request.messageId);
        logger.log("Message header:", messageHeader);
        
        if (!messageHeader) {
            throw new Error('Message not found');
        }

        const fullMessage = await browser.messages.getFull(request.messageId);
        logger.log("Full message data:", fullMessage);

        const listedAttachments = await browser.messages.listAttachments(request.messageId);
        logger.log("Attachments from listAttachments API:", listedAttachments);

        let attachments = messageHeader.attachments || listedAttachments || [];
        
        if (attachments.length === 0 && fullMessage?.parts) {
            logger.log("Looking for attachments in MIME parts");
            attachments = await findAttachmentsInParts(fullMessage.parts);
            logger.log("Attachments found in MIME parts:", attachments);
        }

        const processedAttachments = await processAttachments(attachments, request.messageId);
        logger.log("Final processed attachments:", processedAttachments);

        sendResponse({
            ...fullMessage,
            attachments: processedAttachments
        });
    } catch (error) {
        logger.error("Error getting message data:", error);
        sendResponse({ error: error.message });
    }
}

async function handleGetComposeDetails(request, sendResponse) {
    try {
        logger.log("Getting compose details for tab:", request.composeTabId);
        
        if (!request.composeTabId) {
            throw new Error('No compose tab ID provided');
        }

        const details = await browser.compose.getComposeDetails(request.composeTabId);
        logger.log("Got compose details:", details);

        const attachments = await browser.compose.listAttachments(request.composeTabId);
        logger.log("Compose attachments:", attachments);

        const processedAttachments = await processAttachments(attachments, null, request.composeTabId);
        
        sendResponse({
            ...details,
            attachments: processedAttachments
        });
    } catch (error) {
        logger.error("Error getting compose details:", error);
        sendResponse({ error: error.message });
    }
}

async function handleGetAttachmentData(request, sendResponse) {
    try {
        logger.log("Getting attachment data:", request);
        
        if (request.composeTabId) {
            const tabId = parseInt(request.composeTabId);
            logger.log("Getting attachments for compose tab:", tabId);
            
            try {
                await browser.tabs.get(tabId);
            } catch (e) {
                throw new Error(`Invalid compose tab: ${tabId}`);
            }
            
            const attachments = await browser.compose.listAttachments(tabId);
            logger.log("Found attachments:", attachments);
            
            if (!attachments?.length) {
                throw new Error("No attachments found");
            }

            const attachment = attachments.find(att => att.id === request.attachmentId);
            
            if (!attachment) {
                throw new Error(`Attachment ${request.attachmentId} not found`);
            }

            logger.log("Found attachment:", attachment);
            const file = await browser.compose.getAttachmentFile(attachment.id);
            const arrayBuffer = await file.arrayBuffer();

            return sendResponse({
                success: true,
                data: arrayBuffer,
                filename: attachment.name,
                contentType: attachment.contentType || 'application/octet-stream'
            });
        }
        
        if (!request.windowId) {
            throw new Error("No window ID provided");
        }

        const windowKey = Object.keys(openWindows).find(key => openWindows.get(key) === request.windowId);
        if (!windowKey?.startsWith('msg_')) {
            throw new Error("Invalid window type");
        }

        const messageId = parseInt(windowKey.replace('msg_', ''), 10);
        const messageHeader = await browser.messages.get(messageId);
        if (!messageHeader?.attachments?.length) {
            throw new Error("No attachments found");
        }

        const officeAttachment = messageHeader.attachments.find(att => isOfficeFile(att.name));
        if (!officeAttachment) {
            throw new Error("No Office document attachments found");
        }

        const file = await browser.messages.getAttachmentFile(messageId, officeAttachment.partName);
        const arrayBuffer = await file.arrayBuffer();
        
        sendResponse({
            success: true,
            data: arrayBuffer,
            filename: officeAttachment.name,
            contentType: officeAttachment.contentType
        });
    } catch (error) {
        logger.error("Error getting attachment data:", error);
        sendResponse({ error: error.message });
    }
}

async function handleSaveComposeAttachment(request, sendResponse) {
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
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    logger.log("Message received in background script:", request);
    
    const handlers = {
        getMessageData: handleGetMessageData,
        getComposeDetails: handleGetComposeDetails,
        proxyDocServerApi: async (req) => sendResponse(await handleDocServerApiProxy(req)),
        getAttachmentData: handleGetAttachmentData,
        saveComposeAttachment: handleSaveComposeAttachment
    };

    const handler = handlers[request.action];
    if (handler) {
        handler(request, sendResponse);
        return true;
    }

    logger.log("Unknown action:", request.action);
    sendResponse({ error: "Unknown action" });
    return false;
});

async function init() {
    logger.log("Initializing extension...");
    
    browser.menus.create({
        id: "openInOnlyoffice",
        title: "Open in ONLYOFFICE",
        contexts: ["message_list"],
        onclick: (info, tab) => {
            logger.log("Context menu clicked", info, tab);
            openMessageViewer(tab);
        }
    });

    if (browser.messageDisplayAction) {
        logger.log("Adding messageDisplayAction click handler");
        browser.messageDisplayAction.onClicked.addListener((tab) => {
            logger.log("Message display action clicked", tab);
            openMessageViewer(tab);
        });
    } else {
        logger.warn("messageDisplayAction not available");
    }

    if (browser.composeAction) {
        logger.log("Adding composeAction click handler");
        browser.composeAction.onClicked.addListener((tab) => {
            logger.log("Compose action clicked", tab);
            openComposeViewer(tab);
        });
    } else {
        logger.warn("composeAction not available");
    }
}

init();