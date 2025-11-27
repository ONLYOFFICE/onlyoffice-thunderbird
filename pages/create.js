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
