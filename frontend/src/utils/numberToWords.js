const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function two(n) { return n === 0 ? '' : n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''); }
function three(n) { return n === 0 ? '' : n < 100 ? two(n) : ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : ''); }

export function numberToWords(amount) {
  if (!amount || amount === 0) return 'Zero Rupees Only';
  const r = Math.floor(amount);
  const p = Math.round((amount - r) * 100);
  let rem = r;
  const cr = Math.floor(rem / 10000000); rem %= 10000000;
  const lk = Math.floor(rem / 100000);   rem %= 100000;
  const th = Math.floor(rem / 1000);     rem %= 1000;
  let w = '';
  if (cr > 0) w += three(cr) + ' Crore ';
  if (lk > 0) w += two(lk) + ' Lakh ';
  if (th > 0) w += two(th) + ' Thousand ';
  if (rem > 0) w += three(rem);
  w = w.trim() + ' Rupees';
  if (p > 0) w += ' and ' + two(p) + ' Paise';
  return w + ' Only';
}
