import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOverrides, testConfig } from './helpers/env.js';

import { ApplicationConfig } from '../common/config.js';

before(async () => {
  fetchOverrides.set('config/config.json', testConfig());
  await ApplicationConfig.init();
});

test('sanitizeUrl strips trailing slashes', () => {
  assert.equal(ApplicationConfig.sanitizeUrl('https://docs.example.com///'), 'https://docs.example.com');
});

test('sanitizeUrl rejects empty and non-https URLs', () => {
  assert.throws(() => ApplicationConfig.sanitizeUrl(''), /errorServerUrlRequired/);
  assert.throws(() => ApplicationConfig.sanitizeUrl('http://docs.example.com'), /errorServerUrlInvalidProtocol/);
  assert.throws(() => ApplicationConfig.sanitizeUrl('$SERVER_URL$'), /errorServerUrlInvalidProtocol/);
});

test('init loads server URL and the vendored formats list', () => {
  assert.equal(ApplicationConfig.docServerUrl, 'https://docs.example.com');
  assert.ok(Array.isArray(ApplicationConfig.formatsData));
  assert.ok(ApplicationConfig.formatsData.length > 50);
});

test('documents are grouped by editor type', () => {
  const types = Object.keys(ApplicationConfig.documents);
  for (const t of ['word', 'cell', 'slide', 'pdf']) assert.ok(types.includes(t), `missing type ${t}`);
  assert.ok(ApplicationConfig.documents.word.extensions.includes('docx'));
  assert.ok(ApplicationConfig.documents.cell.extensions.includes('xlsx'));
});

test('supported files: office formats yes, others no, case-insensitive', () => {
  for (const name of ['a.docx', 'b.XLSX', 'c.pptx', 'd.pdf', 'e.odt', 'f.doc']) {
    assert.ok(ApplicationConfig.isSupportedFile(name), name);
  }
  for (const name of ['a.exe', 'b.zip', 'noext', '', null, 'photo.jpg']) {
    assert.ok(!ApplicationConfig.isSupportedFile(name), String(name));
  }
});

test('getWindowDefaults comes from config.ui.window', () => {
  assert.deepEqual(ApplicationConfig.getWindowDefaults(), { width: 900, height: 700 });
});
