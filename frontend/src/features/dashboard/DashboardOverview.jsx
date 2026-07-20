import { DonutChart } from '../../components/charts/DonutChart.jsx';
import { GaugeChart } from '../../components/charts/GaugeChart.jsx';
import { LineChart } from '../../components/charts/LineChart.jsx';
import { Card } from '../../components/ui/Card.jsx';

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function DashboardOverview({
  topCustomers = [],
  inventoryStatus = null,
  salesTrend = [],
  cashFlow = { paid: 0, pending: 0, overdue: 0 },
  growthScore = { score: 0, growthPct: 0 },
  titles = {},
  secondaryStats = null,
}) {
  const {
    primaryChartTitle = 'Sales Overview',
    donutTitle = 'Cash Flow Summary',
    listTitle = 'Top Customers',
    secondaryCardTitle = 'Top Salespersons',
    inventoryTitle = 'Inventory Status',
    scoreTitle = 'Business Growth Score',
  } = titles;

  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 mt-5">
        <Card>
          <h2 className="m-0 mb-4 text-base font-semibold">{primaryChartTitle}</h2>
          <LineChart data={salesTrend} />
        </Card>
        <Card>
          <h2 className="m-0 mb-4 text-base font-semibold">{donutTitle}</h2>
          <DonutChart data={cashFlow} />
        </Card>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">

        {/* Top Customers */}
        <Card>
          <h2 className="m-0 mb-4 text-base font-semibold">{listTitle}</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-[#94a3b8] dark:text-slate-500 m-0">No invoice data yet.</p>
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
              {topCustomers.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-none">
                    {i + 1}
                  </span>
                  <span className="text-[13px] text-[#374151] dark:text-slate-300 truncate flex-1">{c.name}</span>
                  <span className="text-[13px] font-semibold text-[#111827] dark:text-slate-100 flex-none">{fmt(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Top Salespersons — placeholder until salesperson tracking is added */}
        <Card>
          <h2 className="m-0 mb-4 text-base font-semibold">{secondaryCardTitle}</h2>
          {secondaryStats ? (
            <div className="flex flex-col gap-3">
              {secondaryStats.map(({ label, value, color, bg }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#536173] dark:text-slate-400">{label}</span>
                  <span
                    className="text-[13px] font-bold px-2 py-0.5 rounded-md"
                    style={{ color, backgroundColor: bg }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94a3b8] dark:text-slate-500 m-0">Salesperson tracking coming soon.</p>
          )}
        </Card>

        {/* Inventory Status */}
        <Card>
          <h2 className="m-0 mb-4 text-base font-semibold">{inventoryTitle}</h2>
          {!inventoryStatus || inventoryStatus.total === 0 ? (
            <p className="text-sm text-[#94a3b8] dark:text-slate-500 m-0">No products added yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: 'Total Products', value: inventoryStatus.total,      color: '#2563eb', bg: '#eff6ff' },
                { label: 'In Stock',       value: inventoryStatus.inStock,    color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Low Stock',      value: inventoryStatus.lowStock,   color: '#d97706', bg: '#fffbeb' },
                { label: 'Out of Stock',   value: inventoryStatus.outOfStock, color: '#dc2626', bg: '#fef2f2' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#536173] dark:text-slate-400">{label}</span>
                  <span
                    className="text-[13px] font-bold px-2 py-0.5 rounded-md"
                    style={{ color, backgroundColor: bg }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Business Growth Score */}
        <Card>
          <h2 className="m-0 mb-4 text-base font-semibold">{scoreTitle}</h2>
          <GaugeChart score={growthScore.score} growthPct={growthScore.growthPct} />
        </Card>

      </section>
    </>
  );
}
