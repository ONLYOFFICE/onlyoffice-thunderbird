import { logger } from './common/logger.js';
import { windowManager, WINDOW_KEYS } from './common/window.js';

export async function openComposeViewer(tab) {
    logger.debug("openComposeViewer called with tab:", tab);
    try {
        const details = await browser.compose.getComposeDetails(tab.id);
        logger.debug("Initial compose details:", details);
        await windowManager.open(
            `${WINDOW_KEYS.COMPOSE}${tab.id}`,
            `pages/viewer.html?composeTabId=${tab.id}`
        );
    } catch (error) {
        logger.error("Error opening compose viewer:", error);
    }
}

export async function openMessageViewer(tab) {
    logger.debug("openMessageViewer called with tab:", tab);
    try {
        const messages = await browser.mailTabs.getSelectedMessages(tab.id);
        logger.debug("Selected messages:", messages);

        if (!messages?.messages?.length)
            throw new Error("No message selected");

        const message = messages.messages[0];
        logger.debug("Working with message:", message);

        await windowManager.open(
            `${WINDOW_KEYS.MESSAGE}${message.id}`,
            `pages/viewer.html?messageId=${message.id}`
        );
    } catch (error) {
        logger.error("Error opening viewer:", error);
    }
}
