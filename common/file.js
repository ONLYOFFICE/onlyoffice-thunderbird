import { CONFIG } from './config.js';

export const FileOperations = {
    _genericMimeTypes: [
        'application/octet-stream',
        'application/zip',
        'application/x-zip',
        'application/x-zip-compressed'
    ],

    _extract(part) {
        return {
            name: part.name,
            contentType: part.contentType || 'application/octet-stream',
            partName: part.partName,
            size: part.size || 0
        };
    },

    _isValid(part) {
        const hasName = part.name && typeof part.name === 'string';
        const hasContentType = part.contentType && typeof part.contentType === 'string';
        const hasPartName = part.partName && typeof part.partName === 'string';
        return (hasName && hasContentType && hasPartName) || (hasName && this.isFilenameSupported(part.name));
    },

    convertBuffer(buffer) {
        return btoa(
            Array.from(new Uint8Array(buffer))
                .map(byte => String.fromCharCode(byte))
                .join('')
        );
    },

    convertBase64(base64) {
        const binary = atob(base64);
        return new Uint8Array(Array.from(binary, char => char.charCodeAt(0)));
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const sizes = ['Bytes', 'Kb', 'Mb', 'Gb'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
    },

    getFileExtension(filename) {
        return filename ? filename.toLowerCase().split('.').pop() : '';
    },

    getFileType(extension) {
        for (const [type, docType] of Object.entries(CONFIG.documents)) {
            if (docType.extensions.includes(extension)) {
                return type;
            }
        }
        return 'word';
    },

    isSupportedFile(attachment) {
        if (!attachment?.name) return false;
        
        const ext = this.getFileExtension(attachment.name);
        const extSupported = CONFIG.getSupportedExtensions().includes(ext);
        
        return extSupported;
    },

    isFilenameSupported(filename) {
        return CONFIG.isSupportedFile(filename);
    },

    async findAttachments(parts) {
        const found = [];
        for (const part of parts) {
            if (this._isValid(part))
                found.push(this._extract(part));
            if (part.parts?.length > 0)
                found.push(...await this.findAttachments(part.parts));
        }

        return found;
    }
};
