import { PageComponent } from './router.js';

import { FileComponents } from '../components/file/item.js';
import { FileListComponent } from '../components/file/list.js';
import { LoaderComponent } from '../components/loader/loader.js';
import { EditorControlsComponent } from '../components/editor/controls.js';

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
        super('template-empty-state');
    }

    async init(data) {
        const { localizeDocument } = await import('../common/i18n.js');
        localizeDocument();
    }

    async render(data) {
        await super.render(data);
        const iconImg = this.querySelector('.empty-state__icon-img');
        
        if (iconImg)
            iconImg.src = typeof browser !== 'undefined' 
                ? browser.runtime.getURL('images/nofiles.svg')
                : 'images/nofiles.svg';

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
        
        if (titleElement)
            titleElement.textContent = data?.title || messenger.i18n.getMessage('errorOccurred');
        if (messageElement)
            messageElement.textContent = data?.message || messenger.i18n.getMessage('errorDefault');

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
            noDocumentsFound: messenger.i18n.getMessage('noDocumentsFound'),
            fileIcon: messenger.i18n.getMessage('fileIcon'),
            editOnlyoffice: messenger.i18n.getMessage('editOnlyoffice'),
            viewOnlyoffice: messenger.i18n.getMessage('viewOnlyoffice'),
            download: messenger.i18n.getMessage('download')
        };
        this.element = FileListComponent.createTemplate(
            this.translations.fileListTitle,
            this.translations.noDocumentsFound
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

    _handleCancel() {
        window.close();
    }

    _handleSave() {
        if (this.documentEditor?.instance?.downloadAs) {
            this.documentEditor.instance.downloadAs();
        }
    }

    async _renderEditorControls() {
        EditorControlsComponent.init();

        const translations = {
            cancel: messenger.i18n.getMessage('cancel'),
            save: messenger.i18n.getMessage('save')
        };

        const callbacks = {
            onCancel: () => this._handleCancel(),
            onSave: () => this._handleSave()
        };

        const editorElement = EditorControlsComponent.createTemplate(translations);
        EditorControlsComponent.attachHandlers(editorElement, callbacks);
        
        const container = this.element.parentElement;
        if (container) {
            await LoaderComponent.hide(this.element);
            container.appendChild(editorElement);
            this.element = editorElement;
            this.placeholder = EditorControlsComponent.getPlaceholder(editorElement);
            this.buttonsContainer = EditorControlsComponent.getButtonsContainer(editorElement);
        }
    }

    _showError(message) {
        if (this.placeholder) {
            this.placeholder.textContent = message;
        } else if (this.element) {
            this.element.textContent = message;
        }
    }

    _configureIframe() {
        const wrapper = document.querySelector('.editor-controls__wrapper');
        const iframe = wrapper?.querySelector('iframe');
        if (iframe) {
            iframe.setAttribute('scrolling', 'no');
        }
    }

    _showButtons() {
        if (this.buttonsContainer) {
            this.buttonsContainer.classList.add('show');
        }
    }

    async init(data) {
        const file = data?.file;
        if (!file) {
            this._showError(messenger.i18n.getMessage('noFile'));
            return;
        }

        this.currentFile = file;

        try {
            const arrayBuffer = await ThunderbirdAPI.getAttachmentData(file);
            const base64Data = FileOperations.convertBuffer(arrayBuffer);
            const extension = FileOperations.getFileExtension(file.name);
            const docType = FileOperations.getFileType(extension);

            const { DocumentEditor } = await import('../common/editor.js');
            this.documentEditor = DocumentEditor;

            await this._renderEditorControls();

            await DocumentEditor.init(base64Data, file.name, extension, docType);
            
            this._configureIframe();
            this._showButtons();
        } catch (error) {
            this._showError(`${messenger.i18n.getMessage('error')}: ${error.message}`);
            throw error;
        }
    }

    _clearPlaceholder() {
        if (this.placeholder) {
            this.placeholder.innerHTML = '';
        }
    }

    _hideButtons() {
        if (this.buttonsContainer) {
            this.buttonsContainer.classList.remove('show');
        }
    }

    async cleanup() {
        this._clearPlaceholder();
        this._hideButtons();
        
        this.currentFile = null;
        this.documentEditor = null;
        this.placeholder = null;
        this.buttonsContainer = null;
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
        typeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                typeButtons.forEach(btn => btn.classList.remove('file-creator__type-button--selected'));
                button.classList.add('file-creator__type-button--selected');
                this.selectedType = button.dataset.type;
            });
        });

        const closeBtn = this.querySelector('#closeBtn');
        if (closeBtn)
            closeBtn.addEventListener('click', () => window.close());

        const createBtn = this.querySelector('#createBtn');
        if (createBtn)
            createBtn.addEventListener('click', () => this.createDocument());

        const titleInput = this.querySelector('#documentTitle');
        if (titleInput)
            titleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.createDocument();
            });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.close();
        });
    }

    async createDocument() {
        const titleInput = this.querySelector('#documentTitle');
        const title = titleInput?.value.trim() || messenger.i18n.getMessage('newDocument') || 'New document';

        try {
            const response = await browser.runtime.sendMessage({
                action: 'createNewDocument',
                title: title,
                type: this.selectedType,
                composeTabId: this.composeTabId
            });

            if (response.error)
                return;

            window.close();
        } catch (error) {
            return;
        }
    }

    async cleanup() {
        this.selectedType = 'document';
        this.composeTabId = null;
    }
}
