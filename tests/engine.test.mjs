import assert from 'node:assert/strict';
import path from 'node:path';
import { loadDatabase, loadRules, findItem } from '../engine/database.mjs';
import { buildLegalPool } from '../engine/profile.mjs';
import { compareOptimizationMetrics, optimizeCapgraders } from '../engine/optimizer.mjs';
import { seededOreSimulation } from '../engine/simulation.mjs';
import { validatePlan } from '../engine/validate.mjs';
import { destructiveEffectsInChain, evaluateEffectSafety } from '../engine/effects.mjs';
import { validateCoordinateMap } from '../engine/coordinate-map.mjs';
import { readJson } from '../engine/utils.mjs';
import { appliedEffectsForItem, applyDeterministicItem, canActivateItem } from '../engine/models.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [database, rules, profile] = await Promise.all([
  loadDatabase(root),
  loadRules(root),
  readJson(path.join(root, 'profiles', 'example.json')),
]);

assert(compareOptimizationMetrics(
  { expectedCashPerMinute: 101, remainingTiles: 1, routeTimeSeconds: 100 },
  { expectedCashPerMinute: 100, remainingTiles: 999, routeTimeSeconds: 1 },
  rules,
) > 0, 'cash per minute must outrank space and route time');
assert(compareOptimizationMetrics(
  { expectedCashPerMinute: 100, remainingTiles: 11, routeTimeSeconds: 100 },
  { expectedCashPerMinute: 100, remainingTiles: 10, routeTimeSeconds: 1 },
  rules,
) > 0, 'remaining space must be the first tie-breaker');
assert(compareOptimizationMetrics(
  { expectedCashPerMinute: 100, remainingTiles: 10, routeTimeSeconds: 9 },
  { expectedCashPerMinute: 100, remainingTiles: 10, routeTimeSeconds: 10 },
  rules,
) > 0, 'shorter route time must be the final tie-breaker');

assert.equal(new Set(database.records.map((record) => record.key)).size, database.records.length, 'compact index should contain one record per item variant');
assert(database.records.length < 727, 'compact index should be smaller than the raw repeated-row database');
const runic = findItem(database, 'Runic Array', 'Shiny Mythic');
assert.deepEqual(runic.size, { width: 6, length: 3 }, 'database width and length must not be reversed');

