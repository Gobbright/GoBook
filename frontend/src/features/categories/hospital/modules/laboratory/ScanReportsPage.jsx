import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, Search } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const INPUT = 'h-10 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const TEXTAREA = 'min-h-24 w-full rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-[inherit] text-[#111827] outline-none focus:border-blue-500';
const STATUSES = ['Pending Reports', 'Draft', 'Verified', 'Final'];
const MODALITIES = ['All Modalities', 'X-Ray', 'CT', 'MRI', 'Ultrasound'];
const RADIOLOGISTS = ['All Radiologists', 'Dr. Ravi Kumar', 'Dr. Meena S', 'Dr. Arun Kumar'];

const DEMO_REPORTS = [
  {
    _id: 'demo-scan-rad-0251',
    data: {
      orderId: 'RAD-0251',
      patientName: 'Raj Kumar',
      patientId: 'GBH-00128',
      scan: 'Chest X-Ray',
      view: 'PA View',
      modality: 'X-Ray',
      orderedBy: 'Dr. Arun Kumar',
      scanDate: '07 Aug 2026',
      clinicalIndication: 'Persistent cough for 5 days',
      findings: 'Lungs are clear. No focal consolidation, pleural effusion or pneumothorax.',
      impression: 'No active cardiopulmonary abnormality.',
      recommendation: 'Clinical correlation advised.',
      radiologist: 'Dr. Ravi Kumar',
      status: 'Pending Reports',
    },
  },
];

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function Button({ children, icon: Icon, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-green-600 bg-green-600 text-white hover:bg-green-700',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold ${tones[tone]} font-[inherit] transition disabled:opacity-60`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function StatusBadge({ value }) {
  const styles = {
    'Pending Reports': 'border-amber-200 bg-amber-50 text-amber-700',
    Draft: 'border-slate-200 bg-slate-50 text-slate-600',
    Verified: 'border-blue-200 bg-blue-50 text-blue-700',
    Final: 'border-green-200 bg-green-50 text-green-700',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${styles[value] || styles.Draft}`}>{value}</span>;
}

function reportFromOrder(order) {
  const data = order.data || {};
  return {
    _id: order._id,
    data: {
      ...DEMO_REPORTS[0].data,
      orderId: data.orderId || DEMO_REPORTS[0].data.orderId,
      patientName: data.patientName || DEMO_REPORTS[0].data.patientName,
      patientId: data.patientId || DEMO_REPORTS[0].data.patientId,
      scan: data.scan || data.name || DEMO_REPORTS[0].data.scan,
      modality: data.modality || DEMO_REPORTS[0].data.modality,
      orderedBy: data.orderedBy || DEMO_REPORTS[0].data.orderedBy,
      clinicalIndication: data.clinicalIndication || DEMO_REPORTS[0].data.clinicalIndication,
      radiologist: data.radiologist || DEMO_REPORTS[0].data.radiologist,
      status: data.reportStatus || 'Pending Reports',
    },
  };
}

export function ScanReportsPage() {
  const radiologyOrders = useModuleRecords('hospital/radiology-workflow');
  const reports = useModuleRecords('hospital/radiology-reports');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Pending Reports');
  const [modality, setModality] = useState('All Modalities');
  const [radiologist, setRadiologist] = useState('All Radiologists');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const reportRecords = reports.records.length
    ? reports.records
    : radiologyOrders.records.length
      ? radiologyOrders.records.map(reportFromOrder)
      : DEMO_REPORTS;

  const filteredReports = useMemo(() => {
    const q = normalize(search);
    return reportRecords.filter((record) => {
      const data = record.data || {};
      const matchesSearch = !q || normalize([data.patientName, data.patientId, data.orderId, data.scan].filter(Boolean).join(' ')).includes(q);
      const matchesStatus = status === 'Pending Reports' ? data.status === 'Pending Reports' : data.status === status;
      const matchesModality = modality === 'All Modalities' || data.modality === modality;
      const matchesRadiologist = radiologist === 'All Radiologists' || data.radiologist === radiologist;
      return matchesSearch && matchesStatus && matchesModality && matchesRadiologist;
    });
  }, [modality, radiologist, reportRecords, search, status]);

  const selected = reportRecords.find((record) => record._id === selectedId) || filteredReports[0] || reportRecords[0];
  const selectedData = selected?.data || DEMO_REPORTS[0].data;
  const [form, setForm] = useState({
    findings: selectedData.findings,
    impression: selectedData.impression,
    recommendation: selectedData.recommendation,
    radiologist: selectedData.radiologist,
  });

  function chooseReport(record) {
    setSelectedId(record._id);
    setForm({
      findings: record.data?.findings || '',
      impression: record.data?.impression || '',
      recommendation: record.data?.recommendation || '',
      radiologist: record.data?.radiologist || 'Dr. Ravi Kumar',
    });
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveReport(nextStatus) {
    setSaving(true);
    try {
      const payload = {
        ...selectedData,
        ...form,
        status: nextStatus,
        finalizedAt: nextStatus === 'Final' ? new Date().toISOString() : selectedData.finalizedAt,
      };
      if (String(selected?._id || '').startsWith('demo-') || !reports.records.find((record) => record._id === selected._id)) {
        await reports.create({ name: `${payload.orderId} ${payload.scan}`, ...payload });
      } else {
        await reports.update(selected._id, payload);
      }
      const order = radiologyOrders.records.find((record) => record.data?.orderId === selectedData.orderId);
      if (order) {
        await radiologyOrders.update(order._id, {
          ...order.data,
          reportStatus: nextStatus,
          status: nextStatus === 'Final' ? 'COMPLETED' : order.data.status,
        });
      }
      setMessage(nextStatus === 'Final' ? `${selectedData.orderId} verified and finalized.` : `${selectedData.orderId} saved as draft.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[13px] font-semibold text-[#64748b]">Home &gt; Diagnostics &gt; Scan Reports</div>
          <h1 className="m-0 text-[26px] font-extrabold text-[#071936]">Scan Reports</h1>
          <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">Radiologist reporting workspace for draft, verified and final scan reports.</p>
        </div>
        <StatusBadge value={selectedData.status || 'Pending Reports'} />
      </div>

      {message && <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-semibold text-blue-700">{message}</div>}

      <section className="rounded-lg border border-[#dfe7f1] bg-white">
        <div className="grid gap-3 border-b border-[#edf2f7] p-4 lg:grid-cols-[minmax(260px,1fr)_190px_170px_190px]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input className="h-10 w-full rounded-md border border-[#dbe4ef] bg-white pl-9 pr-3 text-[13px] font-[inherit] outline-none focus:border-blue-500" placeholder="Patient / Order / Scan" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={INPUT} value={status} onChange={(event) => setStatus(event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={modality} onChange={(event) => setModality(event.target.value)}>{MODALITIES.map((item) => <option key={item}>{item}</option>)}</select>
          <select className={INPUT} value={radiologist} onChange={(event) => setRadiologist(event.target.value)}>{RADIOLOGISTS.map((item) => <option key={item}>{item}</option>)}</select>
        </div>

        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-[#edf2f7] p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {filteredReports.map((record) => {
                const data = record.data || {};
                return (
                  <button key={record._id} type="button" onClick={() => chooseReport(record)} className={`w-full rounded-md border p-3 text-left transition ${selected?._id === record._id ? 'border-blue-500 bg-blue-50' : 'border-[#dbe4ef] bg-white hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-extrabold text-[#071936]">{data.orderId}</span>
                      <StatusBadge value={data.status || 'Pending Reports'} />
                    </div>
                    <div className="mt-2 text-[12px] font-bold text-[#334155]">{data.patientName} - {data.patientId}</div>
                    <div className="text-[12px] font-semibold text-[#64748b]">{data.scan} - {data.modality}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="p-5">
            <div className="mb-5 rounded-lg border border-[#dbe4ef] bg-[#f8fbff] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-[18px] font-extrabold text-[#071936]">{selectedData.orderId}</h2>
                  <p className="m-0 mt-2 text-[14px] font-extrabold text-[#334155]">{selectedData.patientName} - {selectedData.patientId}</p>
                  <p className="m-0 mt-1 text-[13px] font-semibold text-[#64748b]">{selectedData.scan} - {selectedData.view}</p>
                </div>
                <FileText size={24} className="text-blue-600" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="text-[13px]"><span className="font-extrabold text-[#536173]">Ordered By:</span> <span className="font-semibold text-[#071936]">{selectedData.orderedBy}</span></div>
                <div className="text-[13px]"><span className="font-extrabold text-[#536173]">Scan Date:</span> <span className="font-semibold text-[#071936]">{selectedData.scanDate}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1 text-[12px] font-extrabold uppercase text-[#536173]">Clinical Indication</div>
                <div className="rounded-md border border-[#dbe4ef] bg-white px-3 py-2 text-[13px] font-semibold text-[#334155]">{selectedData.clinicalIndication}</div>
              </div>
              <label className="block text-[12px] font-extrabold uppercase text-[#536173]">Findings<textarea className={`${TEXTAREA} mt-1`} value={form.findings} onChange={(event) => setField('findings', event.target.value)} /></label>
              <label className="block text-[12px] font-extrabold uppercase text-[#536173]">Impression<textarea className={`${TEXTAREA} mt-1`} value={form.impression} onChange={(event) => setField('impression', event.target.value)} /></label>
              <label className="block text-[12px] font-extrabold uppercase text-[#536173]">Recommendation<textarea className={`${TEXTAREA} mt-1`} value={form.recommendation} onChange={(event) => setField('recommendation', event.target.value)} /></label>
              <label className="block max-w-sm text-[12px] font-extrabold uppercase text-[#536173]">Radiologist<select className={`${INPUT} mt-1`} value={form.radiologist} onChange={(event) => setField('radiologist', event.target.value)}>{RADIOLOGISTS.filter((item) => item !== 'All Radiologists').map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button onClick={() => saveReport('Draft')} disabled={saving}>Save Draft</Button>
              <Button tone="green" icon={CheckCircle2} onClick={() => saveReport('Final')} disabled={saving}>Verify & Finalize</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
