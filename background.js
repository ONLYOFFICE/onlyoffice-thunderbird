import { logger } from './common/logger.js';
import { WindowManager } from './common/window.js';
import { MessageHandlers } from './common/handlers.js';
import { ApplicationConfig } from './common/config.js';

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('Message received in background script:', request);

  const handler = MessageHandlers[request.action];
  if (handler) {
    handler.call(MessageHandlers, request, sendResponse);
    return true;
  }

  logger.debug('Unknown action:', request.action);
  sendResponse({ error: 'Unknown action' });
  return false;
});

async function init() {
  logger.debug('Initializing extension...');
  try {
    await ApplicationConfig.init();
    const formatsCount = ApplicationConfig.getSupportedExtensions().length;
    logger.debug('Configuration loaded successfully with', formatsCount, 'formats');
  } catch (error) {
    logger.error('Error initializing configuration:', error);
  }
  await WindowManager.setupMenus();
  await WindowManager.setupActions();
}

init();
