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
export const ApplicationConfig = {
  docServerUrl: '',
  docServerSecret: '',
  formatsPath: '',
  ui: {},
  limits: {},
  documents: {},
  formatsData: null,

  sanitizeUrl(url) {
    if (!url) throw new Error(messenger.i18n.getMessage('errorServerUrlRequired'));
    const cleanUrl = url.replace(/\/+$/, '');

    if (!cleanUrl.startsWith('https://')) {
      throw new Error(messenger.i18n.getMessage('errorServerUrlInvalidProtocol'));
    }

    try {
      const parsedUrl = new URL(cleanUrl);
      parsedUrl.toString();
    } catch (error) {
      throw new Error(messenger.i18n.getMessage('errorInvalidServerUrl'));
    }

    return cleanUrl;
  },

  async init() {
    const configUrl = typeof browser !== 'undefined'
      ? browser.runtime.getURL('config/config.json')
      : 'config/config.json';

    const configData = await fetch(configUrl).then((response) => {
      if (!response.ok) {
        const errMsg = messenger.i18n.getMessage('errorFailedLoadConfig');
        throw new Error(errMsg.replace('__%STATUS%__', response.status));
      }
      return response.json();
    });

    this.docServerUrl = this.sanitizeUrl(configData.server.url);
    this.docServerSecret = configData.server.secret || '';
    this.formatsPath = configData.vendor.formats;
    this.ui = configData.ui || {};
    this.limits = configData.limits || {};

    const formatsUrl = typeof browser !== 'undefined'
      ? browser.runtime.getURL(this.formatsPath)
      : this.formatsPath;

    this.formatsData = await fetch(formatsUrl).then((response) => {
      if (!response.ok) {
        const errMsg = messenger.i18n.getMessage('errorFailedLoadFormats');
        throw new Error(errMsg.replace('__%STATUS%__', response.status));
      }
      return response.json();
    });

    this.buildDocumentFormats();
  },

  buildDocumentFormats() {
    if (!Array.isArray(this.formatsData)) return;

    this.documents = this.formatsData.reduce((formats, format) => {
      const { type } = format;
      if (!formats[type]) {
        formats[type] = { extensions: [], mimeTypes: [], actions: [] };
      }

      formats[type].extensions.push(format.name);
      if (format.mime) formats[type].mimeTypes.push(...format.mime);
      if (format.actions) {
        format.actions.forEach((action) => {
          if (!formats[type].actions.includes(action)) {
            formats[type].actions.push(action);
          }
        });
      }

      return formats;
    }, {});
  },

  getWindowDefaults() {
    return this.ui?.window || { width: 800, height: 600 };
  },

  getSupportedExtensions() {
    return Object.values(this.documents).flatMap((doc) => doc.extensions);
  },

  isSupportedFile(filename) {
    if (!filename) return false;
    const ext = filename.toLowerCase().split('.').pop();
    return this.getSupportedExtensions().includes(ext);
  },
};
