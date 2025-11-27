import { logger } from './logger.js';
import { JwtManager } from './jwt.js';
import { ThunderbirdAPI } from './api.js';
import { FileOperations } from './file.js';
import { ApplicationConfig } from './config.js';
import { FORMAT_ACTIONS, ACTIONS } from './constants.js';

const getComposeTabId = () => new URLSearchParams(window.location.search).get('composeTabId');

export const DocumentEditor = {
  instance: null,
  config: null,
  unsavedChanges: false,

  _getPermissions(extension) {
    const format = ApplicationConfig.formatsData?.find((f) => f.name === extension);
    const actions = format?.actions || [];

    return {
      download: true,
      edit: actions.includes(FORMAT_ACTIONS.EDIT),
      print: true,
      review: actions.includes(FORMAT_ACTIONS.REVIEW),
      comment: actions.includes(FORMAT_ACTIONS.COMMENT),
      fillForms: actions.includes(FORMAT_ACTIONS.FILL),
      modifyFilter: actions.includes(FORMAT_ACTIONS.CUSTOM_FILTER),
      modifyContentControl: actions.includes(FORMAT_ACTIONS.EDIT),
    };
  },

  async _getUserInfo() {
    try {
      const response = await browser.runtime.sendMessage({
        action: ACTIONS.GET_USER_INFO,
      });

      if (response?.success && response?.userInfo) return response.userInfo;
    } catch (error) {
      logger.warn('Could not fetch user info from Thunderbird:', error);
    }

    return {};
  },

  async loadApiJs() {
    const url = ApplicationConfig.docServerUrl;
    if (!url) throw new Error(messenger.i18n.getMessage('errorDocServerNotConfigured'));

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${url}/web-apps/apps/api/documents/api.js`;
      script.onload = resolve;
      script.onerror = () => {
        const errMsg = messenger.i18n.getMessage('errorFailedLoadDocApi');
        reject(new Error(errMsg.replace('__%URL%__', url)));
      };
      document.head.appendChild(script);
    });
  },

  onAppReady(data) {
    if (this.config.document.url === '_data_') this.instance.openDocument(FileOperations.convertBase64(data));
  },

  async saveFile(blob, name) {
    const details = await ThunderbirdAPI.getComposeDetails();
    const attachment = details?.attachments?.find((att) => att.name === name);
    if (!attachment) throw new Error(messenger.i18n.getMessage('errorAttachmentNotFoundInCompose'));

    const response = await ThunderbirdAPI.saveComposeAttachment(
      attachment.id,
      await blob.arrayBuffer(),
      name,
      attachment.contentType || 'application/octet-stream',
    );

    if (!response.success) throw new Error(messenger.i18n.getMessage('errorFailedSaveFile'));
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
      let blob;
      if (event.data?.url) {
        const response = await fetch(event.data.url);
        blob = await response.blob();
      } else {
        blob = new Blob([event.data]);
      }

      getComposeTabId()
        ? await this.saveFile(blob, name)
        : this.downloadFile(blob, name);

      this.unsavedChanges = false;
    } catch (error) {
      console.error('Error saving document:', error);
    }
  },

  async buildConfig(data, name, extension, type, onReady) {
    const permissions = this._getPermissions(extension);
    const mode = permissions.edit ? 'edit' : 'view';
    const userInfo = await this._getUserInfo();

    const config = {
      documentData: data,
      document: {
        fileType: extension,
        key: `${Math.random().toString(36).substring(2, 9)}`,
        title: name,
        url: '_data_',
        permissions,
      },
      documentType: type,
      type: 'desktop',
      height: '100%',
      width: '100%',
      editorConfig: {
        mode,
        user: userInfo,
        customization: {
          about: false,
          feedback: false,
          forcesave: false,
        },
      },
      events: {
        onAppReady: () => {
          this.onAppReady(data);
          if (onReady) onReady();
        },
        onError: () => {
          if (onReady) onReady();
        },
        onSaveDocument: (event) => this.onSaveDocument(event, name),
        onDocumentStateChange: () => { this.unsavedChanges = true; },
        onDownloadAs: (event) => this.onSaveDocument(event, name),
      },
    };

    if (ApplicationConfig.docServerSecret) {
      const payload = {
        document: config.document,
        documentType: config.documentType,
        type: config.type,
        editorConfig: {
          mode: config.editorConfig.mode,
          user: config.editorConfig.user,
          customization: config.editorConfig.customization,
        },
      };

      logger.debug('JWT Payload:', JSON.stringify(payload));

      const token = await JwtManager.generate(payload, ApplicationConfig.docServerSecret);
      if (token) {
        logger.debug('Generated JWT Token:', token);
        config.token = token;
      } else {
        logger.error('Failed to generate JWT token');
      }
    }

    return config;
  },

  setupUnsavedChangesWarning() {
    window.addEventListener('beforeunload', (event) => {
      if (this.unsavedChanges) {
        event.preventDefault();
      }
    });
  },

  async init(data, name, extension, type, onReady) {
    await this.loadApiJs();
    if (typeof DocsAPI === 'undefined') throw new Error(messenger.i18n.getMessage('errorDocApiNotLoaded'));

    this.config = await this.buildConfig(data, name, extension, type, onReady);
    this.instance = new DocsAPI.DocEditor('placeholder', this.config);
    this.setupUnsavedChangesWarning();
  },
};
