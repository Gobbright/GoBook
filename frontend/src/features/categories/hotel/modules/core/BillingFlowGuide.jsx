import { ArrowRight, Info } from 'lucide-react';

const COPY = {
  manual: {
    title: 'Manual Bill',
    purpose: 'Use only for special hotel charges, corporate/group bills, or adjustments that do not come from another module.',
    flow: ['Manual charge', 'Draft / Preview', 'Invoice'],
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  folio: {
    title: 'Guest Folio',
    purpose: 'Use at front desk to see one guest stay account: room charges, restaurant room charges, laundry, services, payments, and checkout balance.',
    flow: ['Rooms + Services', 'Guest Folio', 'Final Bill'],
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  restaurant: {
    title: 'Restaurant Bills',
    purpose: 'Use only for food bills from POS orders. Cash/card/UPI closes here; Room Charge sends the bill to Guest Folio.',
    flow: ['Order / KOT', 'Restaurant Bill', 'Paid or Room Charge'],
    tone: 'border-green-200 bg-green-50 text-green-800',
  },
};

export function BillingFlowGuide({ type }) {
  const item = COPY[type];
  if (!item) return null;

  return (
    <section className={`mb-4 rounded-lg border px-4 py-3 ${item.tone}`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80">
            <Info size={15} />
          </span>
          <div>
            <div className="text-[13px] font-bold">{item.title}</div>
            <p className="m-0 mt-0.5 text-[12px] leading-5 opacity-90">{item.purpose}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold">
          {item.flow.map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded bg-white/80 px-2.5 py-1">{step}</span>
              {index < item.flow.length - 1 && <ArrowRight size={14} />}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
