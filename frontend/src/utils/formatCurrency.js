export function formatCurrency(value) {
  return '₹ ' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
