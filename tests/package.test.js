/**
 * Static checks of the extension package: manifest, placeholders, locales,
 * vendored submodules, and (if present) the build output.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/env.js';

const readJson = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

test('source config and manifest keep build placeholders (no real URL/secret committed)', () => {
  const config = read('config/config.json');
  assert.match(config, /"\$SERVER_URL\$"/);
  assert.match(config, /"\$SERVER_SECRET\$"/);
  assert.match(read('manifest.json'), /\$SERVER_URL\$\/\*/);
});

test('manifest targets Thunderbird 128+ and references existing files', () => {
  const m = readJson('manifest.json');
  assert.equal(m.manifest_version, 2);
  assert.equal(m.browser_specific_settings.gecko.id, 'support@onlyoffice.com');
  assert.ok(parseInt(m.browser_specific_settings.gecko.strict_min_version, 10) >= 128);
  const files = [
    ...Object.values(m.icons),
    ...m.background.scripts,
    ...Object.values(m.message_display_action.default_icon),
    ...Object.values(m.compose_action.default_icon),
  ];
  for (const f of files) assert.ok(existsSync(path.join(ROOT, f)), `missing ${f}`);
});

test('every locale has exactly the same keys as en-US', () => {
  const base = Object.keys(readJson('_locales/en-US/messages.json')).sort();
  for (const locale of readdirSync(path.join(ROOT, '_locales'))) {
    const keys = Object.keys(readJson(`_locales/${locale}/messages.json`)).sort();
    assert.deepEqual(keys, base, `locale ${locale} differs from en-US`);
  }
});

test('every i18n key used in code exists in en-US', () => {
  const messages = readJson('_locales/en-US/messages.json');
  const dirs = ['common', 'pages', 'components'];
  const files = ['background.js', 'manifest.json'];
  for (const dir of dirs) {
    for (const entry of readdirSync(path.join(ROOT, dir), { recursive: true })) {
      if (/\.(js|html)$/.test(entry) && entry !== 'i18n.js') files.push(path.join(dir, entry));
    }
  }
  const patterns = [/getMessage\('([A-Za-z]+)'\)/g, /data-i18n-[a-z]+="([A-Za-z]+)"/g, /__MSG_([A-Za-z]+)__/g];
  for (const file of files) {
    const src = read(file);
    for (const re of patterns) {
      for (const [, key] of src.matchAll(re)) {
        assert.ok(messages[key], `${file}: missing i18n key "${key}"`);
      }
    }
  }
});

test('submodules are checked out (formats list and default templates)', () => {
  assert.ok(
    existsSync(path.join(ROOT, 'vendor/document-formats/onlyoffice-docs-formats.json')),
    'run: git submodule update --init --recursive',
  );
  for (const ext of ['docx', 'xlsx', 'pptx']) {
    assert.ok(existsSync(path.join(ROOT, `vendor/document-templates/default/new.${ext}`)), `default/new.${ext}`);
  }
});

const hasBuild = existsSync(path.join(ROOT, 'build/manifest.json'));
test('build output has all placeholders replaced', { skip: !hasBuild && 'no build/ — run make build' }, () => {
  const manifest = read('build/manifest.json');
  const config = JSON.parse(read('build/config/config.json'));
  assert.ok(!manifest.includes('$SERVER_URL$'), 'manifest still has $SERVER_URL$');
  assert.ok(config.server.url.startsWith('https://'), 'build server URL must be https (http is rejected at runtime)');
  assert.ok(!config.server.secret.includes('$SERVER_SECRET$'), 'secret placeholder not replaced');
  assert.ok(manifest.includes(`${config.server.url}/*`), 'manifest host permission must match config server URL');
});
