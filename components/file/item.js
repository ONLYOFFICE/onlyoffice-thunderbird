import { ApplicationConfig } from '../../common/config.js';
import { FileOperations } from '../../common/file.js';

export const FileComponents = {
    _createElement(tag, className, attributes = {}) {
        const el = document.createElement(tag);
        if (className) 
            el.className = className;
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

    createFileItem(file) {
        const extension = FileOperations.getFileExtension(file.name);
        const isEditable = this._isExtensionEditable(extension);
        
        const li = this._createElement('li', 'file-item');
        li.appendChild(this._createFileIcon(file));
        li.appendChild(this._createFileInfo(file));
        li.appendChild(this._createFileActions(file, isEditable));
        
        return li;
    },

    _createFileIcon(file) {
        const iconDiv = this._createElement('div', 'file-item__icon');
        const img = this._createElement('img', '', {
            src: this._getFileIcon(file),
            alt: 'File icon'
        });
        iconDiv.appendChild(img);
        return iconDiv;
    },

    _createFileInfo(file) {
        const extension = FileOperations.getFileExtension(file.name);
        const baseName = file.name.substring(0, file.name.length - extension.length - 1);
        
        const infoDiv = this._createElement('div', 'file-item__info');
        infoDiv.appendChild(this._createFileName(baseName, extension));
        infoDiv.appendChild(this._createFileMeta(file.size));
        
        return infoDiv;
    },

    _createFileName(baseName, extension) {
        const nameDiv = this._createElement('div', 'file-item__name');
        nameDiv.appendChild(document.createTextNode(baseName));
        
        if (extension) {
            nameDiv.appendChild(document.createTextNode('.'));
            const extSpan = this._createElement('span', 'file-item__extension', {
                textContent: extension
            });
            nameDiv.appendChild(extSpan);
        }
        
        return nameDiv;
    },

    _createFileMeta(fileSize) {
        return this._createElement('div', 'file-item__meta', {
            textContent: FileOperations.formatSize(fileSize)
        });
    },

    _createFileActions(file, isEditable) {
        const actionsDiv = this._createElement('div', 'file-item__actions');
        actionsDiv.appendChild(this._createActionButton(
            isEditable ? 'images/pencil.svg' : 'images/eye.svg',
            isEditable ? 'Edit in ONLYOFFICE' : 'View in ONLYOFFICE',
            (e) => this._handleOpenClick(e, file, actionsDiv)
        ));

        actionsDiv.appendChild(this._createActionButton(
            'images/download.svg',
            'Download',
            (e) => this._handleDownloadClick(e, file, actionsDiv)
        ));

        return actionsDiv;
    },

    _createActionButton(iconPath, label, onClickHandler) {
        const btn = this._createElement('button', 'file-item__action-button', {
            title: label,
            'aria-label': label
        });
        const img = this._createElement('img', '', {
            src: this._getBrowserURL(iconPath),
            alt: ''
        });
        btn.appendChild(img);
        btn.addEventListener('click', onClickHandler);
        return btn;
    },

    _getBrowserURL(imagePath) {
        return typeof browser !== 'undefined' 
            ? browser.runtime.getURL(imagePath)
            : imagePath;
    },

    async _handleOpenClick(e, file, actionsDiv) {
        e.preventDefault();
        this._disableButtons(actionsDiv);
        try {
            window.dispatchEvent(new CustomEvent('file:open', {
                detail: { file }
            }));
        } catch (error) {
            console.error('Error opening file:', error);
            this._enableButtons(actionsDiv);
        }
    },

    async _handleDownloadClick(e, file, actionsDiv) {
        e.preventDefault();
        this._disableButtons(actionsDiv);
        try {
            window.dispatchEvent(new CustomEvent('file:download', {
                detail: { file }
            }));
            setTimeout(() => this._enableButtons(actionsDiv), 500);
        } catch (error) {
            console.error('Error downloading file:', error);
            this._enableButtons(actionsDiv);
        }
    },

    displayFileList(files, containerId = 'file-list') {
        const fileList = document.getElementById(containerId);
        if (!fileList) return;

        fileList.innerHTML = '';

        if (!files || files.length === 0) {
            const noFilesMsg = document.getElementById('no-files');
            if (noFilesMsg)
                noFilesMsg.classList.add('files-container__empty-message--visible');
            return;
        }

        const noFilesMsg = document.getElementById('no-files');
        if (noFilesMsg)
            noFilesMsg.classList.remove('files-container__empty-message--visible');

        files.forEach(file => {
            fileList.appendChild(this.createFileItem(file));
        });
    },

    _getFileIcon(file) {
        const ext = FileOperations.getFileExtension(file.name).toLowerCase();
        
        const typeIconMap = {
            'word': 'images/word.svg',
            'cell': 'images/cell.svg',
            'slide': 'images/slide.svg',
            'pdf': 'images/pdf.svg',
            'diagram': 'images/diagram.svg'
        };
        
        if (ApplicationConfig.formatsData && Array.isArray(ApplicationConfig.formatsData)) {
            const format = ApplicationConfig.formatsData.find(f => f.name === ext);
            if (format && format.type) {
                const icon = typeIconMap[format.type] || 'images/unknown.svg';
                return this._getBrowserURL(icon);
            }
        }
        
        return this._getBrowserURL('images/unknown.svg');
    },

    _isExtensionEditable(extension) {
        if (!ApplicationConfig.formatsData || !Array.isArray(ApplicationConfig.formatsData)) return false;
        const format = ApplicationConfig.formatsData.find(f => f.name === extension);
        if (!format || !Array.isArray(format.actions)) return false;
        return format.actions.includes('edit');
    },

    _disableButtons(actionsDiv) {
        actionsDiv.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
        });
    },

    _enableButtons(actionsDiv) {
        actionsDiv.querySelectorAll('button').forEach(btn => {
            btn.disabled = false;
        });
    },
};
