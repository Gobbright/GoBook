export function DataTable({ columns, rows, empty = 'No data found', actions, showCount = true, showSerial = true }) {
  const safeRows = rows || [];
  const countLabel = `${safeRows.length} ${safeRows.length === 1 ? 'record' : 'records'}`;

  if (!safeRows.length) {
    return (
      <div className="card table-empty-wrap">
        {showCount && <div className="table-count-badge">Total: 0 records</div>}
        <div className="empty">{empty}</div>
      </div>
    );
  }

  return (
    <div className="card table-wrap">
      {showCount && <div className="table-count-badge">Total: {countLabel}</div>}
      <table className="employee-data-table">
        <thead>
          <tr>
            {showSerial && <th className="serial-column">#</th>}
            {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            {actions && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={row._id || row.id || JSON.stringify(row)}>
              {showSerial && <td className="serial-column" data-label="#">{index + 1}</td>}
              {columns.map((column) => (
                <td key={column.key} data-label={column.label}>
                  {column.render ? column.render(row, index) : row[column.key] || '-'}
                </td>
              ))}
              {actions && <td data-label="Action">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}