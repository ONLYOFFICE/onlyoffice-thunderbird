import { CONFIG } from './common/config.js';
import { logger } from './common/logger.js';
import { messageHandlers } from './handlers.js';
import { setupMenus, setupActions } from './ui.js';

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    logger.debug("Message received in background script:", request);

    const handler = messageHandlers[request.action];
    if (handler) {
        handler.call(messageHandlers, request, sendResponse);
        return true;
    }

    logger.debug("Unknown action:", request.action);
    sendResponse({ error: "Unknown action" });
    return false;
});

async function init() {
    logger.debug("Initializing extension...");
    try {
        await CONFIG.init();
        logger.debug("Configuration loaded successfully with", CONFIG.getSupportedExtensions().length, "formats");
    } catch (error) {
        logger.error("Error initializing configuration:", error);
    }
    await setupMenus();
    await setupActions();
}

init();
