import { LoaderComponent } from '../loader/loader.js';

export const FileListComponent = {
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
            id: 'files-container'
        });
    },

    _createTitle() {
        return this._createElement('h1', 'files-container__title', {
            textContent: 'ONLYOFFICE Documents'
        });
    },

    _createFileList() {
        return this._createElement('ul', 'files-container__list', {
            id: 'file-list'
        });
    },

    _createEmptyMessage() {
        return this._createElement('div', 'files-container__empty-message', {
            id: 'no-files',
            textContent: 'No Office documents found'
        });
    },

    _createScrollableContent() {
        const scrollableContent = this._createElement('div', 'files-container__scrollable-content');
        scrollableContent.appendChild(this._createFileList());
        scrollableContent.appendChild(this._createEmptyMessage());
        return scrollableContent;
    },

    init() {
        this.injectStyles();
    },

    createTemplate() {
        const container = this._createContainer();
        container.appendChild(this._createTitle());
        container.appendChild(this._createScrollableContent());
        return container;
    },

    injectStyles() {
        if (document.getElementById('file-list-styles'))
            return;
        
        const link = document.createElement('link');
        link.id = 'file-list-styles';
        link.rel = 'stylesheet';
        link.href = typeof browser !== 'undefined' 
            ? browser.runtime.getURL('components/file/list.css')
            : './components/file/list.css';
        document.head.appendChild(link);
    },

    init(parentElement = null) {
        this.injectStyles();
        
        LoaderComponent.show('Loading ONLYOFFICE Documents...');
        
        return true;
    },

    showFiles() {
        const template = this.createTemplate();
        const container = document.querySelector('.container');
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(template);
        } else {
            document.body.appendChild(template);
        }
        
        return template;
    }
};
