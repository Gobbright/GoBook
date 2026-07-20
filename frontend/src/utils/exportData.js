function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pdfEscape(value) {
  return String(value ?? '')
    .replace(/₹/g, 'Rs. ')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function getCell(row, column) {
  return typeof column.value === 'function' ? column.value(row) : row[column.key];
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(name, ext) {
  const base = String(name || 'export')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export';
  return `${base}.${ext}`;
}

function columnWidth(column, rows) {
  const maxLen = rows.reduce((max, row) => Math.max(max, String(getCell(row, column) ?? '').length), column.label.length);
  return Math.min(Math.max(maxLen + 3, 12), 28);
}

function isNumericColumn(column) {
  return /amount|amt|gst|total|value|debit|credit|receipt|payment|balance|quantity|items|hours/i.test(column.label);
}

export function downloadExcel({ title, rows, columns, filename }) {
  const colGroup = columns
    .map((col) => `<col style="width:${columnWidth(col, rows)}ch" />`)
    .join('');
  const header = columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join('');
  const body = rows.map((row) => (
    `<tr>${columns.map((col) => {
      const align = isNumericColumn(col) ? 'right' : 'left';
      return `<td class="${align === 'right' ? 'num' : 'txt'}">${escapeHtml(getCell(row, col))}</td>`;
    }).join('')}</tr>`
  )).join('');
  const empty = rows.length === 0 ? `<tr><td colspan="${columns.length}" class="txt empty">No records</td></tr>` : '';
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
    th, td { border: 1px solid #9aa7b4; padding: 6px 8px; white-space: nowrap; vertical-align: middle; mso-number-format:"\\@"; }
    th { background: #d9eaf7; color: #111827; font-weight: 700; text-align: center; }
    .title { background: #1f4e78; color: #fff; font-size: 14pt; font-weight: 700; text-align: center; padding: 8px; }
    .txt { text-align: left; }
    .num { text-align: right; }
    .empty { text-align: center; color: #64748b; }
  </style>
</head>
<body>
  <table>
    ${colGroup}
    <thead>
      <tr><th class="title" colspan="${columns.length}">${escapeHtml(title)}</th></tr>
      <tr>${header}</tr>
    </thead>
    <tbody>${body || empty}</tbody>
  </table>
</body>
</html>`;
  downloadBlob(html, 'application/vnd.ms-excel;charset=utf-8', safeFilename(filename || title, 'xls'));
}

export function downloadPdf({ title, rows, columns, filename }) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 24;
  const tableWidth = pageWidth - margin * 2;
  const titleHeight = 28;
  const headerHeight = 24;
  const rowHeight = 24;
  const fontSize = 7;
  const textYPad = 8;
  const rawRows = rows.length ? rows : [{}];

  const weights = columns.map((col) => Math.min(Math.max(columnWidth(col, rawRows), 10), 30));
  const weightTotal = weights.reduce((sum, width) => sum + width, 0);
  const widths = weights.map((width) => (width / weightTotal) * tableWidth);
  const pages = [];
  for (let i = 0; i < rawRows.length; i += 18) pages.push(rawRows.slice(i, i + 18));

  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];

  function textAt(x, y, text, size = fontSize) {
    return `BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(text)}) Tj ET`;
  }

  function fitText(value, width) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim().replace(/₹/g, 'Rs. ');
    const maxChars = Math.max(4, Math.floor(width / (fontSize * 0.52)));
    return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}...` : text;
  }

  pages.forEach((pageRows, pageIndex) => {
    let y = pageHeight - margin;
    const content = [];

    content.push('0.12 0.31 0.47 rg');
    content.push(`${margin} ${y - titleHeight} ${tableWidth} ${titleHeight} re f`);
    content.push('1 1 1 rg');
    content.push(textAt(margin + 8, y - 18, pageIndex === 0 ? title : `${title} (continued)`, 13));
    y -= titleHeight;

    content.push('0.85 0.92 0.97 rg');
    content.push(`${margin} ${y - headerHeight} ${tableWidth} ${headerHeight} re f`);
    content.push('0 0 0 RG');
    content.push('0.55 w');
    let x = margin;
    columns.forEach((col, index) => {
      content.push(`${x.toFixed(2)} ${(y - headerHeight).toFixed(2)} ${widths[index].toFixed(2)} ${headerHeight} re S`);
      content.push('0.06 0.09 0.16 rg');
      content.push(textAt(x + 4, y - 15, fitText(col.label, widths[index] - 8), 7));
      x += widths[index];
    });
    y -= headerHeight;

    if (rows.length === 0) {
      content.push('1 1 1 rg');
      content.push(`${margin} ${y - rowHeight} ${tableWidth} ${rowHeight} re f`);
      content.push('0 0 0 RG');
      content.push(`${margin} ${y - rowHeight} ${tableWidth} ${rowHeight} re S`);
      content.push('0.39 0.45 0.55 rg');
      content.push(textAt(margin + 8, y - 15, 'No records', 8));
    } else {
      pageRows.forEach((row, rowIndex) => {
        x = margin;
        content.push(rowIndex % 2 === 0 ? '1 1 1 rg' : '0.98 0.99 1 rg');
        content.push(`${margin} ${y - rowHeight} ${tableWidth} ${rowHeight} re f`);
        columns.forEach((col, index) => {
          const cellWidth = widths[index];
          const value = fitText(getCell(row, col), cellWidth - 8);
          const right = isNumericColumn(col);
          const textX = right ? x + cellWidth - Math.min(cellWidth - 8, value.length * fontSize * 0.52) - 4 : x + 4;
          content.push('0 0 0 RG');
          content.push(`${x.toFixed(2)} ${(y - rowHeight).toFixed(2)} ${cellWidth.toFixed(2)} ${rowHeight} re S`);
          content.push('0.06 0.09 0.16 rg');
          content.push(textAt(textX, y - textYPad - 7, value, fontSize));
          x += cellWidth;
        });
        y -= rowHeight;
      });
    }

    content.push('0.39 0.45 0.55 rg');
    content.push(textAt(margin, 14, `Page ${pageIndex + 1} of ${pages.length}`, 7));

    const stream = content.join('\n');
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  downloadBlob(pdf, 'application/pdf', safeFilename(filename || title, 'pdf'));
}
