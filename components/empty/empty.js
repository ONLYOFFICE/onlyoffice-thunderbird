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

export const EmptyStateComponent = {
  _getBrowserURL(path) {
    return typeof browser !== 'undefined'
      ? browser.runtime.getURL(path)
      : path;
  },

  init() {
    this.injectStyles();
  },

  createTemplate(containerTitle, title, subtitle, altText) {
    const container = document.createElement('div');
    container.id = 'empty-state';
    container.className = 'empty-state';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-label', `Empty state: ${title}`);

    const icon = this._getBrowserURL('images/nofiles.svg');

    container.innerHTML = `
            <div class="empty-state__container">
                <h1 class="empty-state__container-title">${containerTitle}</h1>
                <div class="empty-state__box">
                    <div class="empty-state__icon" aria-hidden="true">
                        <img class="empty-state__icon-img" src="${icon}" alt="${altText}" loading="lazy">
                    </div>
                    <div class="empty-state__title" role="heading" aria-level="2">${title}</div>
                    <div class="empty-state__subtitle">${subtitle}</div>
                </div>
            </div>
        `;

    return container;
  },

  injectStyles() {
    if (document.getElementById('empty-state-styles')) return;

    const link = document.createElement('link');
    link.id = 'empty-state-styles';
    link.rel = 'stylesheet';
    link.href = this._getBrowserURL('components/empty/empty.css');

    link.addEventListener('error', () => {
      logger.warn('Failed to load empty state styles');
    });

    document.head.appendChild(link);
  },

  show(containerTitle, title, subtitle, altText) {
    this.injectStyles();

    const emptyState = this.createTemplate(containerTitle, title, subtitle, altText);
    const container = document.querySelector('.container');

    if (container) {
      requestAnimationFrame(() => {
        container.innerHTML = '';
        container.appendChild(emptyState);

        // Force a reflow to ensure animation plays
        void emptyState.offsetHeight;
      });
    }

    return emptyState;
  },

  hide() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.remove();
    }
  },

  isVisible() {
    return document.getElementById('empty-state') !== null;
  },
};
