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

export const LoaderComponent = {
  _minDisplayTime: 350,
  _startTime: null,

  _getBrowserURL(path) {
    return typeof browser !== 'undefined'
      ? browser.runtime.getURL(path)
      : path;
  },

  _getIcon(iconPath) {
    const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return isDark ? iconPath.replace('.svg', '_dark.svg') : iconPath;
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
    return this._createElement('div', 'loader-container', {
      id: 'loader-container',
    });
  },

  _createSpinner(altText) {
    const spinner = this._createElement('img', 'loader-container__spinner', {
      src: '',
      alt: altText,
    });
    spinner.style.opacity = '0';
    return spinner;
  },

  _createMessage(message) {
    return this._createElement('div', 'loader-container__message', {
      textContent: message,
    });
  },

  _createLoaderBox(message, altText) {
    const loaderBox = this._createElement('div', 'loader-container__box');
    loaderBox.appendChild(this._createSpinner(altText));
    loaderBox.appendChild(this._createMessage(message));
    return loaderBox;
  },

  init() {
    this.injectStyles();
  },

  initializeSpinner(element) {
    const spinner = element?.querySelector ? element.querySelector('.loader-container__spinner') : element;
    if (!spinner) return;

    setTimeout(() => {
      spinner.src = this._getBrowserURL(this._getIcon('images/loader.svg'));
      spinner.style.opacity = '1';
      spinner.style.transition = 'opacity 0.3s ease-in';
    }, 50);
  },

  createTemplate(message, altText = 'Loading', autoInitialize = true) {
    const container = this._createContainer();
    const loaderBox = this._createLoaderBox(message, altText);
    container.appendChild(loaderBox);

    if (autoInitialize) this.initializeSpinner(container);

    return container;
  },

  injectStyles() {
    if (document.getElementById('loader-styles')) return;

    const link = document.createElement('link');
    link.id = 'loader-styles';
    link.rel = 'stylesheet';
    link.href = this._getBrowserURL('components/loader/loader.css');

    link.addEventListener('error', () => {
      logger.warn('Failed to load loader styles');
    });

    document.head.appendChild(link);
  },

  trackShow() {
    this._startTime = Date.now();
  },

  async waitMinimumTime() {
    if (this._startTime) {
      const elapsed = Date.now() - this._startTime;
      const remaining = this._minDisplayTime - elapsed;

      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    this._startTime = null;
  },

  async hide(element) {
    await this.waitMinimumTime();

    const loaderContainer = element || document.getElementById('loader-container');
    if (loaderContainer) {
      loaderContainer.style.animation = 'fadeOut 350ms ease-out forwards';
      await new Promise((resolve) => setTimeout(resolve, 350));
      loaderContainer.remove();
    }
  },

  isVisible() {
    return document.getElementById('loader-container') !== null;
  },
};
