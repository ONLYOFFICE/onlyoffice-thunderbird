import './helpers/env.js';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { JwtManager } from '../common/jwt.js';

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

test('returns null without a secret', async () => {
  assert.equal(await JwtManager.generate({ a: 1 }, ''), null);
});

test('produces an HS256 token that verifies with the same secret', async () => {
  const secret = 'test-secret';
  const token = await JwtManager.generate({ document: { key: 'k1' } }, secret);
  const [h, p, s] = token.split('.');

  assert.deepEqual(decode(h), { alg: 'HS256', typ: 'JWT' });
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  assert.equal(s, expected);
  assert.ok(!/[+/=]/.test(token), 'token must be base64url without padding');
});

test('payload keeps fields and adds iat/exp (default 600s)', async () => {
  const token = await JwtManager.generate({ document: { key: 'k1', title: 'Отчёт.docx' } }, 's');
  const payload = decode(token.split('.')[1]);

  assert.equal(payload.document.title, 'Отчёт.docx', 'non-ASCII must survive encoding');
  assert.equal(payload.exp - payload.iat, 600);
  assert.ok(Math.abs(payload.iat - Date.now() / 1000) < 5);
});
