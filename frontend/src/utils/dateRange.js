export function isWithinDateRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59.999`) : null;

  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export function dateRangeParams(from, to) {
  return {
    ...(from ? { dateFrom: from } : {}),
    ...(to ? { dateTo: to } : {}),
  };
}
