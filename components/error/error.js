export const ErrorComponent = {
    getResourceURL(path) {
        return typeof browser !== 'undefined' 
            ? browser.runtime.getURL(path)
            : path;
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    init() {
        this.injectStyles();
    },

    createTemplate(title, message) {
        const container = document.createElement('div');
        container.id = 'error-container';
        container.className = 'error';
        
        const iconSrc = this.getResourceURL('images/error.svg');
        container.innerHTML = `
            <div class="error__content">
                <div class="error__icon" aria-hidden="true">
                    <img class="error__icon-image" src="${iconSrc}" alt="" />
                </div>
                <h2 class="error__title">${this._escapeHtml(title)}</h2>
                <p class="error__message">${this._escapeHtml(message)}</p>
            </div>
        `;
        return container;
    },

    injectStyles() {
        if (document.getElementById('error-styles'))
            return;
        
        const link = document.createElement('link');
        link.id = 'error-styles';
        link.rel = 'stylesheet';
        link.href = this.getResourceURL('components/error/error.css');
        
        link.addEventListener('error', () => {
            console.warn('Failed to load error styles');
        });
        
        document.head.appendChild(link);
    },

    show(title, message, options = {}) {
        this.injectStyles();
        
        const existingError = document.getElementById('error-container');
        if (existingError) existingError.remove();
        
        const errorPage = this.createTemplate(title, message);
        document.body.appendChild(errorPage);
        
        return errorPage;
    }
};
