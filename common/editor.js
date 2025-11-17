import { ThunderbirdAPI } from './api.js';
import { FileOperations } from './file.js';
import { ApplicationConfig } from './config.js';

const getComposeTabId = () => new URLSearchParams(window.location.search).get('composeTabId');

export const DocumentEditor = {
    instance: null,
    config: null,

    async loadApiJs() {
        const url = ApplicationConfig.docServerUrl;
        if (!url) throw new Error('Document server url is not configured');
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${url}/web-apps/apps/api/documents/api.js`;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ONLYOFFICE Document API from ${url}`));
            document.head.appendChild(script);
        });
    },

    onAppReady(data) {
        if (this.config.document.url === "_data_")
            this.instance.openDocument(FileOperations.convertBase64(data));
    },

    async saveFile(blob, name) {
        const details = await ThunderbirdAPI.getComposeDetails();
        const attachment = details?.attachments?.find(att => att.name === name);
        if (!attachment) throw new Error('Attachment not found in compose window');

        const response = await ThunderbirdAPI.saveComposeAttachment(
            attachment.id,
            await blob.arrayBuffer(),
            name,
            attachment.contentType || 'application/octet-stream'
        );

        if (!response.success) throw new Error('Failed to save file');
    },

    downloadFile(blob, name) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = name;

        document.body.appendChild(link);

        link.click();
        link.remove();
        
        URL.revokeObjectURL(url);
    },

    async onSaveDocument(event, name) {
        try {
            const blob = new Blob([event.data]);
            getComposeTabId() 
                ? await this.saveFile(blob, name)
                : this.downloadFile(blob, name);
        } catch (error) {
            console.error("Error saving document:", error);
        }
    },

    buildConfig(data, name, extension, type) {
        return {
            documentData: data,
            document: {
                fileType: extension,
                title: name,
                url: "_data_",
                permissions: {
                    download: true,
                    edit: true,
                    print: true,
                    review: false
                }
            },
            documentType: type,
            height: '100%',
            width: '100%',
            editorConfig: {
                mode: 'edit',
                customization: {
                    about: false,
                    feedback: false,
                    forcesave: false,
                }
            },
            events: {
                onAppReady: () => this.onAppReady(data),
                onSaveDocument: (event) => this.onSaveDocument(event, name)
            }
        };
    },

    async init(data, name, extension, type) {
        await this.loadApiJs();
        if (typeof DocsAPI === 'undefined')
            throw new Error('ONLYOFFICE Document API not loaded');

        this.config = this.buildConfig(data, name, extension, type);
        this.instance = new DocsAPI.DocEditor('placeholder', this.config);
    }
};

