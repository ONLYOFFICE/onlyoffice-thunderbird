/**
 *
 * (c) Copyright Ascensio System SIA 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import {
  LoadingPage, EmptyPage, ErrorPage, FileListPage, ViewerPage,
} from './pages.js';

import { ErrorComponent } from '../components/error/error.js';
import { LoaderComponent } from '../components/loader/loader.js';
import { EmptyStateComponent } from '../components/empty/empty.js';
import { FileListComponent } from '../components/file/list.js';

import { Router, TemplateRenderer } from './router.js';

import { ApplicationConfig } from '../common/config.js';
import { FileOperations } from '../common/file.js';
import { ThunderbirdAPI } from '../common/api.js';
import { EVENTS } from '../common/constants.js';

const App = {
  async init() {
    try {
      const router = new Router('app-container');

      LoaderComponent.init();
      EmptyStateComponent.init();
      ErrorComponent.init();
      FileListComponent.init();
      await TemplateRenderer.loadTemplates();

      router.registerRoute('loading', new LoadingPage());
      router.registerRoute('empty', new EmptyPage());
      router.registerRoute('error', new ErrorPage());
      router.registerRoute('files', new FileListPage());
      router.registerRoute('viewer', new ViewerPage());

      await router.navigate('loading', { message: messenger.i18n.getMessage('loadingDocuments') });
      await ApplicationConfig.init();
      const attachments = (await ThunderbirdAPI.getAttachments())
        .filter((att) => FileOperations.isSupportedFile(att));

      const params = new URLSearchParams(window.location.search);
      const attachmentId = params.get('attachmentId');
      const attachmentName = params.get('attachmentName');
      const attachmentPartName = params.get('attachmentPartName');
      const composeTabId = params.get('composeTabId');
      const isCompose = !!composeTabId;

      if (attachmentName && attachments.length) {
        let attachment = null;
        if (attachmentId) {
          attachment = attachments.find((att) => att.id && att.id.toString() === attachmentId);
        }
        if (!attachment && attachmentPartName) {
          attachment = attachments.find((att) => att.partName === attachmentPartName);
        }
        if (!attachment) attachment = attachments.find((att) => att.name === attachmentName);

        if (attachment) await router.navigate('viewer', { file: attachment });
        else {
          await router.navigate(
            attachments.length ? 'files' : 'empty',
            attachments.length ? { files: attachments } : { isCompose },
          );
        }
      } else {
        await router.navigate(
          attachments.length ? 'files' : 'empty',
          attachments.length ? { files: attachments } : { isCompose },
        );
      }

      window.addEventListener(EVENTS.FILE_OPEN, async (e) => {
        try {
          await router.navigate('viewer', { file: e.detail.file });
        } catch (error) {
          router.navigate('error', {
            title: messenger.i18n.getMessage('cannotOpenFile'),
            message: error.message,
          });
        }
      });

      window.addEventListener(EVENTS.FILE_DOWNLOAD, async (e) => {
        try {
          const arrayBuffer = await ThunderbirdAPI.getAttachmentData(e.detail.file);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(new Blob([arrayBuffer]));
          link.download = e.detail.file.name;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(link.href);
        } catch (error) {
          router.navigate('error', {
            title: messenger.i18n.getMessage('downloadFailed'),
            message: error.message,
          });
        }
      });
    } catch (error) {
      ErrorComponent.show(
        messenger.i18n.getMessage('initializationFailed'),
        error.message,
      );
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
