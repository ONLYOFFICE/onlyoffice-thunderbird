import { LoadingPage, EmptyPage, ErrorPage, FileListPage, ViewerPage } from './pages.js';

import { ErrorComponent } from '../components/error/error.js';
import { LoaderComponent } from '../components/loader/loader.js';
import { EmptyStateComponent } from '../components/empty/empty.js';
import { FileListComponent } from '../components/file/list.js';

import { Router, TemplateRenderer } from './router.js';

import { CONFIG } from '../common/config.js';
import { FileOperations } from '../common/file.js';
import { ThunderbirdAPI } from '../common/api.js';

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
            
            await router.navigate('loading', { message: 'Loading documents...' });
            await CONFIG.init();
            const attachments = (await ThunderbirdAPI.getAttachments())
                .filter(att => FileOperations.isSupportedFile(att));
            
            await router.navigate(attachments.length ? 'files' : 'empty', 
                attachments.length ? { files: attachments } : {
                    title: 'No documents here yet',
                    subtitle: 'Any supported files you upload will show up here.'
                });
            
            window.addEventListener('file:open', async (e) => {
                try {
                    await router.navigate('viewer', { file: e.detail.file });
                } catch (error) {
                    router.navigate('error', { title: 'Cannot Open File', message: error.message });
                }
            });

            window.addEventListener('file:download', async (e) => {
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
                    router.navigate('error', { title: 'Download Failed', message: error.message });
                }
            });
        } catch (error) {
            ErrorComponent.show('Initialization Failed', error.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
