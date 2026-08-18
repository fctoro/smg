const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentPhotoFile, isPdfProof } = require('./payment-photo-utils');

test('accepts a valid image under 10 MB', () => {
  const result = validatePaymentPhotoFile({ name: 'receipt.png', size: 2 * 1024 * 1024, type: 'image/png' });
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('accepts a scanned PDF document under 10 MB', () => {
  const result = validatePaymentPhotoFile({ name: 'receipt.pdf', size: 1.5 * 1024 * 1024, type: 'application/pdf' });
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
  assert.equal(isPdfProof('receipt.pdf'), true);
});

test('rejects files larger than 10 MB', () => {
  const result = validatePaymentPhotoFile({ name: 'receipt.jpg', size: 12 * 1024 * 1024, type: 'image/jpeg' });
  assert.equal(result.valid, false);
  assert.match(result.error, /10 Mo/i);
});
