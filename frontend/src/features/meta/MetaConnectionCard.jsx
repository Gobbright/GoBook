import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient.js';
import { loadMetaSdk, prepareMetaConnection, submitMetaCallback } from '../../services/metaService.js';

const ERRORS = {
  denied: 'Connection cancelled or permissions declined. You can try again.',
  missing_code: 'Meta did not return authorization. Please try again.',
  permissions: 'Allow the WhatsApp permissions requested by Meta to connect.',
  assets: 'Select a WhatsApp Business Account and phone number using Embedded Signup.',
  asset_in_use: 'This phone is already connected to another GoBook business.',
  connection_failed: 'Connection could not be completed. Please retry or contact support.',
};
const META_ORIGINS = new Set(['https://www.facebook.com', 'https://web.facebook.com']);
const buttonClass = 'rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50';

export function MetaConnectionCard() {
  const [search, setSearch] = useSearchParams();
  const [data, setData] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => ERRORS[search.get('meta_error')] || '');
  const active = useRef(null);
  const expiry = useRef(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const result = await apiClient('/meta/connection');
    if (mounted.current) setData(result);
  }, []);

  async function prepare() {
    setBusy(true); setAttempt(null); setMessage('');
    try {
      const next = await prepareMetaConnection('embedded');
      await loadMetaSdk(next.appId, next.graphVersion);
      if (!mounted.current) return;
      setAttempt(next);
      clearTimeout(expiry.current);
      expiry.current = setTimeout(() => setAttempt(null), 9 * 60000);
    } catch (error) { if (mounted.current) setMessage(error.message); }
    finally { if (mounted.current) setBusy(false); }
  }

  useEffect(() => {
    mounted.current = true;
    refresh().catch((error) => { if (mounted.current) setMessage(error.message); });
    return () => { mounted.current = false; clearTimeout(expiry.current); clearTimeout(active.current?.timeout); active.current = null; };
  }, [refresh]);

  useEffect(() => {
    if (!search.has('connected') && !search.has('meta_error')) return;
    const next = new URLSearchParams(search);
    next.delete('connected'); next.delete('meta_error');
    setSearch(next, { replace: true });
  }, [search, setSearch]);

  useEffect(() => {
    function onMessage(event) {
      if (!META_ORIGINS.has(event.origin) || !active.current) return;
      let payload;
      try { payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (payload.event === 'FINISH') {
        const { waba_id, phone_number_id } = payload.data || {};
        if (!/^\d+$/.test(waba_id || '') || !/^\d+$/.test(phone_number_id || '')) return;
        active.current.assets = { waba_id, phone_number_id };
        active.current.complete();
      } else if (payload.event === 'CANCEL' || payload.event === 'ERROR') {
        active.current.fail('Meta signup was cancelled or could not finish. Please try again.');
      } else if (payload.event?.startsWith('FINISH_')) {
        active.current.fail('Choose standard WhatsApp Cloud API phone-number setup. This signup variation is not supported yet.');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function connect() {
    if (!attempt || busy) return;
    setMessage(''); setBusy(true);
    const flow = { assets: null, code: null };
    flow.fail = (text) => {
      if (active.current !== flow) return;
      clearTimeout(flow.timeout); active.current = null;
      setBusy(false); setAttempt(null); setMessage(text);
    };
    flow.complete = () => {
      if (active.current !== flow || !flow.code || !flow.assets) return;
      clearTimeout(flow.timeout); active.current = null;
      try { submitMetaCallback(attempt, { code: flow.code, ...flow.assets }); }
      catch (error) { setBusy(false); setMessage(error.message); }
    };
    flow.timeout = setTimeout(() => flow.fail('Meta signup timed out. Please prepare a new connection.'), 9 * 60000);
    active.current = flow;
    // Direct click invocation preserves popup permission; no asynchronous work here.
    try {
      window.FB.login((response) => {
        if (active.current !== flow) return;
        if (!response.authResponse?.code) { flow.fail('Meta authorization was cancelled. You can try again.'); return; }
        flow.code = response.authResponse.code;
        flow.complete();
      }, { config_id: attempt.configId, response_type: 'code', override_default_response_type: true, extras: { setup: {} } });
    } catch { flow.fail('Meta signup could not open. Please allow popups and retry.'); }
  }

  async function redirectLogin() {
    setBusy(true); setMessage('');
    try { const next = await prepareMetaConnection('redirect'); window.location.assign(next.authorizeUrl); }
    catch (error) { setBusy(false); setMessage(error.message); }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await apiClient('/meta/connection', { method: 'DELETE' }); setAttempt(null);
      await refresh();
      setMessage('Connection data removed from GoBook Suite. You can also remove GoBook Suite in Meta Business Integrations.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  const connection = data?.connection;
  return <section className="mb-5 rounded-xl border border-emerald-200 bg-white p-5 text-slate-800" aria-label="Meta WhatsApp connection">
    <h2 className="m-0 text-lg font-bold">Connect WhatsApp Business</h2>
    <p className="mt-2 text-sm text-slate-600">Authorize your business through Meta to connect a WhatsApp Business Account and phone number.</p>
    {connection && <div className="my-3 break-words rounded-lg bg-slate-50 p-3 text-sm">
      <strong className="capitalize">{connection.status}</strong><p>{connection.wabaName} {connection.displayPhoneNumber}</p>
      <p className="text-xs text-slate-500">Phone verification: {connection.phoneStatus || 'Unknown'}. Authorization does not by itself enable campaign delivery.</p>
    </div>}
    {message && <p role="status" className="my-3 break-words rounded-lg bg-blue-50 p-3 text-sm">{message}</p>}
    {data && !data.configured && <p className="text-sm">WhatsApp connection setup is pending. Contact <a href="mailto:support.gobook@gmail.com">support.gobook@gmail.com</a>.</p>}
    {data?.configured && <div className="flex flex-wrap gap-3">
      {!attempt ? <button type="button" className={buttonClass} disabled={busy} onClick={prepare}>{busy ? 'Preparing...' : 'Prepare secure connection'}</button> :
        <button type="button" className={buttonClass} disabled={busy} onClick={connect}>{busy ? 'Completing Meta signup...' : 'Connect WhatsApp Business'}</button>}
      <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm" disabled={busy} onClick={redirectLogin}>Connect existing account via Facebook</button>
    </div>}
    {connection && <button type="button" disabled={busy} onClick={disconnect} className="mt-3 text-sm font-semibold text-red-700">Disconnect and remove saved connection data</button>}
    <p className="mb-0 mt-4 text-xs text-slate-500">By connecting, you authorize access to the selected business assets. <Link to="/privacy-policy">Privacy policy</Link> · <Link to="/terms">Terms</Link> · <Link to="/data-deletion">Data deletion</Link></p>
  </section>;
}
