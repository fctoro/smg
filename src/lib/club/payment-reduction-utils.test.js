const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDiscountedAmount, getReductionPercent, parseReductionFromRemark, serializeReductionMetadata } = require('./payment-reduction-utils');

test('applique une réduction à 100% pour la bourse', () => {
  const amount = calculateDiscountedAmount(1000, 'full');
  assert.equal(amount, 0);
});

test('applique une réduction à 50% pour la demi-bourse', () => {
  const amount = calculateDiscountedAmount(1000, 'half');
  assert.equal(amount, 500);
});

test('applique un pourcentage personnalisé pour une réduction spéciale', () => {
  const amount = calculateDiscountedAmount(1000, 'custom', 25);
  assert.equal(amount, 750);
});

test('aucune réduction retourne le montant initial', () => {
  const amount = calculateDiscountedAmount(1000, 'none');
  assert.equal(amount, 1000);
});

test('parse les métadonnées de réduction depuis un commentaire', () => {
  const parsed = parseReductionFromRemark('[REDUCTION:CUSTOM] [REDUCTION_PERCENT:30]');
  assert.equal(parsed.reductionType, 'custom');
  assert.equal(parsed.customPercent, 30);
});

test('serialize les métadonnées de réduction', () => {
  const metadata = serializeReductionMetadata('half');
  assert.equal(metadata, '[REDUCTION:HALF]');
});
