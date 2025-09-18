const urlParams = new URLSearchParams(window.location.search);
const messageId = urlParams.get('messageId');
const composeTabId = urlParams.get('composeTabId');

let docEditor;

const CONFIG = {
    documents: {
        word: {
            extensions: ['docx', 'doc'],
            mimeTypes: [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword'
            ],
            icon: '📄'
        },
        cell: {
            extensions: ['xlsx', 'xls'],
            mimeTypes: [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ],
            icon: '📊'
        },
        slide: {
            extensions: ['pptx', 'ppt'],
            mimeTypes: [
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.ms-powerpoint'
            ],
            icon: '📑'
        }
    },
    genericMimeTypes: [
        'application/octet-stream',
        'application/zip',
        'application/x-zip',
        'application/x-zip-compressed'
    ],
    defaultDocServerUrl: 'http://127.0.0.1:7070'
};

CONFIG.getSupportedExtensions = function() {
    return Object.values(this.documents)
        .flatMap(doc => doc.extensions);
};

CONFIG.getOfficeMimeTypes = function() {
    return Object.values(this.documents)
        .flatMap(doc => doc.mimeTypes);
};

CONFIG.getFileIcon = function(extension) {
    for (const [, docType] of Object.entries(this.documents)) {
        if (docType.extensions.includes(extension)) {
            return docType.icon;
        }
    }
    return '📄';
};

const utils = {
    arrayBufferToBase64(buffer) {
        return btoa(
            Array.from(new Uint8Array(buffer))
                .map(byte => String.fromCharCode(byte))
                .join('')
        );
    },

    base64ToUint8Array(base64) {
        const binary = atob(base64);
        return new Uint8Array(Array.from(binary, char => char.charCodeAt(0)));
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
    },

    getFileExtension(filename) {
        return filename ? filename.toLowerCase().split('.').pop() : '';
    },

    getDocumentType(fileExtension) {
        for (const [type, docType] of Object.entries(CONFIG.documents)) {
            if (docType.extensions.includes(fileExtension)) {
                return type;
            }
        }
        return 'word';
    },

    isOfficeDocument(attachment) {
        if (!attachment?.name) return false;
        
        const ext = this.getFileExtension(attachment.name);
        const contentType = attachment.contentType || '';
        
        const isOfficeExt = CONFIG.getSupportedExtensions().includes(ext);
        const isOfficeMime = CONFIG.getOfficeMimeTypes().includes(contentType);
        
        return CONFIG.genericMimeTypes.includes(contentType) ? isOfficeExt : (isOfficeExt || isOfficeMime);
    },

    async fetchAttachmentData(file) {
        if (composeTabId) {
            const response = await browser.runtime.sendMessage({
                action: 'getAttachmentData',
                composeTabId: parseInt(composeTabId),
                attachmentId: file.id
            });
            if (!response.success) throw new Error(response.error || 'Failed to get attachment data');
            return response.data;
        }
        
        const response = await fetch(file.url, { credentials: 'include' });
        if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
        return response.arrayBuffer();
    }
};

function createFileListItem(file, isCompose = false) {
    const ext = utils.getFileExtension(file.name);
    const li = document.createElement('li');
    li.className = 'file-item';
    
    const fileIcon = document.createElement('div');
    fileIcon.className = 'file-icon';
    fileIcon.textContent = CONFIG.getFileIcon(ext) || '📄';

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    
    const fileMeta = document.createElement('div');
    fileMeta.className = 'file-meta';
    fileMeta.innerHTML = `${ext.toUpperCase()} • ${utils.formatFileSize(file.size)}`;
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileMeta);
    
    const button = document.createElement('button');
    button.className = 'onlyoffice-button';
    button.textContent = 'Open in ONLYOFFICE';
    button.onclick = () => openInDocServer(file);
    
    li.appendChild(fileIcon);
    li.appendChild(fileInfo);
    li.appendChild(button);
    
    return li;
}

