import { ErrorComponent } from '../components/error/error.js';

export class Router {
    constructor(containerId = 'app-container') {
        this.container = document.getElementById(containerId);
        this.currentPage = null;
        this.routes = new Map();
        this.navigationTimeout = 10000;
        this.isNavigating = false;
    }

    registerRoute(pageName, pageComponent) {
        this.routes.set(pageName, pageComponent);
    }

    async navigate(pageName, data = null) {
        if (this.isNavigating) return;
        this.isNavigating = true;
        
        try {
            const route = this.routes.get(pageName);
            if (!route) throw new Error(`Route not found: ${pageName}`); // TODO: Use localisation message

            if (this.currentPage?.cleanup) await this.currentPage.cleanup();

            this.container.innerHTML = '';
            const content = await route.render(data);
            if (!content) throw new Error(`Route "${pageName}" render returned null`); // TODO: Use localisation message
            
            this.container.appendChild(content);
            this.currentPage = route;
            if (route.init) await route.init(data);
        } catch (error) {
            if (pageName !== 'error') {
                this.isNavigating = false;
                await this.navigate('error', { 
                    title: 'Navigation Failed', // TODO: Use localisation message
                    message: error.message
                });
            } else {
                this.container.innerHTML = '';
                this.container.appendChild(ErrorComponent.createTemplate('Error', error.message));
            }
        } finally {
            this.isNavigating = false;
        }
    }
}

export class TemplateRenderer {
    static templates = new Map();

    static async loadTemplates() {
        const paths = [
            '../components/empty/empty.html',
            '../components/loader/loader.html',
            '../components/error/error.html',
            '../components/file/list.html',
            '../components/file/item.html'
        ];

        await Promise.all(paths.map(async path => {
            try {
                const response = await fetch(path);
                if (!response.ok) return;
                
                const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
                doc.querySelectorAll('template').forEach(template => {
                    this.templates.set(template.id, template);
                });
            } catch (error) {
                console.warn(`Failed to load templates from ${path}:`, error);
            }
        }));
    }

    static render(templateId, data = {}) {
        const template = this.templates.get(templateId);
        if (!template) throw new Error(`Template not found: ${templateId}`); // TODO: Use localisation message

        const container = document.createElement('div');
        container.appendChild(template.content.cloneNode(true));

        Object.entries(data).forEach(([key, value]) => {
            container.querySelectorAll(`[data-bind="${key}"]`).forEach(el => {
                if (el.tagName === 'IMG') el.src = value;
                else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value;
                else el.textContent = value;
            });
        });

        return container.firstElementChild;
    }
}

export class PageComponent {
    constructor(templateId) {
        this.templateId = templateId;
        this.element = null;
    }

    async render(data) {
        this.element = TemplateRenderer.render(this.templateId, data);
        if (!this.element)
            throw new Error(`Failed to render template: ${this.templateId}`); // TODO: Use localisation message

        return this.element;
    }

    async init(data) {
    }
    
    async cleanup() {
    }

    querySelector(selector) {
        return this.element?.querySelector(selector);
    }
}
