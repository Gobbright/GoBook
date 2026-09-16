import { createHmac } from 'node:crypto';
import { httpError } from '../../utils/httpError.js';

export const REQUIRED_SCOPES = ['whatsapp_business_management', 'whatsapp_business_messaging'];

export async function graphRequest(config, path, { token, method = 'GET', params = {} } = {}) {
  const url = new URL('https://graph.facebook.com/' + config.graphVersion + '/' + path);
  const values = new URLSearchParams(params);
  if (token && !token.includes('|')) values.set('appsecret_proof', createHmac('sha256', config.appSecret).update(token).digest('hex'));
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const options = { method, headers, signal: AbortSignal.timeout(15000), redirect: 'error' };
  if (method === 'GET') url.search = values.toString();
  else { headers['Content-Type'] = 'application/x-www-form-urlencoded'; options.body = values; }
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok || result.error) throw new Error('Meta API rejected request');
    return result;
  } catch {
    // Never propagate provider response bodies, URLs, codes or credentials.
    throw httpError(502, 'Meta could not complete the connection. Please retry or contact support.');
  }
}

export async function exchangeAndVerify(config, code, mode, assets = {}) {
  const tokenResult = await graphRequest(config, 'oauth/access_token', {
    method: 'POST',
    params: { client_id: config.appId, client_secret: config.appSecret, code,
      ...(mode === 'redirect' ? { redirect_uri: config.callbackUrl } : {}) },
  });
  const token = tokenResult.access_token;
  if (typeof token !== 'string' || !token) throw httpError(502, 'Meta did not return a credential');
  const { data } = await graphRequest(config, 'debug_token', {
    token: config.appId + '|' + config.appSecret, params: { input_token: token },
  });
  const now = Math.floor(Date.now() / 1000);
  if (!data?.is_valid || String(data.app_id) !== config.appId || !/^\d{1,40}$/.test(data.user_id || '') ||
      (data.expires_at && data.expires_at <= now) || (data.data_access_expires_at && data.data_access_expires_at <= now)) {
    throw httpError(400, 'Meta authorization is invalid or expired');
  }
  if (!REQUIRED_SCOPES.every((scope) => data.scopes?.includes(scope))) throw httpError(403, 'Required WhatsApp permissions were not granted');
  const ids = [...new Set((data.granular_scopes || []).filter((entry) => entry.scope === 'whatsapp_business_management').flatMap((entry) => entry.target_ids || []))].map(String);
  const wabaId = assets.wabaId || (ids.length === 1 ? ids[0] : '');
  if (!/^\d+$/.test(wabaId) || !ids.includes(wabaId)) throw httpError(400, 'Please use Embedded Signup and select one WhatsApp Business Account');
  const waba = await graphRequest(config, wabaId, { token, params: { fields: 'id,name' } });
  // Only follow Graph cursors, never provider-supplied pagination URLs.
  const phones = [];
  let after;
  for (let page = 0; page < 20; page += 1) {
    const result = await graphRequest(config, wabaId + '/phone_numbers', {
      token, params: { fields: 'id,display_phone_number,verified_name,code_verification_status', limit: '100', ...(after ? { after } : {}) },
    });
    phones.push(...(result.data || []));
    if (!result.paging?.next) break;
    after = result.paging?.cursors?.after;
    if (!after) break;
  }
  const phone = assets.phoneNumberId ? phones.find((item) => item.id === assets.phoneNumberId) : (phones.length === 1 ? phones[0] : null);
  if (!phone || !/^\d+$/.test(phone.id)) throw httpError(400, 'Please select a phone number in Embedded Signup');
  return { token, metaUserId: data.user_id, scopes: REQUIRED_SCOPES,
    tokenExpiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
    dataAccessExpiresAt: data.data_access_expires_at ? new Date(data.data_access_expires_at * 1000) : undefined,
    wabaId: waba.id, wabaName: waba.name || '', phoneNumberId: phone.id,
    displayPhoneNumber: phone.display_phone_number || '', verifiedName: phone.verified_name || '',
    phoneStatus: phone.code_verification_status || 'UNKNOWN' };
}
