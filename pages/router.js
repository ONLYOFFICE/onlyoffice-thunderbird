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
import { ErrorComponent } from '../components/error/error.js';

export class Router {
  constructor(containerId = 'app-container') {
    this.container = document.getElementById(containerId);
    this.currentPage = null;
    this.currentPageName = null;
    this.routes = new Map();
    this.isNavigating = false;
  }

  registerRoute(pageName, pageComponent) {
    this.routes.set(pageName, pageComponent);
  }

  async navigate(pageName, data = null) {
    if (this.isNavigating) return;
    this.isNavigating = true;

    try {
      const route = this.routes.get(pageName);
      if (!route) {
        const errorMsg = messenger.i18n.getMessage('routeNotFound');
        throw new Error(errorMsg.replace('__%ROUTE%__', pageName));
      }

      if (this.currentPage?.cleanup) await this.currentPage.cleanup();

      this.container.innerHTML = '';
      const content = await route.render(data);
      if (!content) {
        const errorMsg = messenger.i18n.getMessage('routeRenderNull').replace('__%ROUTE%__', pageName);
        throw new Error(errorMsg);
      }

      content.style.opacity = '0';
      this.container.appendChild(content);

      requestAnimationFrame(() => {
        content.style.animation = 'fadeIn 300ms ease-in';
        content.style.opacity = '1';
      });

      this.currentPage = route;
      this.currentPageName = pageName;

      if (route.init) await route.init(data);
    } catch (error) {
      if (pageName !== 'error') {
        this.isNavigating = false;
        await this.navigate('error', {
          title: messenger.i18n.getMessage('navigationFailed'),
          message: error.message,
        });
      } else {
        this.container.innerHTML = '';
        this.container.appendChild(ErrorComponent.createTemplate(
          messenger.i18n.getMessage('error'),
          error.message,
        ));
      }
    } finally {
      this.isNavigating = false;
    }
  }
}

export class TemplateRenderer {
  static templates = new Map();

  static async loadTemplates() {
    const paths = [
      '../components/empty/empty.html',
      '../components/loader/loader.html',
      '../components/error/error.html',
      '../components/file/list.html',
      '../components/file/item.html',
      '../components/create/create.html',
    ];

    await Promise.all(paths.map(async (path) => {
      try {
        const response = await fetch(path);
        if (!response.ok) return;

        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        doc.querySelectorAll('template').forEach((template) => {
          this.templates.set(template.id, template);
        });
      } catch (error) {
        console.warn(`Failed to load templates from ${path}:`, error);
      }
    }));
  }

  static render(templateId, data = {}) {
    const template = this.templates.get(templateId);
    if (!template) {
      const errorMsg = messenger.i18n.getMessage('templateRenderFailed');
      const finalMsg = errorMsg
        ? errorMsg.replace('__%TEMPLATE%__', templateId)
        : `Template not found: ${templateId}`;
      throw new Error(finalMsg);
    }

    const container = document.createElement('div');
    container.appendChild(template.content.cloneNode(true));

    Object.entries(data || {}).forEach(([key, value]) => {
      container.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => {
        if (el.tagName === 'IMG') el.src = value;
        else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value;
        else el.textContent = value;
      });
    });

    return container.firstElementChild;
  }
}

export class PageComponent {
  constructor(templateId) {
    this.templateId = templateId;
    this.element = null;
  }

  async render(data) {
    this.element = TemplateRenderer.render(this.templateId, data);
    if (!this.element) {
      const errorMsg = messenger.i18n.getMessage('templateRenderFailed');
      const finalMsg = errorMsg
        ? errorMsg.replace('__%TEMPLATE%__', this.templateId)
        : `Failed to render template: ${this.templateId}`;
      throw new Error(finalMsg);
    }

    return this.element;
  }

  async init() {
    // Override in subclasses
  }

  async cleanup() {
    // Override in subclasses
  }

  querySelector(selector) {
    return this.element?.querySelector(selector);
  }
}
