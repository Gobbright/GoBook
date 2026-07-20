// GSP (GST Suvidha Provider) integration for E-Way Bill generation.
// Currently supports: Masters India API (most popular GSP in India).
// The backend proxies this call so API credentials never reach the browser.

const STATE_CODES = {
  'Andhra Pradesh': 37, 'Arunachal Pradesh': 12, 'Assam': 18,
  'Bihar': 10, 'Chhattisgarh': 22, 'Goa': 30, 'Gujarat': 24,
  'Haryana': 6, 'Himachal Pradesh': 2, 'Jharkhand': 20,
  'Karnataka': 29, 'Kerala': 32, 'Madhya Pradesh': 23,
  'Maharashtra': 27, 'Manipur': 14, 'Meghalaya': 17,
  'Mizoram': 15, 'Nagaland': 13, 'Odisha': 21,
  'Punjab': 3, 'Rajasthan': 8, 'Sikkim': 11,
  'Tamil Nadu': 33, 'Telangana': 36, 'Tripura': 16,
  'Uttar Pradesh': 9, 'Uttarakhand': 5, 'West Bengal': 19,
  'Andaman & Nicobar Islands': 35, 'Chandigarh': 4,
  'Dadra & Nagar Haveli': 26, 'Daman & Diu': 25,
  'Delhi': 7, 'Jammu & Kashmir': 1, 'Ladakh': 38,
  'Lakshadweep': 31, 'Puducherry': 34,
};

const TRANSPORT_MODE_CODES = { Road: '1', Rail: '2', Air: '3', Ship: '4' };

function stateCode(stateName) {
  return STATE_CODES[stateName] ?? 99;
}

function fmtDate(iso) {
  // NIC expects DD/MM/YYYY
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Build the NIC-standard EWB JSON from GoBook form data
function buildNicPayload(data, bizSettings) {
  const {
    customer, ewbMeta, transport, routeInfo, items, totals,
  } = data;

  const fromStateCode = stateCode(bizSettings.state || 'Tamil Nadu');
  const toStateCode   = stateCode(customer.state || '');

  const itemList = (items || []).map((it) => {
    const taxable = it.qty * it.rate * (1 - (it.discount || 0) / 100);
    const isIntra = fromStateCode === toStateCode;
    return {
      productName:  it.description,
      productDesc:  it.description,
      hsnCode:      it.hsn || '0',
      quantity:     Number(it.qty),
      qtyUnit:      (it.unit || 'NOS').toUpperCase(),
      cgstRate:     isIntra ? Number(it.gstRate) / 2 : 0,
      sgstRate:     isIntra ? Number(it.gstRate) / 2 : 0,
      igstRate:     isIntra ? 0 : Number(it.gstRate),
      cessRate:     0,
      cessNonadvol: 0,
      taxableAmount: Number(taxable.toFixed(2)),
    };
  });

  return {
    supplyType:        data.supplyType === 'inward' ? 'I' : 'O',
    subSupplyType:     '1',
    docType:           'INV',
    docNo:             ewbMeta.number,
    docDate:           fmtDate(ewbMeta.date),
    fromGstin:         bizSettings.gstin || '',
    fromTrdName:       bizSettings.businessName || 'GoBook Enterprises',
    fromAddr1:         bizSettings.address || '',
    fromAddr2:         '',
    fromPlace:         bizSettings.city || '',
    fromPincode:       Number(bizSettings.pincode) || 0,
    fromStateCode,
    actFromStateCode:  fromStateCode,
    toGstin:           customer.gstin || 'URP',
    toTrdName:         customer.name,
    toAddr1:           customer.address || '',
    toAddr2:           '',
    toPlace:           customer.city || '',
    toPincode:         Number(customer.pincode) || 0,
    toStateCode,
    actToStateCode:    toStateCode,
    totalValue:        Number((totals.taxable || 0).toFixed(2)),
    cgstValue:         Number((totals.cgst || 0).toFixed(2)),
    sgstValue:         Number((totals.sgst || 0).toFixed(2)),
    igstValue:         Number((totals.igst || 0).toFixed(2)),
    cessValue:         0,
    cessNonAdvolValue: 0,
    cessAdditionalValue: 0,
    totInvValue:       Number((totals.grandTotal || 0).toFixed(2)),
    othValue:          0,
    transporterId:     transport.transporterGstin || '',
    transporterName:   transport.transporterName || '',
    transDocNo:        transport.lrNumber || '',
    transDocDate:      fmtDate(transport.dispatchDate),
    transMode:         TRANSPORT_MODE_CODES[transport.mode] || '1',
    transDistance:     Number(routeInfo.distanceKm) || 0,
    vehicleNo:         (transport.vehicleNumber || '').replace(/\s/g, '').toUpperCase(),
    vehicleType:       'R',
    itemList,
  };
}

// ── Masters India GSP ─────────────────────────────────────────────────────────

async function callMastersIndia({ clientId, clientSecret, username, password, gstin, sandbox }, payload) {
  const base = sandbox
    ? 'https://api.mastergst.com/ewaybill/sandbox'
    : 'https://api.mastergst.com/ewaybill';

  const url = `${base}/v1.03/ewayapi?action=GENEWAYBILL`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      client_id:     clientId,
      client_secret: clientSecret,
      username,
      password,
      gstin,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  // Masters India wraps NIC response: { status_cd: '1', data: { ewayBillNo, ewayBillDate, validUpto } }
  if (json.status_cd === '1' && json.data?.ewayBillNo) {
    return {
      ewbNo:     String(json.data.ewayBillNo),
      ewbDate:   json.data.ewayBillDate || '',
      validUpto: json.data.validUpto || '',
    };
  }

  const msg = json.message || json.error || json.data?.error || 'GSP returned an error';
  throw new Error(msg);
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function generateEWayBillViaGSP(credentials, formData, bizSettings) {
  const { provider } = credentials;

  const nicPayload = buildNicPayload(formData, bizSettings);

  if (provider === 'masters-india') {
    return callMastersIndia(credentials, nicPayload);
  }

  throw new Error(`Unsupported GSP provider: "${provider}". Only "masters-india" is currently supported.`);
}
