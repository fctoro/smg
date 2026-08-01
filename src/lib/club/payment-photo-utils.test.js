const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentPhotoFile } = require('./payment-photo-utils');

test('accepts a valid image under 5 MB', () => {
  const result = validatePaymentPhotoFile({ name: 'receipt.png', size: 2 * 1024 * 1024, type: 'image/png' });
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('rejects unsupported file types', () => {
  const result = validatePaymentPhotoFile({ name: 'receipt.pdf', size: 512, type: 'application/pdf' });
  assert.equal(result.valid, false);
  assert.match(result.error, /Format non pris en charge/i);
});

test('rejects files larger than 5 MB', () => {
  const result = validatePaymentPhotoFile({ name: 'receipt.jpg', size: 6 * 1024 * 1024, type: 'image/jpeg' });
  assert.equal(result.valid, false);
  assert.match(result.error, /5 Mo/i);
});
