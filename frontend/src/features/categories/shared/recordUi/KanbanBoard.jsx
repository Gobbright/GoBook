export function KanbanBoard({ columns, records, statusKey, renderCard }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((col) => {
        const items = records.filter((r) => (r.data?.[statusKey] || columns[0]) === col);
        return (
          <div key={col} className="bg-[#f8fafc] border border-[#e5edf7] rounded-xl flex flex-col min-h-40">
            <div className="px-4 py-3 border-b border-[#e5edf7] flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#111827]">{col}</span>
              <span className="text-[11px] text-[#536173] bg-white border border-[#dbe4ef] rounded-full px-2 py-0.5 min-w-5.5 text-center">{items.length}</span>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              {items.length === 0 ? (
                <p className="text-[12px] text-[#94a3b8] text-center py-6">No records</p>
              ) : (
                items.map((r) => renderCard(r))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
