import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
import { preferredRecord } from '../engine/database.mjs';

const root = path.resolve(import.meta.dirname, '..');
const workbookPath = path.join(root, 'data', 'Tycoon Sim Database.xlsx');
const generatedPath = path.join(root, 'data', 'items.generated.js');
const conflictPath = path.join(root, 'data', 'database-conflicts.json');
const indexPath = path.join(root, 'data', 'items.index.json');
const IMPORTER_VERSION = 3;

const workbookBytes = await fs.readFile(workbookPath);
const sourceHash = crypto.createHash('sha256').update(workbookBytes).digest('hex');
if (!process.argv.includes('--force')) {
  try {
    const current = await fs.readFile(generatedPath, 'utf8');
    const payload = JSON.parse(current.slice(current.indexOf('=') + 1, current.lastIndexOf(';')));
    await fs.access(indexPath);
    if (payload.sourceHash === sourceHash && payload.importerVersion === IMPORTER_VERSION) {
      console.log(`Database unchanged (${sourceHash.slice(0, 12)}); skipped workbook import.`);
      process.exit(0);
    }
  } catch {
    // A missing or older generated file requires a complete import.
  }
}

const sheetDefinitions = [
  ['Droppers', 'dropper'],
  ['Upgraders', 'upgrader'],
  ['Furnaces', 'furnace'],
  ['Capgrader', 'capgrader'],
  ['Crates', null],
  ['Rebirth Items', null],
  ['Achievement Items', null],
  ['Merchant', null],
];

const clean = (value) => String(value ?? '').replaceAll('\r', '').trim();
const headerKey = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
const normalizeName = (value) => clean(value).replace(/\s+/g, ' ');

function parseSize(value) {
  const match = clean(value).match(/^(\d+)\s*[x\u00d7]\s*(\d+)$/i);
  return match ? { width: Number(match[1]), length: Number(match[2]) } : null;
}

function numeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = clean(value);
  if (!text) return null;
  const parsed = Number(text.replaceAll(',', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeType(value) {
  const type = clean(value).toLowerCase();
  if (!type) return null;
  if (type.includes('dropper')) return 'dropper';
  if (type.includes('furnace')) return 'furnace';
  if (type.includes('capgrader')) return 'capgrader';
  if (type.includes('upgrader')) return 'upgrader';
  return type;
}

function namedStat(text, label) {
  const match = clean(text).match(new RegExp(`(?:^|\\n)${label}\\s*:\\s*([^\\n]+)`, 'i'));
  return match ? clean(match[1]) : null;
}

function firstIndex(headers, aliases) {
  const normalized = headers.map(headerKey);
  return aliases.map(headerKey).map((alias) => normalized.indexOf(alias)).find((index) => index >= 0) ?? -1;
}

function valueAt(row, headers, aliases) {
  const index = firstIndex(headers, aliases);
  return index >= 0 ? row[index] : null;
}

function parseRows(sheetName, defaultType, values) {
  const headerIndex = values.findIndex((row) => (
    firstIndex(row, ['Name']) >= 0
    && firstIndex(row, ['Variant']) >= 0
    && firstIndex(row, ['Size']) >= 0
  ));
  if (headerIndex < 0) return [];
  const headers = values[headerIndex];
  return values.slice(headerIndex + 1).flatMap((row, offset) => {
    const name = normalizeName(valueAt(row, headers, ['Name']));
    const variant = normalizeName(valueAt(row, headers, ['Variant']));
    const size = parseSize(valueAt(row, headers, ['Size']));
    if (!name || !variant || !size) return [];
    const itemType = normalizeName(valueAt(row, headers, ['Item Type'])) || defaultType;
    const type = normalizeType(itemType);
    const otherStats = clean(valueAt(row, headers, ['Other Info', 'Other Stats']));
    const source = normalizeName(valueAt(row, headers, ['Obtainment Method', 'Obtainement Method'])) || null;
    const achievementLocked = sheetName === 'Achievement Items' || /achievement/i.test(source ?? '');
    const mainStat = numeric(valueAt(row, headers, [
      'Raw Ore Value', 'Raw Modifier', 'True Stat', 'Raw Main Stat', 'Multiplier',
    ]));
    return [{
      key: `${name}::${variant}`.toLowerCase(),
      name,
      variant,
      type,
      rarity: normalizeName(valueAt(row, headers, ['Rarity'])) || null,
      size,
      mainStat,
      mainStatType: normalizeName(valueAt(row, headers, ['Type', 'Main Stat Type'])) || null,
      range: (namedStat(otherStats, 'Range') ?? clean(valueAt(row, headers, ['Range']))) || null,
      limitedUses: (namedStat(otherStats, 'Limited Uses')
        ?? clean(valueAt(row, headers, ['Limited Use?', 'Limited Uses']))) || null,
      conveyorSpeed: numeric(namedStat(otherStats, 'Conveyor Speed')),
      dropSpeed: numeric(namedStat(otherStats, '(?:Drop|Dropper) Speed')),
      oreSize: numeric(namedStat(otherStats, 'Ore Size')),
      source,
      acquisition: achievementLocked ? 'achievement' : null,
      maxCopies: achievementLocked && type === 'dropper' ? 1 : null,
      effects: clean(valueAt(row, headers, ['Extra Effects', 'Other Effects', 'Extra Effect'])) || null,
      sheet: sheetName,
      row: headerIndex + offset + 2,
    }];
  });
}

function canonical(value) {
  if (value == null || value === '' || value === 'N/A') return null;
  if (typeof value === 'number') return Number(value.toPrecision(12));
  if (typeof value === 'object') return JSON.stringify(value);
  return clean(value).toLowerCase().replace(/[\u2013\u2014]/g, '-').replaceAll(' ', '');
}

function findConflicts(records) {
  const fields = ['size', 'mainStat', 'range', 'limitedUses', 'conveyorSpeed', 'dropSpeed', 'oreSize'];
  const groups = new Map();
  records.forEach((record) => {
    const group = groups.get(record.key) ?? [];
    group.push(record);
    groups.set(record.key, group);
  });
  const conflicts = [];
  groups.forEach((group, key) => {
    if (new Set(group.map((record) => record.sheet)).size < 2) return;
    fields.forEach((field) => {
      const alternatives = new Map();
      group.forEach((record) => {
        const normalized = canonical(record[field]);
        if (normalized == null) return;
        const existing = alternatives.get(String(normalized)) ?? [];
        existing.push({ sheet: record.sheet, row: record.row, value: record[field] });
        alternatives.set(String(normalized), existing);
      });
      if (alternatives.size > 1) {
        conflicts.push({ item: key, field, alternatives: [...alternatives.values()] });
      }
    });
  });
  return conflicts;
}

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const records = [];
for (const [sheetName, defaultType] of sheetDefinitions) {
  const sheet = workbook.worksheets.getItem(sheetName);
  records.push(...parseRows(sheetName, defaultType, sheet.getUsedRange(true).values));
}

const conflicts = findConflicts(records);
const payload = {
  importerVersion: IMPORTER_VERSION,
  generatedAt: new Date().toISOString(),
  sourceWorkbook: 'data/Tycoon Sim Database.xlsx',
  sourceHash,
  records,
  conflicts,
};
const groups = new Map();
for (const record of records) {
  const group = groups.get(record.key) ?? [];
  group.push(record);
  groups.set(record.key, group);
}
const compactPayload = { ...payload, records: [...groups.values()].map(preferredRecord) };
await fs.writeFile(generatedPath, `globalThis.TycoonDatabase = ${JSON.stringify(payload)};\n`);
await fs.writeFile(indexPath, `${JSON.stringify(compactPayload)}\n`);
await fs.writeFile(conflictPath, `${JSON.stringify({ generatedAt: payload.generatedAt, conflicts }, null, 2)}\n`);

console.log(`Normalized ${records.length} item rows.`);
console.log(`Found ${conflicts.length} cross-sheet conflicts.`);
if (conflicts.length) {
  for (const conflict of conflicts.slice(0, 25)) {
    console.log(`${conflict.item} / ${conflict.field}: ${JSON.stringify(conflict.alternatives)}`);
  }
}
