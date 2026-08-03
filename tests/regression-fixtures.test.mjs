import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadDatabase, loadRules, findItem } from '../engine/database.mjs';
import { applyDeterministicItem } from '../engine/models.mjs';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'tests', 'fixtures', 'regressions');
const files = (await fs.readdir(directory)).filter((name) => name.endsWith('.json')).sort();
const fixtures = await Promise.all(files.map(async (name) => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))));
const [database, rules] = await Promise.all([loadDatabase(root), loadRules(root)]);

for (const fixture of fixtures) {
  assert.match(fixture.id, /^[a-z0-9-]+$/);
  assert(fixture.observed && fixture.expected && fixture.kind && fixture.input && fixture.assert);
  if (fixture.id === 'acid-plant-effect-free') {
    const acid = findItem(database, 'Acid Plant', 'Base');
    for (const effect of fixture.input.blockedEffects) {
      const before = { value: 100, survival: 1, replication: 1, oreSize: 1, effects: [effect], timeSeconds: 0, area: 0 };
      const after = applyDeterministicItem(acid, before, 1, {}, rules);
      assert.equal(after.activated, fixture.assert.activated);
      assert.equal(after.value, before.value);
    }
  } else if (fixture.id === 'portable-after-cap') {
    assert.equal(rules.portableRequirements.phase, 'post-cap');
    assert(rules.validationCodes[fixture.assert.diagnostic]);
  } else throw new Error(`Regression fixture has no executor: ${fixture.id}`);
}

console.log(`Validated ${fixtures.length} structured regression fixtures.`);
