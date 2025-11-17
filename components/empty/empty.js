export const EmptyStateComponent = {
    getResourceURL(path) {
        return typeof browser !== 'undefined' 
            ? browser.runtime.getURL(path)
            : path;
    },

    init() {
        this.injectStyles();
    },

    createTemplate(title, subtitle) {
        const container = document.createElement('div');
        container.id = 'empty-state';
        container.className = 'empty-state';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-label', `Empty state: ${title}`);
        
        const icon = this.getResourceURL('images/nofiles.svg');
        
        container.innerHTML = `
            <div class="empty-state__box">
                <div class="empty-state__icon" aria-hidden="true">
                    <img class="empty-state__icon-img" src="${icon}" alt="Empty state illustration" loading="lazy">
                </div>
                <div class="empty-state__title" role="heading" aria-level="1">${title}</div>
                <div class="empty-state__subtitle">${subtitle}</div>
            </div>
        `;
        
        return container;
    },

    injectStyles() {
        if (document.getElementById('empty-state-styles'))
            return;
        
        const link = document.createElement('link');
        link.id = 'empty-state-styles';
        link.rel = 'stylesheet';
        link.href = this.getResourceURL('components/empty/empty.css');
        
        link.addEventListener('error', () => {
            console.warn('failed to load empty state styles');
        });
        
        document.head.appendChild(link);
    },

    show(title = 'No docs here yet', subtitle = 'Any files you upload will show up here.') {
        this.injectStyles();
        
        const emptyState = this.createTemplate(title, subtitle);
        const container = document.querySelector('.container');
        
        if (container) {
            requestAnimationFrame(() => {
                container.innerHTML = '';
                container.appendChild(emptyState);
                
                emptyState.offsetHeight;
            });
        }
        
        return emptyState;
    },

    hide() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    },

    isVisible() {
        return document.getElementById('empty-state') !== null;
    }
};
