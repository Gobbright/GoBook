export function StatCard({ label, icon: Icon, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold text-slate-600">{label}</span>
        <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <Icon size={18} className="text-blue-600" />
        </div>
      </div>
      <div className="text-[32px] font-extrabold mt-3 text-slate-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <p className="m-0 text-[11px] text-slate-500 mt-1">Total records</p>
    </div>
  );
}
