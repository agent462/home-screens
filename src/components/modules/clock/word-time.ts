/**
 * Convert numeric time to English phrases for the "word" and "fuzzy" clock views.
 */

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve',
];

/**
 * Exact word time: "It is ten twenty-three"
 */
export function timeToWords(hours: number, minutes: number): string {
  const h12 = hours % 12 || 12;
  const hourWord = ONES[h12];

  if (minutes === 0) return `It is ${hourWord} o'clock`;

  const minuteWord = numberToWords(minutes);
  return `It is ${hourWord} ${minuteWord}`;
}

/**
 * Fuzzy time: "almost half past two", "quarter to three"
 * Updates roughly every 5 minutes.
 */
export function timeToFuzzy(hours: number, minutes: number): string {
  const h12 = hours % 12 || 12;
  const nextH12 = (hours + 1) % 12 || 12;
  const hourWord = ONES[h12];
  const nextHourWord = ONES[nextH12];

  if (minutes <= 2) return `${hourWord} o'clock`;
  if (minutes <= 7) return `just past ${hourWord}`;
  if (minutes <= 12) return `ten past ${hourWord}`;
  if (minutes <= 17) return `quarter past ${hourWord}`;
  if (minutes <= 22) return `twenty past ${hourWord}`;
  if (minutes <= 27) return `twenty-five past ${hourWord}`;
  if (minutes <= 32) return `half past ${hourWord}`;
  if (minutes <= 37) return `twenty-five to ${nextHourWord}`;
  if (minutes <= 42) return `twenty to ${nextHourWord}`;
  if (minutes <= 47) return `quarter to ${nextHourWord}`;
  if (minutes <= 52) return `ten to ${nextHourWord}`;
  if (minutes <= 57) return `almost ${nextHourWord}`;
  return `${nextHourWord} o'clock`;
}

function numberToWords(n: number): string {
  if (n === 0) return 'zero';
  const teens = [
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen',
  ];
  const tens = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty',
  ];

  if (n < 10) return ONES[n];
  if (n < 20) return teens[n - 10];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? tens[t] : `${tens[t]}-${ONES[o]}`;
}
