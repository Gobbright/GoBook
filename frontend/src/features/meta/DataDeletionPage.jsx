import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export function DataDeletionPage({ status = false }) {
  const { confirmationCode } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!status) return;
    setResult(null); setError('');
    const abort = new AbortController();
    fetch('/meta/deletion-status/' + encodeURIComponent(confirmationCode), { signal: abort.signal, cache: 'no-store' })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Reference not found'); return data; })
      .then(setResult).catch((err) => { if (err.name !== 'AbortError') setError(err.message || 'Status unavailable. Please contact support.'); });
    return () => abort.abort();
  }, [status, confirmationCode]);
  return <main className="min-h-screen bg-[#f6f9fd] px-4 py-8 text-[#102044]">
    <article className="mx-auto max-w-3xl rounded-lg border border-[#d9e4f2] bg-white p-5 shadow-sm sm:p-9">
      <Link to="/login" className="font-bold text-blue-700">GoBook Suite</Link>
      <h1 className="mt-6 text-3xl font-bold">{status ? 'Data deletion status' : 'Delete Meta and WhatsApp connection data'}</h1>
      {status ? <div aria-live="polite">
        <p className="break-all text-sm"><strong>Reference:</strong> {confirmationCode}</p>
        {error ? <p role="alert">{error}</p> : result ? <>
          <p><strong>Status: Completed</strong></p>
          <p>Meta connection data covered by this request has been removed from the GoBook Suite application database.</p>
          <p>Completed: {new Date(result.completedAt).toLocaleString()}</p>
        </> : <p>Checking your request...</p>}
        <p>Status references are available for 90 days. No account or business information is displayed here.</p>
      </div> : <div className="space-y-5 leading-relaxed">
        <section><h2 className="text-xl font-bold">How to request deletion</h2>
          <p>In Facebook settings, open Business Integrations (or Apps and Websites), find GoBook Suite and use the available removal/data-deletion controls. When Meta sends a verified data-deletion callback, we process the request and provide a confirmation link.</p>
          <p>The GoBook business owner can also open WhatsApp settings and choose "Disconnect and remove saved connection data". For help without signing in, email <a href="mailto:support.gobook@gmail.com" className="text-blue-700">support.gobook@gmail.com</a> with the subject "Meta data deletion" and your GoBook account email. Never send passwords or tokens. We may need information to verify your authority.</p>
        </section>
        <section><h2 className="text-xl font-bold">What is removed</h2>
          <p>The saved Meta authorization token, Meta user identifier, permission list, WhatsApp Business Account identifier/name and connected phone information are removed. Meta deauthorization disables the credential; a data-deletion request removes the remaining connection record.</p>
          <p>This connection feature does not import message histories or Meta templates. Customer-created campaigns, contacts, message records, invoices and GoBook login accounts are separate business data and are not deleted by this callback. Contact support to request removal of other eligible GoBook data. Meta handles deletion from its own services separately.</p>
        </section>
        <section><h2 className="text-xl font-bold">Timing and retained references</h2>
          <p>Verified automated requests complete in the application database before a completed confirmation is returned. If processing fails, no completed confirmation is issued; retry or contact support. Email requests require identity review; support will confirm the expected processing time after review.</p>
          <p>A random confirmation reference and keyed security marker are retained for up to 90 days to report completion and prevent older authorizations from restoring deleted data. Backups, if maintained by hosting providers, require separate retention and restore controls; this callback does not directly edit backup copies.</p>
        </section>
        <section><h2 className="text-xl font-bold">Contact GoBook Suite</h2>
          <p>GOBRIGHT · E SUDHAKAR<br />Email: <a href="mailto:support.gobook@gmail.com">support.gobook@gmail.com</a><br />Phone: <a href="tel:+918925550775">+91 8925550775</a></p>
          <p>1st Floor, 52/B, Paradise Tower Complex, Thennur High Road, Opp. to Shaans Hotel, Thennur, Tiruchirappalli, Tamil Nadu 620017, India.</p>
        </section>
      </div>}
      <footer className="mt-8 flex flex-wrap gap-4 border-t pt-5 text-sm text-blue-700"><Link to="/privacy-policy">Privacy policy</Link><Link to="/terms">Terms</Link><Link to="/data-deletion">Deletion instructions</Link></footer>
    </article>
  </main>;
}
