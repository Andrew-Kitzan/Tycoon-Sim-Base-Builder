import fs from 'node:fs/promises';
import path from 'node:path';
import { loadDatabase, loadRules } from '../engine/database.mjs';
import { lintDatabase } from '../engine/database-lint.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [database, rules] = await Promise.all([loadDatabase(root), loadRules(root)]);
const result = lintDatabase(database, rules);
await fs.writeFile(path.join(root, 'data', 'database-lint.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ valid: result.valid, records: result.recordCount, errors: result.errors.length, warnings: result.warnings.length }));
if (!result.valid) process.exitCode = 2;

