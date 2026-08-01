import fs from 'node:fs/promises';
import path from 'node:path';
import { itemKey, normalize, readJson } from './utils.mjs';

export async function loadRules(root) {
  return readJson(path.join(root, 'rules', 'engine-rules.json'));
}

export async function loadDatabase(root) {
  const compactPath = path.join(root, 'data', 'items.index.json');
  try {
    return await readJson(compactPath);
  } catch {
    const source = await fs.readFile(path.join(root, 'data', 'items.generated.js'), 'utf8');
    return JSON.parse(source.slice(source.indexOf('=') + 1, source.lastIndexOf(';')));
  }
}

export function buildDatabaseIndex(database) {
  const byKey = new Map();
  for (const record of database.records) {
    const list = byKey.get(record.key) ?? [];
    list.push(record);
    byKey.set(record.key, list);
  }
  return byKey;
}

export function preferredRecord(records) {
  const priority = ['Droppers', 'Upgraders', 'Furnaces', 'Capgrader', 'Rebirth Items', 'Achievement Items', 'Merchant', 'Crates'];
  const rank = (sheet) => {
    const index = priority.indexOf(sheet);
    return index < 0 ? priority.length : index;
  };
  const preferred = [...records].sort((a, b) => rank(a.sheet) - rank(b.sheet))[0];
  const sources = records.flatMap((record) => record.sources ?? [record.source]).filter(Boolean);
  const sourceSheets = records.flatMap((record) => record.sourceSheets ?? [{ sheet: record.sheet, row: record.row, source: record.source }]);
  const acquisitions = [...new Set(records.flatMap((record) => record.acquisitions ?? []))];
  if (sourceSheets.some((record) => record.sheet === 'Merchant' || /traveling merchant/i.test(record.source ?? ''))) acquisitions.push('merchant');
  if (sourceSheets.some((record) => record.sheet === 'Achievement Items' || /achievement/i.test(record.source ?? '')) || records.some((record) => record.acquisition === 'achievement')) acquisitions.push('achievement');
  if (records.some((record) => /p2w|gamepass|\bpack\b/i.test(`${record.source ?? ''} ${record.effects ?? ''}`))) acquisitions.push('premium');
  if (records.some((record) => normalize(record.rarity) === 'secret' || /secret/i.test(record.source ?? ''))) acquisitions.push('secret');
  return {
    ...preferred,
    sources,
    sourceSheets,
    acquisitions: [...new Set(acquisitions)],
    maxCopies: Math.min(...records.map((record) => record.maxCopies ?? Infinity)),
  };
}

export function findItem(database, name, variant = 'Base') {
  const key = itemKey(name, variant);
  const conflict = (database.conflicts ?? []).find((entry) => entry.item === key || entry.key === key);
  if (conflict) throw Object.assign(new Error(`${name} (${variant}) has conflicting database values.`), { code: 'DATABASE_CONFLICT', conflict });
  const records = database.records.filter((record) => record.key === key);
  if (!records.length) return null;
  const record = preferredRecord(records);
  return { ...record, allSources: records.map((entry) => ({ sheet: entry.sheet, row: entry.row, source: entry.source })) };
}

export function searchItems(database, query, limit = 20) {
  const needle = normalize(query);
  const groups = new Map();
  for (const record of database.records) {
    if (!normalize(record.name).includes(needle)) continue;
    if (!groups.has(record.key)) groups.set(record.key, []);
    groups.get(record.key).push(record);
  }
  return [...groups.values()].slice(0, limit).map(preferredRecord);
}
