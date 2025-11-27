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

export const FileListComponent = {
  _getBrowserURL(path) {
    return typeof browser !== 'undefined'
      ? browser.runtime.getURL(path)
      : path;
  },

  _createElement(tag, className, attributes = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'textContent') {
        el.textContent = value;
      } else if (key === 'html') {
        el.innerHTML = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    return el;
  },

  _createContainer() {
    return this._createElement('div', 'files-container', {
      id: 'files-container',
    });
  },

  _createTitle(title) {
    return this._createElement('h1', 'files-container__title', {
      textContent: title,
    });
  },

  _createFileList() {
    return this._createElement('ul', 'files-container__list', {
      id: 'file-list',
    });
  },

  _createEmptyMessage(emptyMessage) {
    return this._createElement('div', 'files-container__empty-message', {
      id: 'no-files',
      textContent: emptyMessage,
    });
  },

  _createScrollableContent(emptyMessage) {
    const scrollableContent = this._createElement('div', 'files-container__scrollable-content');
    scrollableContent.appendChild(this._createFileList());
    scrollableContent.appendChild(this._createEmptyMessage(emptyMessage));
    return scrollableContent;
  },

  init() {
    this.injectStyles();
    return true;
  },

  createTemplate(title, emptyMessage) {
    const container = this._createContainer();
    container.appendChild(this._createTitle(title));
    container.appendChild(this._createScrollableContent(emptyMessage));
    return container;
  },

  injectStyles() {
    if (document.getElementById('file-list-styles')) return;

    const link = document.createElement('link');
    link.id = 'file-list-styles';
    link.rel = 'stylesheet';
    link.href = this._getBrowserURL('components/file/list.css');

    link.addEventListener('error', () => {
      logger.warn('Failed to load file list styles');
    });

    document.head.appendChild(link);
  },

  show() {
    this.injectStyles();

    const template = this.createTemplate();
    const container = document.querySelector('.container');

    if (container) {
      container.innerHTML = '';
      container.appendChild(template);
    } else {
      document.body.appendChild(template);
    }

    return template;
  },

  hide() {
    const filesContainer = document.getElementById('files-container');
    if (filesContainer) filesContainer.remove();
  },

  isVisible() {
    return document.getElementById('files-container') !== null;
  },
};