async function loadApiJs(docServerUrl) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${docServerUrl}/web-apps/apps/api/documents/api.js`;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load ONLYOFFICE Document API'));
        document.head.appendChild(script);
    });
}

function getOrCreateElement(id, parentId, creator) {
    let element = document.getElementById(id);
    if (!element) {
        element = creator();
        element.id = id;
        const parent = document.getElementById(parentId) || document.body;
        parent.appendChild(element);
    }
    return element;
}

async function openInDocServer(file) {
    const editorContainer = getOrCreateElement('editor-container', null, () => {
        const container = document.createElement('div');
        return container;
    });

    const placeholder = getOrCreateElement('placeholder', 'editor-container', () => {
        const ph = document.createElement('div');
        return ph;
    });

    try {
        editorContainer.style.display = 'block';
        placeholder.innerHTML = '<h2>Loading document...</h2>';
        
        const docServerUrl = localStorage.getItem('docServerUrl') || CONFIG.defaultDocServerUrl;
        const arrayBuffer = await utils.fetchAttachmentData(file);
        const base64Data = utils.arrayBufferToBase64(arrayBuffer);
        const fileExt = utils.getFileExtension(file.name);
        
        await initEditor(base64Data, file.name, fileExt, utils.getDocumentType(fileExt));
    } catch (error) {
        console.error('Error opening file:', error);
        editorContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

async function saveDocument(event, fileName) {
    try {
        const blob = new Blob([event.data]);
        if (composeTabId) {
            const details = await browser.runtime.sendMessage({
                action: 'getComposeDetails',
                composeTabId: parseInt(composeTabId)
            });
            
            const attachment = details?.attachments?.find(att => att.name === fileName);
            if (!attachment) throw new Error('Attachment not found in compose window');

            const arrayBuffer = await blob.arrayBuffer();
            const saveResp = await browser.runtime.sendMessage({
                action: 'saveComposeAttachment',
                composeTabId: parseInt(composeTabId),
                attachmentId: parseInt(attachment.id),
                data: Array.from(new Uint8Array(arrayBuffer)),
                contentType: attachment.contentType || 'application/octet-stream',
                name: attachment.name
            });
            if (!saveResp.success) throw new Error(saveResp.error);
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error("Error saving document:", error);
        throw error;
    }
}

async function initEditor(fileData, fileName, fileExtension, docType) {
    try {
        const docServerUrl = localStorage.getItem('docServerUrl') || CONFIG.defaultDocServerUrl;
        await loadApiJs(docServerUrl);

        if (typeof DocsAPI === 'undefined') {
            throw new Error('ONLYOFFICE Document API not loaded');
        }

        const config = {
            documentData: fileData,
            document: {
                fileType: fileExtension,
                title: fileName,
                key: Date.now().toString(),
                url: "_data_",
                permissions: {
                    download: true,
                    edit: true,
                    print: true,
                    review: false
                }
            },
            documentType: docType,
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
                onAppReady: () => {
                    if (config.document.url === "_data_") {
                        docEditor.openDocument(utils.base64ToUint8Array(fileData));
                    }
                },
                onSaveDocument: (event) => saveDocument(event, fileName)
            }
        };

        docEditor = new DocsAPI.DocEditor('placeholder', config);
        document.getElementById('editor-container').style.display = 'block';
    } catch (error) {
        console.error('Editor initialization failed:', error);
        document.getElementById('placeholder').innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        throw error;
    }
}

async function getAttachments() {
    if (composeTabId) {
        const details = await browser.runtime.sendMessage({
            action: 'getComposeDetails',
            composeTabId: parseInt(composeTabId),
            windowId: (await browser.windows.getCurrent()).id
        });
        
        if (!details?.attachments) throw new Error('No attachments found');
        return details.attachments;
    } else if (messageId) {
        const message = await browser.runtime.sendMessage({
            action: 'getMessageData',
            messageId: parseInt(messageId)
        });
        
        if (!message?.attachments) throw new Error('No attachments found');
        return message.attachments;
    }
    throw new Error('No valid message or compose ID');
}

async function initViewer() {
    try {
        const attachments = await getAttachments();
        const officeFiles = attachments.filter(utils.isOfficeDocument.bind(utils));
        displayFileList(officeFiles, !!composeTabId);
    } catch (error) {
        console.error('Viewer initialization failed:', error);
        document.getElementById('files-container').innerHTML = 
            `<div class="error-message">${error.message}</div>`;
    }
}

function displayFileList(files, isCompose) {
    const fileList = document.getElementById('file-list');
    const noFiles = document.getElementById('no-files');
    
    if (!files.length) {
        fileList.style.display = 'none';
        noFiles.style.display = 'block';
        noFiles.textContent = 'No Office documents found';
        return;
    }
    
    noFiles.style.display = 'none';
    fileList.innerHTML = '';
    files.forEach(file => fileList.appendChild(createFileListItem(file, isCompose)));
}

async function testDocServer(url) {
    if (!url) {
        throw new Error('Please enter a Document Server URL');
    }
    
    const response = await fetch(`${url}/favicon.ico`);
    if (!response.ok) {
        throw new Error('Failed to connect to server');
    }
    return 'Successfully connected to ONLYOFFICE Document Server';
}

function initSettings() {
    const elements = {
        showSettings: document.getElementById('show-settings'),
        container: document.getElementById('settings-container'),
        closeBtn: document.getElementById('close-settings'),
        saveBtn: document.getElementById('save-settings'),
        urlInput: document.getElementById('docserver-url'),
        testBtn: document.getElementById('test-docserver')
    };

    if (Object.values(elements).some(el => !el)) {
        console.warn('Some settings elements are missing');
        return;
    }
    
    browser.storage.local.get('docServerUrl').then(result => {
        elements.urlInput.value = result.docServerUrl || CONFIG.defaultDocServerUrl;
        localStorage.setItem('docServerUrl', elements.urlInput.value);
    });
    
    elements.showSettings.onclick = () => elements.container.style.display = 'block';
    elements.closeBtn.onclick = () => elements.container.style.display = 'none';
    
    elements.saveBtn.onclick = async () => {
        const url = elements.urlInput.value.trim();
        await browser.storage.local.set({ docServerUrl: url });
        localStorage.setItem('docServerUrl', url);
        elements.container.style.display = 'none';
        window.location.reload();
    };
    
    elements.testBtn.onclick = async () => {
        try {
            const message = await testDocServer(elements.urlInput.value.trim());
            alert(message);
        } catch (error) {
            alert(error.message);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    initViewer();
});