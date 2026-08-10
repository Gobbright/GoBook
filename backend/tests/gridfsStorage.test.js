import test from 'node:test';
import assert from 'node:assert/strict';

import { hasExpectedFileSignature, safeFilename } from '../src/services/gridfsStorage.js';

test('GridFS upload validation accepts matching safe file signatures', () => {
  assert.equal(hasExpectedFileSignature(Buffer.from('%PDF-1.7\n'), 'application/pdf'), true);
  assert.equal(hasExpectedFileSignature(Buffer.from('89504e470d0a1a0a00000000', 'hex'), 'image/png'), true);
  assert.equal(hasExpectedFileSignature(Buffer.from('ffd8ffe000104a464946', 'hex'), 'image/jpeg'), true);
  assert.equal(hasExpectedFileSignature(Buffer.from('GIF89a0000000000', 'ascii'), 'image/gif'), true);
  assert.equal(hasExpectedFileSignature(Buffer.from('524946460000000057454250', 'hex'), 'image/webp'), true);
  assert.equal(hasExpectedFileSignature(Buffer.from('000000186674797069736f6d', 'hex'), 'video/mp4'), true);
  assert.equal(hasExpectedFileSignature(Buffer.from('1a45dfa300000000', 'hex'), 'video/webm'), true);
});

test('GridFS upload validation rejects spoofed and scriptable files', () => {
  assert.equal(hasExpectedFileSignature(Buffer.from('<script>alert(1)</script>'), 'application/pdf'), false);
  assert.equal(hasExpectedFileSignature(Buffer.from('<svg onload="alert(1)"></svg>'), 'image/svg+xml'), false);
  assert.equal(hasExpectedFileSignature(Buffer.from('%PDF-1.7'), 'image/png'), false);
  assert.equal(safeFilename('../unsafe\r\nname.pdf'), '.._unsafe__name.pdf');
});
