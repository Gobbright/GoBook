import ExcelJS from 'exceljs';
import multer from 'multer';

import { httpError } from './httpError.js';

export const uploadExcelFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xlsx$/i.test(file.originalname)) cb(null, true);
    else cb(httpError(400, 'Only .xlsx files are supported'));
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

export async function parseExcelRows(file, aliases, expectedColumns) {
  if (!file) throw httpError(400, 'No file uploaded');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw httpError(400, 'No worksheet found in file');

  const headers = {};
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const field = normalizeExcelHeader(cell.value, aliases);
    if (field) headers[colNumber] = field;
  });

  if (Object.keys(headers).length === 0) {
    throw httpError(400, `No recognizable columns found. Expected columns like ${expectedColumns}.`);
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const record = {};
    for (const [colNumber, field] of Object.entries(headers)) {
      record[field] = cellValue(row.getCell(Number(colNumber)).value);
    }
    const hasValue = Object.values(record).some((value) => String(value ?? '').trim());
    if (hasValue) rows.push({ rowNumber, record });
  }
  return rows;
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
