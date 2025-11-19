import { logger } from '../../common/logger.js';

export const EditorControlsComponent = {
    _getBrowserURL(path) {
        return typeof browser !== 'undefined' 
            ? browser.runtime.getURL(path)
            : path;
    },

    init() {
        this.injectStyles();
    },

    injectStyles() {
        if (document.getElementById('editor-controls-styles'))
            return;
        
        const link = document.createElement('link');
        link.id = 'editor-controls-styles';
        link.rel = 'stylesheet';
        link.href = this._getBrowserURL('components/editor/controls.css');
        
        link.addEventListener('error', () => {
            logger.warn('Failed to load editor controls styles');
        });
        
        document.head.appendChild(link);
    },

    createTemplate(translations = {}) {
        const container = document.createElement('div');
        container.className = 'editor-controls';
        
        container.innerHTML = `
            <div class="editor-controls__wrapper">
                <div class="editor-controls__placeholder" id="placeholder"></div>
            </div>
            <div class="editor-controls__buttons">
                <button class="editor-controls__button editor-controls__button--secondary" data-action="cancel">
                    ${translations.cancel || 'Cancel'}
                </button>
                <button class="editor-controls__button editor-controls__button--primary" data-action="save">
                    ${translations.save || 'Save'}
                </button>
            </div>
        `;

        return container;
    },

    attachHandlers(container, callbacks = {}) {
        const cancelButton = container.querySelector('[data-action="cancel"]');
        const saveButton = container.querySelector('[data-action="save"]');

        if (cancelButton && callbacks.onCancel) 
            cancelButton.addEventListener('click', callbacks.onCancel);
        if (saveButton && callbacks.onSave)
            saveButton.addEventListener('click', callbacks.onSave);
    },

    getPlaceholder(container) {
        return container?.querySelector('#placeholder');
    },

    getButtonsContainer(container) {
        return container?.querySelector('.editor-controls__buttons');
    },

    showButtons(container) {
        const buttonsContainer = this.getButtonsContainer(container);
        if (buttonsContainer) buttonsContainer.classList.add('show');
    },

    hideButtons(container) {
        const buttonsContainer = this.getButtonsContainer(container);
        if (buttonsContainer) buttonsContainer.classList.remove('show');
    }
};
