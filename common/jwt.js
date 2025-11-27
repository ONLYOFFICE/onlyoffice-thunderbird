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
export const JwtManager = {
  _stringToBytes: (str) => new TextEncoder().encode(str),
  _bufferToBytes: (buffer) => new Uint8Array(buffer),

  _encode(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const encoded = btoa(binary);
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  async _sign(message, secret) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);
    const messageBytes = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
    return signature;
  },

  async generate(payload, secret, options = {}) {
    if (!secret) return null;

    const header = { alg: 'HS256', typ: 'JWT' };

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = options.expiresIn || 600;
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
    };

    const headerEncoded = this._encode(this._stringToBytes(JSON.stringify(header)));
    const payloadEncoded = this._encode(this._stringToBytes(JSON.stringify(fullPayload)));

    const message = `${headerEncoded}.${payloadEncoded}`;
    const signatureBuffer = await this._sign(message, secret);
    const signature = this._encode(this._bufferToBytes(signatureBuffer));

    return `${message}.${signature}`;
  },
};
