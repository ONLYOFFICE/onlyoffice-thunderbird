import { ApplicationConfig } from './config.js';

export const FileOperations = {
    _extract(part) {
        return {
            name: part.name,
            contentType: part.contentType || 'application/octet-stream',
            partName: part.partName,
            size: part.size || 0
        };
    },

    _isValid(part) {
        return part.name && this.isFilenameSupported(part.name);
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
        if (!bytes) return '0 Bytes';
        const sizes = ['Bytes', 'Kb', 'Mb', 'Gb'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    },

    getFileExtension(filename) {
        return filename?.toLowerCase().split('.').pop() || '';
    },

    getFileType(extension) {
        for (const [type, docType] of Object.entries(ApplicationConfig.documents)) {
            if (docType.extensions.includes(extension)) {
                return type;
            }
        }
        return 'word';
    },

    isSupportedFile(attachment) {
        return attachment?.name && ApplicationConfig.isSupportedFile(attachment.name);
    },

    isFilenameSupported(filename) {
        return ApplicationConfig.isSupportedFile(filename);
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
