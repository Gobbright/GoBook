const GREEN = /^(active|completed|paid|approved|cleared|normal|available|collected|discharged|posted)$/i;
const AMBER = /^(pending|scheduled|ongoing|submitted|near expiry|low|partial|admitted)$/i;
const RED = /^(cancelled|rejected|overdue|expired|abnormal|missed|out of stock|failed|discontinued|inactive|no show|referred)$/i;
const BLUE = /^(in progress|pending review|transferred|discharged against advice|refunded)$/i;

export function StatusBadge({ value }) {
  if (!value) return <span className="text-[#b0bec5]">—</span>;
  let cls = 'bg-gray-100 text-gray-600';
  if (GREEN.test(value)) cls = 'bg-green-100 text-green-700';
  else if (AMBER.test(value)) cls = 'bg-amber-100 text-amber-700';
  else if (RED.test(value)) cls = 'bg-red-100 text-red-700';
  else if (BLUE.test(value)) cls = 'bg-blue-100 text-blue-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`}>{value}</span>;
}
