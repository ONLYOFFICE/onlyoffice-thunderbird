import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { fetchOverrides, testConfig } from './helpers/env.js';

import { ApplicationConfig } from '../common/config.js';
import { DocumentEditor } from '../common/editor.js';

const SECRET = 'editor-test-secret';

before(async () => {
  fetchOverrides.set('config/config.json', testConfig({ secret: SECRET }));
  await ApplicationConfig.init();
  browser.runtime.sendMessage = async () => ({
    success: true,
    userInfo: { id: 'id1', name: 'Test User', email: 'user@example.com' },
  });
});

test('permissions follow format actions: docx editable, doc view-only, pdf fillable', () => {
  const docx = DocumentEditor._getPermissions('docx');
  assert.equal(docx.edit, true);
  assert.equal(docx.review, true);

  const doc = DocumentEditor._getPermissions('doc');
  assert.equal(doc.edit, false);
  assert.equal(doc.download, true);

  assert.equal(DocumentEditor._getPermissions('pdf').fillForms, true);
});

test('buildConfig passes the file inline (_data_) in edit mode for docx', async () => {
  const cfg = await DocumentEditor.buildConfig('QUJD', 'a.docx', 'docx', 'word');

  assert.equal(cfg.document.url, '_data_');
  assert.equal(cfg.document.fileType, 'docx');
  assert.equal(cfg.type, 'desktop');
  assert.equal(cfg.editorConfig.mode, 'edit');
  assert.equal(cfg.editorConfig.user.email, 'user@example.com');
  assert.ok(cfg.document.key, 'document key must be set');
});

test('buildConfig uses view mode for non-editable formats', async () => {
  const cfg = await DocumentEditor.buildConfig('QUJD', 'a.doc', 'doc', 'word');
  assert.equal(cfg.editorConfig.mode, 'view');
});

test('buildConfig signs the config with the server secret', async () => {
  const cfg = await DocumentEditor.buildConfig('QUJD', 'a.xlsx', 'xlsx', 'cell');
  const [h, p, s] = cfg.token.split('.');

  assert.equal(s, createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url'));
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  assert.equal(payload.document.key, cfg.document.key);
  assert.equal(payload.editorConfig.mode, 'edit');
  assert.equal(payload.documentData, undefined, 'file bytes must not be put into the JWT');
});

test('document keys are unique per open (no co-editing session reuse)', async () => {
  const a = await DocumentEditor.buildConfig('QUJD', 'a.docx', 'docx', 'word');
  const b = await DocumentEditor.buildConfig('QUJD', 'a.docx', 'docx', 'word');
  assert.notEqual(a.document.key, b.document.key);
});
