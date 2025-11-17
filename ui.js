import { logger } from './common/logger.js';
import { openComposeViewer, openMessageViewer } from './viewers.js';

export async function setupMenus() {
    browser.menus.create({
        id: "openInOnlyoffice",
        title: "Open in ONLYOFFICE",
        contexts: ["message_list"],
        onclick: (info, tab) => {
            logger.debug("Context menu clicked", info, tab);
            openMessageViewer(tab);
        }
    });
}

export async function setupActions() {
    if (browser.messageDisplayAction) {
        logger.debug("Adding messageDisplayAction click handler");
        browser.messageDisplayAction.onClicked.addListener((tab) => {
            logger.debug("Message display action clicked", tab);
            openMessageViewer(tab);
        });
    } else {
        logger.warn("messageDisplayAction not available");
    }

    if (browser.composeAction) {
        logger.debug("Adding composeAction click handler");
        browser.composeAction.onClicked.addListener((tab) => {
            logger.debug("Compose action clicked", tab);
            openComposeViewer(tab);
        });
    } else {
        logger.warn("composeAction not available");
    }
}
