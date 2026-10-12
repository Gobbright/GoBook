import ExcelJS from 'exceljs';
import multer from 'multer';

import { httpError } from './httpError.js';

export const uploadExcelFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname)) cb(null, true);
    else cb(httpError(400, 'Only .xlsx, .xls, or .csv files are supported'));
  },
});

export function cellValue(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value) return value.result ?? '';
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('');
    if ('text' in value) return value.text ?? '';
  }
  return value;
}

export function normalizeExcelHeader(value, aliases) {
  if (value == null) return null;
  const text = typeof value === 'object'
    ? (value.richText?.map((r) => r.text).join('') ?? value.text ?? '')
    : String(value);
  const key = text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return aliases[key] ?? null;
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function parseCsvLine(line = '') {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function tableRowsFromHtml(text = '') {
  const rows = [];
  const rowMatches = text.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  rowMatches.forEach((rowHtml) => {
    const cells = [];
    const cellMatches = rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
    cellMatches.forEach((cellHtml) => {
      cells.push(decodeHtml(cellHtml));
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

function recordsFromGrid(grid, aliases, expectedColumns) {
  const headerRow = grid.find((row) => row.some((cell) => normalizeExcelHeader(cell, aliases)));
  if (!headerRow) {
    throw httpError(400, `No recognizable columns found. Expected columns like ${expectedColumns}.`);
  }

  const headerIndex = grid.indexOf(headerRow);
  const headers = {};
  headerRow.forEach((cell, index) => {
    const field = normalizeExcelHeader(cell, aliases);
    if (field) headers[index] = field;
  });

  const rows = [];
  for (let rowIndex = headerIndex + 1; rowIndex < grid.length; rowIndex += 1) {
    const source = grid[rowIndex] || [];
    const record = {};
    Object.entries(headers).forEach(([colIndex, field]) => {
      record[field] = source[Number(colIndex)] ?? '';
    });
    const hasValue = Object.values(record).some((value) => String(value ?? '').trim());
    if (hasValue) rows.push({ rowNumber: rowIndex + 1, record });
  }
  return rows;
}

export async function parseExcelRows(file, aliases, expectedColumns) {
  if (!file) throw httpError(400, 'No file uploaded');

  const filename = file.originalname || '';
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const grid = text.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
    return recordsFromGrid(grid, aliases, expectedColumns);
  }

  if (extension === 'xls') {
    const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const grid = /<table/i.test(text)
      ? tableRowsFromHtml(text)
      : text.split(/\r?\n/).filter(Boolean).map((line) => line.split(/\t|,/));
    return recordsFromGrid(grid, aliases, expectedColumns);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw httpError(400, 'No worksheet found in file');

  const grid = [];
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = [];
    for (let colNumber = 1; colNumber <= sheet.columnCount; colNumber += 1) {
      values.push(cellValue(row.getCell(colNumber).value));
    }
    grid.push(values);
  }
  return recordsFromGrid(grid, aliases, expectedColumns);
}

export function asText(value) {
  return String(value ?? '').trim();
}

export function asNumber(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function enumValue(value, allowed, fallback) {
  const text = asText(value);
  return allowed.includes(text) ? text : fallback;
}

export function importSummary() {
  return { imported: 0, updated: 0, skipped: 0, errors: [] };
}
