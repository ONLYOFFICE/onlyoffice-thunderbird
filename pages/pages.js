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
import { PageComponent } from './router.js';

import { FileComponents } from '../components/file/item.js';
import { FileListComponent } from '../components/file/list.js';
import { LoaderComponent } from '../components/loader/loader.js';

import { logger } from '../common/logger.js';
import { ThunderbirdAPI } from '../common/api.js';
import { FileOperations } from '../common/file.js';

export class LoadingPage extends PageComponent {
  constructor() {
    super('template-loader');
  }

  async init(data) {
    const messageElement = this.querySelector('.loader-container__message');
    if (messageElement) {
      if (data?.message) {
        messageElement.textContent = data.message;
      } else {
        const { localizeDocument } = await import('../common/i18n.js');
        localizeDocument();
      }
    }
    LoaderComponent.initializeSpinner(this.element);
    LoaderComponent.trackShow();
  }

  async render(data) {
    await super.render(data);
    return this.element;
  }

  async cleanup() {
    await LoaderComponent.waitMinimumTime();
  }
}

export class EmptyPage extends PageComponent {
  constructor() {
    super(null);
  }

  async render(data) {
    const { EmptyStateComponent } = await import('../components/empty/empty.js');
    EmptyStateComponent.init();

    const isCompose = data?.isCompose;
    const title = isCompose
      ? messenger.i18n.getMessage('emptyStateComposeTitle')
      : messenger.i18n.getMessage('emptyStateTitle');
    const subtitle = isCompose
      ? messenger.i18n.getMessage('emptyStateComposeSubtitle')
      : messenger.i18n.getMessage('emptyStateSubtitle');

    this.element = EmptyStateComponent.createTemplate(
      messenger.i18n.getMessage('fileListTitle'),
      title,
      subtitle,
      messenger.i18n.getMessage('emptyStateIllustration'),
    );

    return this.element;
  }
}

export class ErrorPage extends PageComponent {
  constructor() {
    super('template-error-state');
  }

  async render(data) {
    await super.render(data);

    const contentElement = this.querySelector('.error__content');
    if (contentElement) {
      const iconDiv = document.createElement('div');
      iconDiv.className = 'error__icon';
      iconDiv.setAttribute('aria-hidden', 'true');
      const img = document.createElement('img');
      img.className = 'error__icon-image';
      img.src = typeof browser !== 'undefined'
        ? browser.runtime.getURL('images/error.svg')
        : 'images/error.svg';
      img.alt = '';
      iconDiv.appendChild(img);
      contentElement.insertBefore(iconDiv, contentElement.firstChild);
    }

    const titleElement = this.querySelector('.error__title');
    const messageElement = this.querySelector('.error__message');

    if (titleElement) titleElement.textContent = data?.title || messenger.i18n.getMessage('errorOccurred');
    if (messageElement) messageElement.textContent = data?.message || messenger.i18n.getMessage('errorDefault');

    return this.element;
  }
}

export class FileListPage extends PageComponent {
  constructor() {
    super(null);
    this.files = [];
    this.translations = {};
  }

  async render(data) {
    this.files = data?.files || [];
    this.translations = {
      fileListTitle: messenger.i18n.getMessage('fileListTitle'),
      fileListNotice: messenger.i18n.getMessage('fileListNotice'),
      noDocumentsFound: messenger.i18n.getMessage('noDocumentsFound'),
      fileIcon: messenger.i18n.getMessage('fileIcon'),
      editOnlyoffice: messenger.i18n.getMessage('editOnlyoffice'),
      viewOnlyoffice: messenger.i18n.getMessage('viewOnlyoffice'),
      download: messenger.i18n.getMessage('download'),
    };
    this.element = FileListComponent.createTemplate(
      this.translations.fileListTitle,
      this.translations.fileListNotice,
      this.translations.noDocumentsFound,
    );
    this.renderFileItems();

    return this.element;
  }

  renderFileItems() {
    const container = this.element.querySelector('#file-list');
    if (!container) return;

    container.innerHTML = '';

    const noFilesTextElement = this.element.querySelector('#no-files');
    if (this.files.length === 0) {
      noFilesTextElement?.classList.add('show');
      return;
    }

    noFilesTextElement?.classList.remove('show');

    this.files.forEach((file) => {
      const fileItem = FileComponents.createFileItem(file, this.translations);
      container.appendChild(fileItem);
    });
  }

