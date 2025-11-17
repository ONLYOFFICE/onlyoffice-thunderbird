export const LoaderComponent = {
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

    _getBrowserURL(imagePath) {
        return typeof browser !== 'undefined' 
            ? browser.runtime.getURL(imagePath)
            : imagePath;
    },

    _createContainer() {
        return this._createElement('div', 'loader-container', {
            id: 'loader-container'
        });
    },

    _createSpinner() {
        return this._createElement('img', 'loader-container__spinner', {
            src: this._getBrowserURL('images/loader.svg'),
            alt: 'Loading'
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

    createTemplate(message = 'Loading...') {
        const container = this._createContainer();
        container.appendChild(this._createLoaderBox(message));
        return container;
    },

    injectStyles() {
        if (document.getElementById('loader-styles')) return;
        
        const link = document.createElement('link');
        link.id = 'loader-styles';
        link.rel = 'stylesheet';
        link.href = typeof browser !== 'undefined' 
            ? browser.runtime.getURL('components/loader/loader.css')
            : './components/loader/loader.css';
        document.head.appendChild(link);
    },

    show(message = 'Loading...') {
        
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
        if (loaderContainer)
            loaderContainer.remove();
    }
};
