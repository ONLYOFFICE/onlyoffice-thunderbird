export const JwtManager = {
    _stringToBytes: (str) => new TextEncoder().encode(str),
    _bufferToBytes: (buffer) => new Uint8Array(buffer),

    _encode: function(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
        const encoded = btoa(binary);
        return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    },

    _sign: async function(message, secret) {
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode(secret);
        const messageBytes = encoder.encode(message);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
        return signature;
    },

    generate: async function(payload, secret) {
        if (!secret) return null;
    
        const header = { alg: 'HS256', typ: 'JWT' };
    
        const headerEncoded = this._encode(this._stringToBytes(JSON.stringify(header)));
        const payloadEncoded = this._encode(this._stringToBytes(JSON.stringify(payload)));
        
        const message = `${headerEncoded}.${payloadEncoded}`;
        const signatureBuffer = await this._sign(message, secret);
        const signature = this._encode(this._bufferToBytes(signatureBuffer));
        
        return `${message}.${signature}`;
    }
}
