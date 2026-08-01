import fs from 'node:fs/promises';

export const normalize = (value) => String(value ?? '').trim().toLowerCase();
export const itemKey = (name, variant = 'Base') => `${normalize(name)}::${normalize(variant)}`;

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export function moneyNumber(value) {
  if (typeof value === 'number') return value;
  const match = String(value ?? '').trim().replaceAll(',', '').match(/^\$?([\d.]+)\s*(K|M|B|T|Qd|Qn|Sx|Sp|Oc|No)?$/i);
  if (!match) return null;
  const powers = { '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12, qd: 1e15, qn: 1e18, sx: 1e21, sp: 1e24, oc: 1e27, no: 1e30 };
  return Number(match[1]) * powers[normalize(match[2])];
}

export function parseRange(value) {
  if (!value || normalize(value) === 'n/a') return null;
  const [minimum, maximum] = String(value).replace(/[–—]/g, '-').split('-').map(moneyNumber);
  return Number.isFinite(minimum) && Number.isFinite(maximum) ? { minimum, maximum } : null;
}

export function integerUseLimit(value) {
  if (value == null || /unlimited|n\/a/i.test(String(value))) return Infinity;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : Infinity;
}

export function compactNumber(value) {
  const units = [[1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qn'], [1e15, 'Qd'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const [divisor, suffix] = units.find(([minimum]) => value >= minimum) ?? [1, ''];
  return `${Math.floor((value / divisor) * 100) / 100}${suffix}`;
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function diagnostic(code, message, context = {}) {
  return { code, message, context };
}
