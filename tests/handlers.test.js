import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { calls } from './helpers/env.js';

import { MessageHandlers } from '../common/handlers.js';

const call = (action, request) => new Promise((resolve) => {
  MessageHandlers[action]({ action, ...request }, resolve);
});

beforeEach(() => { calls.length = 0; });

for (const [type, ext] of [['document', '.docx'], ['spreadsheet', '.xlsx'], ['presentation', '.pptx']]) {
  test(`createNewDocument attaches a ${ext} template to the compose tab`, async () => {
    messenger.uiLanguage = 'de-DE';
    const res = await call('createNewDocument', { composeTabId: '7', title: 'Plan', type });

    assert.equal(res.success, true);
    assert.equal(res.filename, `Plan${ext}`);
    const [name, tabId, att] = calls[0];
    assert.equal(name, 'addAttachment');
    assert.equal(tabId, 7);
    assert.equal(att.name, `Plan${ext}`);
    assert.ok(att.file.size > 1000, 'template file must not be empty');
  });
}

test('createNewDocument falls back to the default template for unknown locales', async () => {
  messenger.uiLanguage = 'xx-YY';
  const res = await call('createNewDocument', { composeTabId: '1', title: 'T', type: 'document' });
  assert.equal(res.success, true);
});

test('saveComposeAttachment replaces the attachment (remove, then add)', async () => {
  const res = await call('saveComposeAttachment', {
    composeTabId: '3', attachmentId: 42, data: [80, 75, 3, 4], name: 'a.docx',
  });

  assert.equal(res.success, true);
  assert.deepEqual(calls.map((c) => c[0]), ['removeAttachment', 'addAttachment']);
  assert.equal(calls[0][2], 42);
  assert.equal(calls[1][2].name, 'a.docx');
  assert.equal(calls[1][2].file.size, 4);
});

test('getUserInfo returns the first identity of the first account', async () => {
  browser.accounts.list = async () => [
    { identities: [{ id: 'i1', name: 'Ann', email: 'ann@example.com' }] },
    { identities: [{ id: 'i2', name: 'Bob', email: 'bob@example.com' }] },
  ];
  const res = await call('getUserInfo', {});
  assert.deepEqual(res.userInfo, { id: 'i1', name: 'Ann', email: 'ann@example.com' });
});

test('handler errors are returned as { success: false, error }', async () => {
  const res = await call('getComposeDetails', {});
  assert.equal(res.success, false);
  assert.equal(res.error, 'errorNoComposeTabId');
});
