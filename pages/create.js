import { CreatePage, ErrorPage, LoadingPage } from './pages.js';

import { ErrorComponent } from '../components/error/error.js';
import { LoaderComponent } from '../components/loader/loader.js';

import { Router, TemplateRenderer } from './router.js';

const App = {
  async init() {
    try {
      const router = new Router('app-container');

      LoaderComponent.init();
      ErrorComponent.init();
      await TemplateRenderer.loadTemplates();

      router.registerRoute('loading', new LoadingPage());
      router.registerRoute('create', new CreatePage());
      router.registerRoute('error', new ErrorPage());

      await router.navigate('create');
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
