import { EMPTY_SALES_FILTERS } from './salesFilterDefaults.js';

export const FILTER_QUERY_KEYS = Object.keys(EMPTY_SALES_FILTERS);

export function readSalesListState() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const filters = { ...EMPTY_SALES_FILTERS };
  FILTER_QUERY_KEYS.forEach((key) => {
    filters[key] = params.get(key) || '';
  });
  return {
    filters,
    dateFrom: params.get('dateFrom') || '',
    dateTo: params.get('dateTo') || '',
    search: params.get('search') || '',
  };
}

export function salesListQuery({ filters, dateFrom, dateTo, search }) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  FILTER_QUERY_KEYS.forEach((key) => {
    const value = filters?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });
  if (String(search || '').trim()) params.set('search', String(search).trim());
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function replaceSalesListQuery(pathname, query) {
  const nextUrl = `${pathname}${query}`;
  const currentUrl = `${pathname}${window.location.search || ''}`;
  if (nextUrl !== currentUrl) window.history.replaceState(null, '', nextUrl);
}
