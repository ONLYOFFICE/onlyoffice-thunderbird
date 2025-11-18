export const ApplicationConfig = {
    docServerUrl: '',
    docServerSecret: '',
    formatsPath: '',
    ui: {},
    limits: {},
    documents: {},
    formatsData: null,

    sanitizeUrl(url) {
        if (!url)
            throw new Error(messenger.i18n.getMessage('errorServerUrlRequired'));
        url = url.replace(/\/+$/, '');

        if (!url.startsWith('https://'))
            throw new Error(messenger.i18n.getMessage('errorServerUrlInvalidProtocol'));
        
        try {
            new URL(url);
        } catch (error) {
            throw new Error(messenger.i18n.getMessage('errorInvalidServerUrl'));
        }
        
        return url;
    },

    async init() {
        const configUrl = typeof browser !== 'undefined' 
            ? browser.runtime.getURL('config/config.json')
            : 'config/config.json';
        
        const configData = await fetch(configUrl).then(response => {
            if (!response.ok) throw new Error(messenger.i18n.getMessage('errorFailedLoadConfig').replace('__%STATUS%__', response.status));
            return response.json();
        });

        this.docServerUrl = this.sanitizeUrl(configData.server.url);
        this.docServerSecret = configData.server.secret || '';
        this.formatsPath = configData.vendor.formats;
        this.ui = configData.ui || {};
        this.limits = configData.limits || {};

        const formatsUrl = typeof browser !== 'undefined'
            ? browser.runtime.getURL(this.formatsPath)
            : this.formatsPath;
        
        this.formatsData = await fetch(formatsUrl).then(response => {
            if (!response.ok) throw new Error(messenger.i18n.getMessage('errorFailedLoadFormats').replace('__%STATUS%__', response.status));
            return response.json();
        });
        
        this.buildDocumentFormats();
    },

    buildDocumentFormats() {
        if (!Array.isArray(this.formatsData)) return;
        
        this.documents = this.formatsData.reduce((formats, format) => {
            const type = format.type;
            if (!formats[type]) {
                formats[type] = { extensions: [], mimeTypes: [], actions: [] };
            }
            
            formats[type].extensions.push(format.name);
            if (format.mime) formats[type].mimeTypes.push(...format.mime);
            if (format.actions) {
                format.actions.forEach(action => {
                    if (!formats[type].actions.includes(action)) {
                        formats[type].actions.push(action);
                    }
                });
            }
            
            return formats;
        }, {});
    },

    getWindowDefaults() {
        return this.ui?.window || { width: 800, height: 600 };
    },

    getSupportedExtensions() {
        return Object.values(this.documents).flatMap(doc => doc.extensions);
    },

    isSupportedFile(filename) {
        if (!filename) return false;
        const ext = filename.toLowerCase().split('.').pop();
        return this.getSupportedExtensions().includes(ext);
    }
};
