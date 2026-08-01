import fs from 'node:fs/promises';
import path from 'node:path';
import { preferredRecord } from '../engine/database.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = await fs.readFile(path.join(root, 'data', 'items.generated.js'), 'utf8');
const payload = JSON.parse(source.slice(source.indexOf('=') + 1, source.lastIndexOf(';')));
const groups = new Map();
for (const record of payload.records) {
  const group = groups.get(record.key) ?? [];
  group.push(record);
  groups.set(record.key, group);
}
const compact = { ...payload, records: [...groups.values()].map(preferredRecord) };
await fs.writeFile(path.join(root, 'data', 'items.index.json'), `${JSON.stringify(compact)}\n`);
console.log(`Indexed ${payload.records.length} workbook rows as ${compact.records.length} unique item variants.`);
