import { logger } from '../../common/logger.js';

export const LoaderComponent = {
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
        return this._createElement('div', 'loader-container', {
            id: 'loader-container'
        });
    },

    _createSpinner() {
        return this._createElement('img', 'loader-container__spinner', {
            src: this._getBrowserURL('images/loader.svg'),
            alt: messenger.i18n.getMessage('loading')
        });
    },

    _createMessage(message) {
        return this._createElement('div', 'loader-container__message', {
            textContent: message
        });
    },

    _createLoaderBox(message) {
        const loaderBox = this._createElement('div', 'loader-container__box');
        loaderBox.appendChild(this._createSpinner());
        loaderBox.appendChild(this._createMessage(message));
        return loaderBox;
    },

    init() {
        this.injectStyles();
    },

    createTemplate(message) {
        const defaultMessage = messenger.i18n.getMessage('loadingDefault');
        const container = this._createContainer();
        container.appendChild(this._createLoaderBox(message || defaultMessage));
        return container;
    },

    injectStyles() {
        if (document.getElementById('loader-styles'))
            return;
        
        const link = document.createElement('link');
        link.id = 'loader-styles';
        link.rel = 'stylesheet';
        link.href = this._getBrowserURL('components/loader/loader.css');
        
        link.addEventListener('error', () => {
            logger.warn('Failed to load loader styles');
        });
        
        document.head.appendChild(link);
    },

    show(message) {
        this.injectStyles();
        
        const loader = this.createTemplate(message);
        const container = document.querySelector('.container');
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(loader);
        } else {
            document.body.appendChild(loader);
        }
        
        return loader;
    },

    hide() {
        const loaderContainer = document.getElementById('loader-container');
        if (loaderContainer) loaderContainer.remove();
    },

    isVisible() {
        return document.getElementById('loader-container') !== null;
    }
};