const pool = buildLegalPool(database, profile, rules);
assert.equal(pool.diagnostics.length, 0);
assert(!pool.legal.some((item) => item.name === 'Star Scanner'), 'unowned Merchant items must be rejected');
assert(!pool.legal.some((item) => item.name === 'King Dropper'), 'unowned Achievement items must be rejected');
assert(!pool.legal.some((item) => /teleport/i.test(item.name)), 'teleporters remain disabled until their rules are supplied');
assert(!pool.legal.some((item) => item.name === 'Ore Wash'), 'all Ore Wash variants must inherit the Base item Rebirth 4 requirement');
assert(!pool.legal.some((item) => item.name === 'Electric Overdrive'), 'misspelled Rebrith 6 source must still lock the whole Electric Overdrive family');
assert(!pool.legal.some((item) => item.name === 'Intern Dropper'), 'code items require explicit ownership');
assert(!pool.legal.some((item) => item.name === 'White hat Dropper'), 'gifted items require explicit ownership');
const specialPool = buildLegalPool(database, { ...profile, specialItems: ['Intern Dropper'] }, rules);
assert(specialPool.legal.some((item) => item.name === 'Intern Dropper'), 'explicitly owned code items must be legal');
assert(!specialPool.legal.some((item) => item.name === 'White hat Dropper'), 'unowned gifted items must remain illegal');

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
const acidPlant = findItem(database, 'Acid Plant', 'Base');
const nuclearUpgrader = findItem(database, 'Nuclear Upgrader', 'Base');
const dragon = findItem(database, "Dragon's Breath", 'Base');
const collider = findItem(database, 'Chartreuse Collider', 'Base');
const oilWell = findItem(database, 'Oil Well', 'Base');
const prismatic = findItem(database, 'Prismatic Upgrader', 'Base');
const lambda = findItem(database, 'Lambda Upgrader', 'Base');
assert.deepEqual(destructiveEffectsInChain([{ item: acidPlant }], rules), ['Toxic'], 'Acid Plant must apply Toxic');
assert.deepEqual(destructiveEffectsInChain([{ item: nuclearUpgrader }], rules), ['Nuclear'], 'Nuclear Upgrader must apply Nuclear');
assert.deepEqual(destructiveEffectsInChain([{ item: oilWell }], rules), [], 'mentioning that Fire ore explodes must not make Oil Well a Fire source');
assert(rules.effectDefinitions.Toxic.appliedBy.includes('Acid Plant'), 'effect registry must identify Acid Plant as the Toxic source');
assert(rules.effectDefinitions.Nuclear.appliedBy.includes('Nuclear Upgrader'), 'effect registry must identify Nuclear Upgrader as the Nuclear source');
const cleanOre = { value: 100, survival: 1, replication: 1, oreSize: 1, effects: [], timeSeconds: 0, area: 0 };
const firstAcid = applyDeterministicItem(acidPlant, cleanOre, 1, profile, rules);
assert(firstAcid.value > cleanOre.value && firstAcid.effects.includes('Toxic'), 'Acid Plant must trigger on effect-free ore and apply Toxic');
assert.equal(canActivateItem(acidPlant, firstAcid), false, 'a second Acid Plant must not trigger after the first applies Toxic');
assert.equal(applyDeterministicItem(acidPlant, firstAcid, 2, profile, rules).value, firstAcid.value, 'a second Acid Plant must not upgrade Toxic ore');
const rainbowOre = applyDeterministicItem(prismatic, cleanOre, 1, profile, rules);
assert(rainbowOre.effects.includes('Rainbow'), 'Prismatic must register its Rainbow effect');
assert.equal(applyDeterministicItem(acidPlant, rainbowOre, 1, profile, rules).value, rainbowOre.value, 'Acid Plant must not trigger after Prismatic');
const lambdaOre = applyDeterministicItem(lambda, cleanOre, 1, profile, rules);
assert(lambdaOre.effects.includes('Sparkles'), 'Lambda must conservatively register its possible Sparkles effect');
assert.equal(applyDeterministicItem(acidPlant, lambdaOre, 1, profile, rules).value, lambdaOre.value, 'Acid Plant must not trigger after Lambda');
const fireDropper = findItem(database, 'Fire Crystal Dropper', 'Base');
const naturalEffectOre = { ...cleanOre, effects: appliedEffectsForItem(fireDropper, rules) };
assert(naturalEffectOre.effects.length > 0, 'natural dropper effects must seed the ore effect state');
assert.equal(applyDeterministicItem(acidPlant, naturalEffectOre, 1, profile, rules).value, naturalEffectOre.value, 'Acid Plant must not trigger on a naturally effected ore');
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
  chain: [{ item: nuclearUpgrader }, { item: oasis }],
  layout: { connections: [{ fromSequence: 1, toSequence: 2, seconds: 6 }] },
  rules,
});
assert.equal(nuclearSafety.effects[0].removedBy, 'Furnace', 'Oasis must not remove Nuclear');
const mappedNuclearSafety = evaluateEffectSafety({
  dropper,
  dropperCount: 3,
  chain: [{ item: { ...flamethrower, name: 'Nuclear Upgrader', effects: 'Applies Nuclear Effect' } }],
  layout: { connections: [{ fromSequence: 3, toSequence: 4, seconds: 3.375 }] },
  rules,
});
assert.equal(rules.destructiveEffectTimers.Nuclear, 3, 'Nuclear must use its three-second destruction timer');
assert.equal(mappedNuclearSafety.safe, false, 'a Nuclear route taking 3.375 seconds to the furnace must be rejected');
assert(mappedNuclearSafety.effects[0].marginSeconds < 0, 'unsafe Nuclear routes must report a negative safety margin');
const timedEffectSafety = (item, seconds) => evaluateEffectSafety({
  dropper,
  chain: [{ item }],
  layout: { connections: [{ fromSequence: 1, toSequence: 2, seconds }] },
  rules,
});
assert.equal(timedEffectSafety(acidPlant, 4.999).safe, true, 'Toxic from Acid Plant must survive for less than five seconds');
assert.equal(timedEffectSafety(acidPlant, 5).safe, false, 'Toxic from Acid Plant must be destroyed at five seconds');
assert.equal(timedEffectSafety(nuclearUpgrader, 3).safe, false, 'Nuclear from Nuclear Upgrader must be destroyed at three seconds');
assert.equal(timedEffectSafety(flamethrower, 2).safe, false, 'Flamethrower Fire must be destroyed at two seconds');
assert.equal(timedEffectSafety(dragon, 2.5).safe, true, 'Dragon Fire must use its three-second source override');
assert.equal(timedEffectSafety(collider, 3).safe, false, 'Overcharged must be destroyed at three seconds');

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

