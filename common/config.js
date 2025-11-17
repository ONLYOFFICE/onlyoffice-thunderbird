export const CONFIG = {
    docServerUrl: '',
    formatsPath: '',
    ui: {},
    limits: {},
    documents: {},
    formatsData: null,

    sanitizeUrl(url) {
        if (!url)
            throw new Error('Server URL is required');
        url = url.replace(/\/+$/, '');

        if (!url.startsWith('https://'))
            throw new Error('Server URL must use HTTPS protocol');
        
        try {
            new URL(url);
        } catch (error) {
            throw new Error('Invalid server URL format');
        }
        
        return url;
    },

    async init() {
        const configUrl = typeof browser !== 'undefined' 
            ? browser.runtime.getURL('config/config.json')
            : './config/config.json';
        
        const configResponse = await fetch(configUrl);
        if (!configResponse.ok)
            throw new Error(`Failed to load config: ${configResponse.status}`);
        const configData = await configResponse.json();

        this.docServerUrl = this.sanitizeUrl(configData.server.url);
        this.formatsPath = configData.vendor.formats;
        this.ui = configData.ui || {};
        this.limits = configData.limits || {};

        const formatsUrl = typeof browser !== 'undefined'
            ? browser.runtime.getURL(this.formatsPath)
            : this.formatsPath;
        
        const response = await fetch(formatsUrl);
        if (!response.ok)
            throw new Error(`Failed to load formats: ${response.status}`);
        
        this.formatsData = await response.json();
        this.buildDocumentFormats();
        return true;
    },

    buildDocumentFormats() {
        const documentFormats = {};

        if (!this.formatsData || !Array.isArray(this.formatsData)) return;
        
        this.formatsData.forEach(format => {
            const type = format.type;
            if (!documentFormats[type]) {
                documentFormats[type] = {
                    extensions: [],
                    mimeTypes: [],
                    actions: []
                };
            }
            
            documentFormats[type].extensions.push(format.name);
            if (Array.isArray(format.mime)) {
                documentFormats[type].mimeTypes.push(...format.mime);
            }
            if (Array.isArray(format.actions)) {
                format.actions.forEach(action => {
                    if (!documentFormats[type].actions.includes(action)) {
                        documentFormats[type].actions.push(action);
                    }
                });
            }
        });
        
        this.documents = documentFormats;
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