  async cleanup() {
    this.files = [];
    this.translations = {};
  }
}

export class ViewerPage extends PageComponent {
  constructor() {
    super(null);
    this.currentFile = null;
    this.documentEditor = null;
  }

  async render(data) {
    LoaderComponent.init();

    const fileName = data?.file?.name || 'file';
    const loadingMessage = messenger.i18n.getMessage('openingFile').replace('__%FILE%__', fileName);
    const loadingAltText = messenger.i18n.getMessage('loading');

    this.element = LoaderComponent.createTemplate(loadingMessage, loadingAltText);
    LoaderComponent.trackShow();

    return this.element;
  }

  async _renderEditor() {
    const editorContainer = document.createElement('div');
    editorContainer.id = 'placeholder';
    editorContainer.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%;';
    const container = this.element.parentElement;
    if (container) container.appendChild(editorContainer);
  }

  async _hideLoader() {
    if (this.loaderElement) await LoaderComponent.hide(this.loaderElement);
  }

  _showError(message) {
    if (this.element) this.element.textContent = message;
  }

  _configureIframe() {
    const iframe = this.element?.querySelector('iframe') ? this.element?.querySelector('iframe')
      : this.element?.parentElement?.querySelector('iframe');
    if (iframe) iframe.setAttribute('scrolling', 'no');
  }

  async init(data) {
    const file = data?.file;
    if (!file) {
      this._showError(messenger.i18n.getMessage('noFile'));
      return;
    }

    this.currentFile = file;
    this.loaderElement = this.element;
    try {
      const arrayBuffer = await ThunderbirdAPI.getAttachmentData(file);
      const base64Data = FileOperations.convertBuffer(arrayBuffer);
      const extension = FileOperations.getFileExtension(file.name);
      const docType = FileOperations.getFileType(extension);

      const { DocumentEditor } = await import('../common/editor.js');
      this.documentEditor = DocumentEditor;

      await this._renderEditor();
      await DocumentEditor.init(base64Data, file.name, extension, docType, () => {
        this._hideLoader();
        this._configureIframe();
      });
    } catch (error) {
      this._showError(`${messenger.i18n.getMessage('error')}: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    this.currentFile = null;
    this.documentEditor = null;
    this.loaderElement = null;
  }
}

export class CreatePage extends PageComponent {
  constructor() {
    super('template-file-creator');
    this.selectedType = 'document';
    this.composeTabId = null;
  }

  async render(data) {
    await super.render(data);
    return this.element;
  }

  async init(data) {
    if (data?.composeTabId) {
      this.composeTabId = data.composeTabId;
    } else {
      const params = new URLSearchParams(window.location.search);
      this.composeTabId = params.get('composeTabId');
    }

    const { localizeDocument } = await import('../common/i18n.js');
    localizeDocument();

    const titleInput = this.querySelector('#documentTitle');
    if (titleInput) {
      setTimeout(() => {
        titleInput.focus();
        titleInput.select();
      }, 100);
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const typeButtons = this.element.querySelectorAll('.file-creator__type-button');
    typeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        typeButtons.forEach((btn) => btn.classList.remove('file-creator__type-button--selected'));
        button.classList.add('file-creator__type-button--selected');
        this.selectedType = button.dataset.type;
      });
    });

    const closeBtn = this.querySelector('#closeBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => window.close());

    const createBtn = this.querySelector('#createBtn');
    if (createBtn) createBtn.addEventListener('click', () => this.createDocument());

    const titleInput = this.querySelector('#documentTitle');
    if (titleInput) {
      titleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.createDocument();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.close();
    });
  }

  async createDocument() {
    const titleInput = this.querySelector('#documentTitle');
    const title = titleInput?.value.trim() || messenger.i18n.getMessage('newFile') || 'New file';

    try {
      const response = await browser.runtime.sendMessage({
        action: 'createNewDocument',
        title,
        type: this.selectedType,
        composeTabId: this.composeTabId,
      });

      if (response.error) return;

      window.close();
    } catch (error) {
      // Error handled in background script
      logger.error('Error creating document:', error);
    }
  }

  async cleanup() {
    this.selectedType = 'document';
    this.composeTabId = null;
  }
}
