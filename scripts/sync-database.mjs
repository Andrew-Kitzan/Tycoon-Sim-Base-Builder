import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { preferredRecord } from '../engine/database.mjs';
import { openXlsx } from '../engine/xlsx-reader.mjs';

const root = path.resolve(import.meta.dirname, '..');
const workbookPath = path.join(root, 'data', 'Tycoon Sim Database.xlsx');
const generatedPath = path.join(root, 'data', 'items.generated.js');
const conflictPath = path.join(root, 'data', 'database-conflicts.json');
const indexPath = path.join(root, 'data', 'items.index.json');
const oreSizeIndexPath = path.join(root, 'data', 'ore-size-height.index.json');
const IMPORTER_VERSION = 5;

const workbookBytes = await fs.readFile(workbookPath);
const sourceHash = crypto.createHash('sha256').update(workbookBytes).digest('hex');
if (!process.argv.includes('--force')) {
  try {
    const current = await fs.readFile(generatedPath, 'utf8');
    const payload = JSON.parse(current.slice(current.indexOf('=') + 1, current.lastIndexOf(';')));
    await fs.access(indexPath);
    await fs.access(oreSizeIndexPath);
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

const clean = (value) => String(value ?? '').replace(/[\r\u200b\u200c\u200d\ufeff]/g, '').trim();
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

function numericList(value) {
  return clean(value).split('/').map(numeric).filter(Number.isFinite);
}

function parseOreSizeHeight(values) {
  const headerIndex = values.findIndex((row) => (
    firstIndex(row, ['Starting size']) >= 0
    && firstIndex(row, ['Final ore size']) >= 0
    && firstIndex(row, ['Valid operation order']) >= 0
  ));
  if (headerIndex < 0) return { paths: [], restrictions: [], sheet: 'Ore SizeHeight' };
  const headers = values[headerIndex];
  const paths = [];
  const restrictions = [];
  for (const [offset, row] of values.slice(headerIndex + 1).entries()) {
    const sourceRow = headerIndex + offset + 2;
    const startingSize = numeric(valueAt(row, headers, ['Starting size']));
    const finalSize = numeric(valueAt(row, headers, ['Final ore size']));
    const operationText = clean(valueAt(row, headers, ['Valid operation order']));
    if (Number.isFinite(startingSize) && Number.isFinite(finalSize) && operationText) {
      const operations = /no size upgrader/i.test(operationText)
        ? []
        : operationText.split(/\s*(?:→|->)\s*/).map(clean).filter(Boolean);
      paths.push({
        startingSize,
        shrinkers: operations.filter((operation) => /^shrink/i.test(operation)).length,
        expanders: operations.filter((operation) => /^expand/i.test(operation)).length,
        operations,
        exactFraction: clean(valueAt(row, headers, ['Exact fraction'])) || null,
        finalSize,
        row: sourceRow,
      });
    }
    const name = normalizeName(valueAt(row, headers, ['Name']));
    const acceptable = numericList(valueAt(row, headers, ['Acceptable']));
    const rejected = numericList(valueAt(row, headers, ['Rejected']));
    if (name && (acceptable.length || rejected.length)) {
      restrictions.push({
        name,
        rarity: normalizeName(valueAt(row, headers, ['Rarity'])) || null,
        size: parseSize(valueAt(row, headers, ['Size'])),
        acceptable,
        rejected,
        notes: clean(valueAt(row, headers, ['Notes', 'Nots'])) || null,
        row: sourceRow,
      });
    }
  }
  return { sheet: 'Ore SizeHeight', paths, restrictions };
}

function parseStatsForNerds(values) {
  const overrides = new Map();
  const put = (name, variant, description, row, extra = {}) => {
    const normalizedVariant = /^n\/?a$/i.test(variant) ? 'Base' : variant;
    const key = `${name}::${normalizedVariant}`.toLowerCase();
    overrides.set(key, {
      ...(overrides.get(key) ?? {}),
      ...extra,
      description,
      statsForNerdsRow: row,
    });
  };
  for (const [index, row] of values.entries()) {
    const name = normalizeName(row[1]);
    const variant = normalizeName(row[3]);
    const description = clean(row[4]);
    if (!name || !variant || !description) continue;
    const dropSpeedMatch = description.match(/(?:constant\s+)?(\d+(?:\.\d+)?)\s+drop speed/i);
    put(name, variant, description, index + 1, dropSpeedMatch ? { dropSpeed: Number(dropSpeedMatch[1]) } : {});
  }
  const sectionVariants = new Map([
    ['Crimson Pillars', ['Base', 'Shiny']],
    ['Lambda Upgrader', ['Base', 'Shiny']],
    ["Periastron's Throne", ['Base', 'Shiny', 'Mythic', 'Shiny Mythic']],
  ]);
  for (const [name, variants] of sectionVariants) {
    const headerIndex = values.findIndex((row) => normalizeName(row[0]).toLowerCase() === name.toLowerCase());
    if (headerIndex < 0) continue;
    const descriptions = values.slice(headerIndex + 1)
      .map((row, offset) => ({ description: clean(row[1]), row: headerIndex + offset + 2 }))
      .filter((entry) => entry.description.length >= 30)
      .slice(0, variants.length);
    descriptions.forEach((entry, index) => put(name, variants[index], entry.description, entry.row));
  }
  return overrides;
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

const workbook = openXlsx(workbookBytes);
const records = [];
for (const [sheetName, defaultType] of sheetDefinitions) {
  records.push(...parseRows(sheetName, defaultType, workbook.readSheet(sheetName, { maxRows: 2_000 })));
}
const complexStatOverrides = workbook.sheetNames.includes('Stats for Nerds')
  ? parseStatsForNerds(workbook.readSheet('Stats for Nerds', { maxRows: 2_000 }))
  : new Map();
for (const record of records) {
  const override = complexStatOverrides.get(record.key);
  if (override) {
    if (Number.isFinite(override.dropSpeed)) record.dropSpeed = override.dropSpeed;
    record.description = override.description;
    record.statsForNerdsRow = override.statsForNerdsRow;
  }
  const placeholder = /refer to (?:the )?["“]?stats for nerds/i.test(record.effects ?? '');
  if (placeholder && record.description) record.effects = record.description;
  else if (!record.description && record.effects && record.effects !== 'N/A') record.description = record.effects;
}
const oreSizeHeight = workbook.sheetNames.includes('Ore SizeHeight')
  ? parseOreSizeHeight(workbook.readSheet('Ore SizeHeight', { maxRows: 2_000 }))
  : { sheet: 'Ore SizeHeight', paths: [], restrictions: [] };
const restrictionsByName = new Map(oreSizeHeight.restrictions.map((restriction) => [normalizeName(restriction.name).toLowerCase(), restriction]));
for (const record of records) {
  const restriction = restrictionsByName.get(normalizeName(record.name).toLowerCase());
  if (restriction) record.oreSizeRestriction = restriction;
}

const conflicts = findConflicts(records);
const payload = {
  importerVersion: IMPORTER_VERSION,
  generatedAt: new Date().toISOString(),
  sourceWorkbook: 'data/Tycoon Sim Database.xlsx',
  sourceHash,
  records,
  conflicts,
  oreSizeHeight,
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
await fs.writeFile(oreSizeIndexPath, `${JSON.stringify({
  importerVersion: IMPORTER_VERSION,
  generatedAt: payload.generatedAt,
  sourceWorkbook: payload.sourceWorkbook,
  sourceHash,
  ...oreSizeHeight,
}, null, 2)}\n`);

console.log(`Normalized ${records.length} item rows.`);
console.log(`Found ${conflicts.length} cross-sheet conflicts.`);
console.log(`Indexed ${oreSizeHeight.paths.length} ore-size paths and ${oreSizeHeight.restrictions.length} restricted items.`);
if (conflicts.length) {
  for (const conflict of conflicts.slice(0, 25)) {
    console.log(`${conflict.item} / ${conflict.field}: ${JSON.stringify(conflict.alternatives)}`);
  }
}
