import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOverrides, testConfig } from './helpers/env.js';

import { ApplicationConfig } from '../common/config.js';
import { FileOperations } from '../common/file.js';

before(async () => {
  fetchOverrides.set('config/config.json', testConfig());
  await ApplicationConfig.init();
});

test('getFileExtension lowercases and handles empty input', () => {
  assert.equal(FileOperations.getFileExtension('Report.Final.DOCX'), 'docx');
  assert.equal(FileOperations.getFileExtension(undefined), '');
});

test('getFileType maps extensions to Docs documentType, defaults to word', () => {
  assert.equal(FileOperations.getFileType('docx'), 'word');
  assert.equal(FileOperations.getFileType('xlsx'), 'cell');
  assert.equal(FileOperations.getFileType('pptx'), 'slide');
  assert.equal(FileOperations.getFileType('pdf'), 'pdf');
  assert.equal(FileOperations.getFileType('unknown'), 'word');
});

test('base64 conversion round-trips binary data', () => {
  const bytes = new Uint8Array([0, 1, 127, 128, 255, 80, 75, 3, 4]);
  const b64 = FileOperations.convertBuffer(bytes.buffer);
  assert.deepEqual(FileOperations.convertBase64(b64), bytes);
});

test('formatSize', () => {
  assert.equal(FileOperations.formatSize(0), '0 Bytes');
  assert.equal(FileOperations.formatSize(1024), '1.00 Kb');
  assert.equal(FileOperations.formatSize(5 * 1024 * 1024), '5.00 Mb');
});

test('findAttachments walks nested MIME parts and keeps only supported files', async () => {
  const parts = [
    { contentType: 'text/plain', partName: '1' },
    {
      contentType: 'multipart/mixed',
      parts: [
        { name: 'a.docx', partName: '1.2', size: 10 },
        { name: 'virus.exe', partName: '1.3' },
        { parts: [{ name: 'b.pdf', partName: '1.4.1' }] },
      ],
    },
  ];
  const found = await FileOperations.findAttachments(parts);
  assert.deepEqual(found.map((f) => f.name), ['a.docx', 'b.pdf']);
  assert.equal(found[1].contentType, 'application/octet-stream');
});
