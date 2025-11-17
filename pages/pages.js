import { PageComponent } from './router.js';

import { FileComponents } from '../components/file/item.js';
import { FileListComponent } from '../components/file/list.js';
import { LoaderComponent } from '../components/loader/loader.js';

import { ThunderbirdAPI } from '../common/api.js';
import { FileOperations } from '../common/file.js';

export class LoadingPage extends PageComponent {
    constructor() {
        super('template-loader');
    }

    async init(data) {
        const textElement = this.querySelector('.loader__text');
        if (textElement && data?.message)
            textElement.textContent = data.message;
    }
}

export class EmptyPage extends PageComponent {
    constructor() {
        super('template-empty-state');
    }

    async render(data) {
        await super.render(data);
        const titleElement = this.querySelector('.empty-state__title');
        const subtitleElement = this.querySelector('.empty-state__subtitle');
        const iconImg = this.querySelector('.empty-state__icon-img');
        
        if (titleElement)
            titleElement.textContent = data?.title || 'No docs here yet';
        if (subtitleElement)
            subtitleElement.textContent = data?.subtitle || 'Any files you upload will show up here.';
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
            titleElement.textContent = data?.title || 'An Error Occurred';
        if (messageElement)
            messageElement.textContent = data?.message || 'Something went wrong. Please try again.';

        return this.element;
    }
}

export class FileListPage extends PageComponent {
    constructor() {
        super(null);
        this.files = [];
    }

    async render(data) {
        this.files = data?.files || [];
        this.element = FileListComponent.createTemplate();
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
            const fileItem = FileComponents.createFileItem(file);
            container.appendChild(fileItem);
        });
    }

    async cleanup() {
        this.files = [];
    }
}

export class ViewerPage extends PageComponent {
    constructor() {
        super(null);
        this.currentFile = null;
    }

    async render(data) {
        this.element = document.createElement('div');
        this.element.id = 'placeholder';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        
        const loaderTemplate = LoaderComponent.createTemplate(`Opening ${data?.file?.name || 'file'}...`);
        loaderTemplate.style.animation = 'fadeIn 0.3s ease-in';
        this.element.appendChild(loaderTemplate);
        
        return this.element;
    }

    async init(data) {
        const file = data?.file;
        if (!file) {
            if (this.element)
                this.element.textContent = 'No file to display';
            return;
        }

        this.currentFile = file;

        try {
            const arrayBuffer = await ThunderbirdAPI.getAttachmentData(file);
            const base64Data = FileOperations.convertBuffer(arrayBuffer);
            const extension = FileOperations.getFileExtension(file.name);
            const docType = FileOperations.getFileType(extension);

            const { DocumentEditor } = await import('../common/editor.js');
            await DocumentEditor.init(base64Data, file.name, extension, docType);
        } catch (error) {
            if (this.element)
                this.element.textContent = `Error: ${error.message}`;
            throw error;
        }
    }

    async cleanup() {
        if (this.element)
            this.element.innerHTML = '';

        this.currentFile = null;
    }
}