const coordinateProfile = {
  plotSize: 20,
  rebirth: 3,
  dropper: { name: 'Iron Dropper', variant: 'Base' },
  highestCrate: 'Space',
  variants: 'any',
  payment: 'f2p',
  merchantItems: [],
  secretItems: [],
  achievementItems: [],
  specialItems: [],
  premiumItems: [],
  inventory: {},
  requiredItems: [],
  forbiddenItems: [],
  objective: 'cash-per-minute',
};
const coordinateMap = {
  plotSize: 20,
  items: [
    { order: 1, name: 'Iron Dropper', variant: 'Base', topLeft: 'B4', bottomRight: 'C6', facing: 'north' },
    { order: 2, name: 'Fine Point Upgrader', variant: 'Base', topLeft: 'D1', bottomRight: 'F4', facing: 'east' },
    { order: 3, name: 'Portable Upgrader', variant: 'Base', topLeft: 'G4', bottomRight: 'G5', facing: 'north' },
    { order: 4, name: 'Dyson Module', variant: 'Base', topLeft: 'H1', bottomRight: 'L6', facing: 'west', section: 'furnace' },
  ],
  conveyorRuns: [
    { type: 'Centering Conveyor', cells: 'B2:C3', facing: 'east' },
    { type: 'Half Conveyor', cells: 'G2:G3', facing: 'east' },
  ],
};
const coordinateValidation = validateCoordinateMap({ map: coordinateMap, database, rules, profile: coordinateProfile });
assert.equal(coordinateValidation.valid, true, JSON.stringify(coordinateValidation.diagnostics));
assert.equal(coordinateValidation.routes.length, 1, 'the synthetic dropper needs a directed route');
assert.deepEqual(coordinateValidation.furnaceZone, { x: 8, y: 3, width: 2, height: 2 }, 'Dyson processing zone must be front-center and face the conveyor');
assert.equal(coordinateValidation.portableUsesPerOre, 1, 'the adjacent portable must hit the first beam tile');

const unsafeCoordinateMap = structuredClone(coordinateMap);
unsafeCoordinateMap.conveyorRuns[0].type = 'Supercharged Conveyor';
const unsafeCoordinateValidation = validateCoordinateMap({ map: unsafeCoordinateMap, database, rules, profile: coordinateProfile });
assert.equal(unsafeCoordinateValidation.valid, false, 'a side-fed dropper without centering must fail');
assert(unsafeCoordinateValidation.diagnostics.some((entry) => entry.code === 'WRONG_LANE'), 'side-fed droppers must be centered before Fine Point');

const spacedPortableMap = structuredClone(coordinateMap);
spacedPortableMap.items.find((item) => item.name === 'Portable Upgrader').topLeft = 'G5';
spacedPortableMap.items.find((item) => item.name === 'Portable Upgrader').bottomRight = 'G6';
const spacedPortableValidation = validateCoordinateMap({ map: spacedPortableMap, database, rules, profile: coordinateProfile });
assert.equal(spacedPortableValidation.valid, false, 'a portable with an unnecessary one-tile gap must fail');
assert(spacedPortableValidation.diagnostics.some((entry) => entry.code === 'PORTABLE_SPACING'), 'portable spacing regression must be reported');

const reversedPortableMap = structuredClone(coordinateMap);
reversedPortableMap.items.find((item) => item.name === 'Portable Upgrader').facing = 'south';
const reversedPortableValidation = validateCoordinateMap({ map: reversedPortableMap, database, rules, profile: coordinateProfile });
assert.equal(reversedPortableValidation.valid, false, 'a portable facing away from the route must fail');
assert(reversedPortableValidation.diagnostics.some((entry) => entry.code === 'PORTABLE_UNREACHABLE'), 'portable direction regression must be reported');

const preCapPortableMap = structuredClone(coordinateMap);
const preCapPortable = preCapPortableMap.items.find((item) => item.name === 'Portable Upgrader');
preCapPortable.topLeft = 'D5';
preCapPortable.bottomRight = 'D6';
preCapPortable.facing = 'north';
const preCapPortableValidation = validateCoordinateMap({ map: preCapPortableMap, database, rules, profile: coordinateProfile });
assert.equal(preCapPortableValidation.valid, false, 'a portable beam touching the final capgrader before ore exits it must fail');
assert(preCapPortableValidation.diagnostics.some((entry) => entry.code === 'PORTABLE_BEFORE_CAP'), 'pre-cap portable use must have a dedicated regression code');

const unsafeTurnMap = {
  plotSize: 20,
  items: [
    { order: 1, name: 'Iron Dropper', variant: 'Base', topLeft: 'B2', bottomRight: 'D3', facing: 'east' },
    { order: 2, name: 'Fine Point Upgrader', variant: 'Base', topLeft: 'H4', bottomRight: 'J7', facing: 'east' },
    { order: 3, name: 'Dyson Module', variant: 'Base', topLeft: 'L3', bottomRight: 'P8', facing: 'west', section: 'furnace' },
  ],
  conveyorRuns: [
    { type: 'Supercharged Conveyor', cells: 'E2:F3', facing: 'east' },
    { type: 'Quarter Conveyor', cells: 'G2:G4', facing: 'south' },
    { type: 'Half Conveyor', cells: 'G5:G6', facing: 'east' },
    { type: 'Half Conveyor', cells: 'K5:K6', facing: 'east' },
  ],
};
const unsafeTurnValidation = validateCoordinateMap({ map: unsafeTurnMap, database, rules, profile: coordinateProfile });
assert.equal(unsafeTurnValidation.valid, false, 'an 18-speed approach to a turn must fail');
assert(unsafeTurnValidation.diagnostics.some((entry) => entry.code === 'TURN_SPEED'), 'the validator must reject speed above 16.8 before a turn');

console.log('Engine profile, cap search, effect removal, deterministic simulation, and route validation checks passed.');
