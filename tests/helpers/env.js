/**
 * Test environment: stubs for the Thunderbird WebExtension globals
 * (`browser`, `messenger`, `window`) and a `fetch` that serves files
 * from the repository root, so source modules can be imported in Node.
 *
 * Import this module FIRST in every test file (ESM evaluates imports in order).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const fetchOverrides = new Map();

const makeResponse = (status, buffer) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => JSON.parse(buffer.toString('utf8')),
  text: async () => buffer.toString('utf8'),
  arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
});

globalThis.fetch = async (url) => {
  const rel = String(url).replace(/^\.\//, '');
  if (fetchOverrides.has(rel)) {
    return makeResponse(200, Buffer.from(JSON.stringify(fetchOverrides.get(rel))));
  }
  try {
    return makeResponse(200, await readFile(path.join(ROOT, rel)));
  } catch {
    return makeResponse(404, Buffer.from(''));
  }
};

globalThis.messenger = {
  i18n: {
    getMessage: (key) => key,
    getUILanguage: () => globalThis.messenger.uiLanguage,
  },
  uiLanguage: 'en-US',
};

globalThis.window = {
  location: { search: '' },
  addEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
};

export const calls = [];

globalThis.browser = {
  runtime: {
    getURL: (p) => p,
    sendMessage: async () => ({ success: false }),
  },
  accounts: { list: async () => [] },
  compose: {
    addAttachment: async (tabId, att) => { calls.push(['addAttachment', tabId, att]); },
    removeAttachment: async (tabId, id) => { calls.push(['removeAttachment', tabId, id]); },
  },
};

export const testConfig = (overrides = {}) => ({
  server: { url: 'https://docs.example.com/', secret: '', ...overrides },
  ui: { window: { width: 900, height: 700 } },
  vendor: { formats: './vendor/document-formats/onlyoffice-docs-formats.json' },
  limits: { maxFileSizeMB: 100 },
});
