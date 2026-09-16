import assert from 'node:assert/strict';
import test from 'node:test';
import { getInvoiceLayoutSettings, updateInvoiceLayoutSettings } from '../../frontend/src/utils/invoiceLayoutSettings.js';
import { BusinessSettings } from '../src/models/BusinessSettings.js';

test('legacy customizations remain the starting point for both layouts', () => {
  for (const format of ['normal', 'thermal80']) {
    const options = getInvoiceLayoutSettings({ invoiceShowLogo: false }, format);
    assert.equal(options.invoiceShowLogo, false);
    assert.equal(options.invoiceShowNotes, true);
  }
});

test('changing either layout stays separate and survives database serialization', () => {
  let settings = { invoicePrintFormat: 'thermal80', invoiceShowLogo: true };
  settings.invoiceLayoutSettings = updateInvoiceLayoutSettings(settings, 'invoiceShowLogo', false);
  settings.invoicePrintFormat = 'normal';
  settings.invoiceLayoutSettings = updateInvoiceLayoutSettings(settings, 'invoiceShowNotes', false);
  const saved = new BusinessSettings(settings).toObject();
  const normal = getInvoiceLayoutSettings(saved, 'normal');
  const thermal = getInvoiceLayoutSettings(saved, 'thermal80');
  assert.equal(normal.invoiceShowLogo, true);
  assert.equal(normal.invoiceShowNotes, false);
  assert.equal(thermal.invoiceShowLogo, false);
  assert.equal(thermal.invoiceShowNotes, true);
});

test('explicit bill layout selects its own options over the business default', () => {
  const settings = { invoicePrintFormat: 'normal', invoiceLayoutSettings: {
    normal: { invoiceShowBankDetails: true },
    thermal80: { invoiceShowBankDetails: false },
  } };
  assert.equal(getInvoiceLayoutSettings(settings).invoiceShowBankDetails, true);
  assert.equal(getInvoiceLayoutSettings(settings, 'thermal80').invoiceShowBankDetails, false);
});
