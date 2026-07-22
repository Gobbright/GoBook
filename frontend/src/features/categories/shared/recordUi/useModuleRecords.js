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

  async function create(data) { await createModuleRecord(moduleKey, data); await reload(); }
  async function update(id, data) { await updateModuleRecord(id, data); await reload(); }
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
  return [...new Set(records.map((r) => r.data?.name).filter(Boolean))].sort();
}
