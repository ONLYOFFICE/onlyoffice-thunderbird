/**
 *
 * (c) Copyright Ascensio System SIA 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
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
