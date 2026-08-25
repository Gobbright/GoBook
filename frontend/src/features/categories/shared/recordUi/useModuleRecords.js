import { useCallback, useEffect, useState } from 'react';

import {
  createModuleRecord,
  deleteModuleRecord,
  listModuleRecords,
  updateModuleRecord,
} from '../../../../services/moduleRecordsService.js';

export function useModuleRecords(moduleKey) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    return listModuleRecords(moduleKey)
      .then((res) => setRecords(res.records ?? []))
      .catch((err) => { setError(err.message || 'Failed to load records'); setRecords([]); })
      .finally(() => setLoading(false));
  }, [moduleKey]);

  useEffect(() => { reload(); }, [reload]);

  async function create(data) {
    const now = new Date().toISOString();
    await createModuleRecord(moduleKey, {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: now,
    });
    await reload();
  }

  async function update(id, data) {
    await updateModuleRecord(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    await reload();
  }
  async function remove(id) { await deleteModuleRecord(id); await reload(); }

  return { records, loading, error, reload, create, update, remove };
}

// Lightweight read-only fetch of another module's records, used for cross-linking
// (e.g. an Appointment picking from the live Patients list) without subscribing
// to that module's own loading/CRUD lifecycle.
export function useLookupRecords(moduleKey) {
  const [records, setRecords] = useState([]);

  const reload = useCallback(() => {
    return listModuleRecords(moduleKey)
      .then((res) => setRecords(res.records ?? []))
      .catch(() => setRecords([]));
  }, [moduleKey]);

  useEffect(() => { reload(); }, [reload]);

  return { records, reload };
}

export function names(records) {
  const displayKeys = [
    'name',
    'patientName',
    'doctorName',
    'nurseName',
    'departmentName',
    'wardName',
    'roomName',
    'bedNumber',
    'medicineName',
    'testName',
    'packageName',
    'supplierName',
    'staffName',
    'surgery',
  ];

  return [...new Set(records
    .map((record) => {
      const data = record.data || {};
      return displayKeys.map((key) => data[key]).find(Boolean)
        || [data.firstName, data.lastName].filter(Boolean).join(' ');
    })
    .filter(Boolean))].sort();
}
