import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const inputPath = path.join(root, 'data', 'database-conflicts.json');
const outputPath = path.join(root, 'docs', 'DATABASE_CONFLICTS.md');
const { generatedAt, conflicts } = JSON.parse(await fs.readFile(inputPath, 'utf8'));

const display = (value) => {
  if (value && typeof value === 'object' && 'width' in value) return `${value.width}×${value.length}`;
  return String(value);
};

const groups = new Map();
for (const conflict of conflicts) {
  const group = groups.get(conflict.field) ?? [];
  group.push(conflict);
  groups.set(conflict.field, group);
}

const lines = [
  '# Database consistency report',
  '',
  `Generated from \`data/Tycoon Sim Database.xlsx\` at ${generatedAt}.`,
  '',
  `The workbook contains **${conflicts.length} repeated-stat conflicts**. The planner refuses to use an affected item until its repeated values agree.`,
  '',
];
for (const [field, entries] of groups) {
  lines.push(`## ${field} (${entries.length})`, '', '| Item and variant | Conflicting sources |', '|---|---|');
  for (const entry of entries) {
    const alternatives = entry.alternatives
      .map((records) => records.map((record) => `${record.sheet} row ${record.row}: ${display(record.value)}`).join('; '))
      .join(' ↔ ');
    lines.push(`| ${entry.item} | ${alternatives} |`);
  }
  lines.push('');
}

await fs.writeFile(outputPath, `${lines.join('\n')}\n`);
console.log(`Wrote ${conflicts.length} conflicts to docs/DATABASE_CONFLICTS.md.`);
