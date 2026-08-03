import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stableStringify } from './utils.mjs';

async function fileDigest(file) {
  try { return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex'); }
  catch { return 'missing'; }
}

export async function plannerCacheKey(root, profile, options = {}) {
  const engineFiles = (await fs.readdir(path.join(root, 'engine')))
    .filter((name) => name.endsWith('.mjs')).sort()
    .map((name) => path.join(root, 'engine', name));
  const inputs = [
    path.join(root, 'data', 'items.index.json'),
    path.join(root, 'rules', 'engine-rules.json'),
    path.join(root, 'scripts', 'full-build.mjs'),
    ...engineFiles,
  ];
  const digests = {};
  for (const file of inputs) digests[path.relative(root, file).replaceAll('\\', '/')] = await fileDigest(file);
  return crypto.createHash('sha256')
    .update(stableStringify({ profile, options, digests }))
    .digest('hex');
}

export async function readPlannerCache(root, key) {
  try { return JSON.parse(await fs.readFile(path.join(root, '.planner-cache', `${key}.json`), 'utf8')); }
  catch { return null; }
}

export async function writePlannerCache(root, key, value) {
  const directory = path.join(root, '.planner-cache');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, `${key}.json`), `${JSON.stringify(value)}\n`);
}

