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
import { logger } from '../../common/logger.js';

export const ErrorComponent = {
  _getBrowserURL(path) {
    return typeof browser !== 'undefined'
      ? browser.runtime.getURL(path)
      : path;
  },

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  init() {
    this.injectStyles();
  },

  createTemplate(title, message) {
    const container = document.createElement('div');
    container.id = 'error-container';
    container.className = 'error';

    const iconSrc = this._getBrowserURL('images/error.svg');
    container.innerHTML = `
            <div class="error__content">
                <div class="error__icon" aria-hidden="true">
                    <img class="error__icon-image" src="${iconSrc}" alt="" />
                </div>
                <h2 class="error__title">${this._escapeHtml(title)}</h2>
                <p class="error__message">${this._escapeHtml(message)}</p>
            </div>
        `;
    return container;
  },

  injectStyles() {
    if (document.getElementById('error-styles')) return;

    const link = document.createElement('link');
    link.id = 'error-styles';
    link.rel = 'stylesheet';
    link.href = this._getBrowserURL('components/error/error.css');

    link.addEventListener('error', () => {
      logger.warn('Failed to load error styles');
    });

    document.head.appendChild(link);
  },

  show(title, message) {
    this.injectStyles();

    const existingError = document.getElementById('error-container');
    if (existingError) existingError.remove();

    const errorPage = this.createTemplate(title, message);
    document.body.appendChild(errorPage);

    return errorPage;
  },

  hide() {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) errorContainer.remove();
  },

  isVisible() {
    return document.getElementById('error-container') !== null;
  },
};
