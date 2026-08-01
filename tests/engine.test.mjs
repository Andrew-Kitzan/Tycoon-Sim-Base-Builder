import assert from 'node:assert/strict';
import path from 'node:path';
import { loadDatabase, loadRules, findItem } from '../engine/database.mjs';
import { buildLegalPool } from '../engine/profile.mjs';
import { optimizeCapgraders } from '../engine/optimizer.mjs';
import { seededOreSimulation } from '../engine/simulation.mjs';
import { validatePlan } from '../engine/validate.mjs';
import { evaluateEffectSafety } from '../engine/effects.mjs';
import { readJson } from '../engine/utils.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [database, rules, profile] = await Promise.all([
  loadDatabase(root),
  loadRules(root),
  readJson(path.join(root, 'profiles', 'example.json')),
]);

assert.equal(new Set(database.records.map((record) => record.key)).size, database.records.length, 'compact index should contain one record per item variant');
assert(database.records.length < 727, 'compact index should be smaller than the raw repeated-row database');
const runic = findItem(database, 'Runic Array', 'Shiny Mythic');
assert.deepEqual(runic.size, { width: 6, length: 3 }, 'database width and length must not be reversed');

const pool = buildLegalPool(database, profile, rules);
assert.equal(pool.diagnostics.length, 0);
assert(!pool.legal.some((item) => item.name === 'Star Scanner'), 'unowned Merchant items must be rejected');
assert(!pool.legal.some((item) => item.name === 'King Dropper'), 'unowned Achievement items must be rejected');
assert(!pool.legal.some((item) => /teleport/i.test(item.name)), 'teleporters remain disabled until their rules are supplied');

const dropper = pool.legal.find((item) => item.name === 'Iron Dropper' && item.variant === 'Base');
const cap = optimizeCapgraders({ initialValue: dropper.mainStat, legalItems: pool.legal, profile, rules });
assert(cap.best.finalInput / cap.best.finalCap >= 0.95, 'cap solver must reach the accepted 5% final-cap band');
let enteredCapSection = false;
for (const entry of cap.best.chain) {
  const isCapgrader = entry.item.sourceSheets.some((source) => source.sheet === 'Capgrader');
  if (isCapgrader) enteredCapSection = true;
  if (enteredCapSection) assert(isCapgrader, 'normal multiplier cannot interrupt the capgrader section');
  else assert(entry.item.name === 'Lunar Landing' || /additive/i.test(entry.item.mainStatType), 'only Lunar or a better additive may open the capgrader section');
}

const simulationInput = {
  seconds: 60,
  seed: 42,
  droppers: [{ oresPerSecond: 2, value: 10 }],
  routeTimeSeconds: 5,
  stages: [{ multiplier: 3, destructionChance: 0.2 }],
  furnaceMultiplier: 2,
};
assert.deepEqual(seededOreSimulation(simulationInput), seededOreSimulation(simulationInput), 'same seed must produce the same simulation');

const flamethrower = findItem(database, 'Ore Flamethrower', 'Base');
const oasis = findItem(database, 'Oasis Cleanser', 'Base');
const fireSafety = evaluateEffectSafety({
  dropper,
  dropperCount: 1,
  chain: [{ item: flamethrower }, { item: oasis }],
  layout: { connections: [{ fromSequence: 1, toSequence: 2, seconds: 0.1 }] },
  rules,
});
assert.equal(fireSafety.safe, true, 'Oasis must remove Fire before its destruction timer');
assert.equal(fireSafety.effects.length, 1, 'removing Fire must not be mistaken for applying Fire');
assert.equal(fireSafety.effects[0].removedBy, 'Oasis Cleanser');
const nuclearSafety = evaluateEffectSafety({
  dropper,
  dropperCount: 1,
  chain: [{ item: { ...flamethrower, name: 'Nuclear Test', effects: 'Applies Nuclear Effect' } }, { item: oasis }],
  layout: { connections: [{ fromSequence: 1, toSequence: 2, seconds: 6 }] },
  rules,
});
assert.equal(nuclearSafety.effects[0].removedBy, 'Furnace', 'Oasis must not remove Nuclear');

const activePlan = {
  version: 1,
  profile: { plotSize: 14 },
  diagnostics: [],
  route: [],
  furnaceZone: { x: 9, y: 2, width: 2, height: 2 },
  items: [
    { id: 'dropper', name: 'Test Dropper', type: 'dropper', x: 1, y: 2, width: 3, height: 2, itemWidth: 2, itemLength: 3, direction: 'east', conveyorWidth: 0 },
    { id: 'upgrader', name: 'Test Upgrader', type: 'upgrader', x: 5, y: 1, width: 3, height: 4, itemWidth: 4, itemLength: 3, direction: 'east', conveyorWidth: 2 },
    { id: 'furnace', name: 'Test Furnace', type: 'furnace', x: 9, y: 1, width: 4, height: 4, itemWidth: 4, itemLength: 4, direction: 'west', conveyorWidth: 0 },
  ],
  conveyors: [
    { id: 'merge', name: 'Half Conveyor 1', conveyor: 'Half Conveyor', x: 4, y: 2, width: 1, height: 2, direction: 'east', speed: 12 },
    { id: 'furnace-entry', name: 'Half Conveyor 2', conveyor: 'Half Conveyor', x: 8, y: 2, width: 1, height: 2, direction: 'east', speed: 12 },
  ],
};
const validation = validatePlan(activePlan, rules);
assert.equal(validation.valid, true, JSON.stringify(validation.diagnostics));
assert(activePlan.items.filter((item) => item.type === 'dropper').every((item) => item.conveyorWidth === 0), 'droppers must not render internal conveyors');
assert(activePlan.items.some((item) => item.type === 'furnace'), 'plan must include a furnace');

const broken = structuredClone(activePlan);
broken.conveyors = broken.conveyors.filter((_, index) => index !== 0);
assert.equal(validatePlan(broken, rules).valid, false, 'a route gap must fail validation');

console.log('Engine profile, cap search, effect removal, deterministic simulation, and route validation checks passed.');
