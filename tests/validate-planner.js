const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'app.js');
const indexPath = path.join(root, 'index.html');
const databasePath = path.join(root, 'data', 'Tycoon Sim Database.xlsx');
const source = fs.readFileSync(appPath, 'utf8');
const indexSource = fs.readFileSync(indexPath, 'utf8');
const executableEnd = source.indexOf("sizeSlider.addEventListener");

assert.ok(executableEnd > 0, 'Could not locate the planner startup section.');
assert.match(source, /let workflowStage = 0;/, 'Workflow must start at step 1.');
assert.match(source, /let activePlan = null;/, 'Board must start empty.');
assert.ok(fs.existsSync(databasePath), 'The database workbook is missing.');
assert.ok(
  fs.statSync(databasePath).size > 1_000_000,
  'The database workbook appears incomplete.',
);
assert.match(indexSource, /id="item-tooltip"/, 'Item tooltip is missing.');
assert.match(indexSource, /id="item-editor"/, 'Item editor dialog is missing.');
assert.match(indexSource, /data-action="move-item"/, 'Move control is missing.');
assert.match(indexSource, /data-action="rotate-left"/, 'Left rotation control is missing.');
assert.match(indexSource, /data-action="rotate-right"/, 'Right rotation control is missing.');
assert.match(indexSource, /data-action="remove-item"/, 'Remove control is missing.');
assert.match(source, /pointerenter/, 'Hover details are not wired to plan items.');
assert.match(source, /openItemEditor/, 'Plan-item click editing is not wired.');

const sandbox = {
  document: {
    querySelector: () => ({}),
  },
};
vm.createContext(sandbox);
vm.runInContext(
  `${source.slice(0, executableEnd)}
  this.planner = {
    coordinateMap,
    routeSegments,
    validation,
    activePlan,
    placeItem,
    parseCoordinate,
    rotateDirection,
    updateItemGeometry,
    calculateExpectedEconomy,
    validateCoordinateMap,
    validateRouteSegments,
  };`,
  sandbox,
);

const {
  coordinateMap,
  routeSegments,
  validation,
  activePlan,
  placeItem,
  parseCoordinate,
  rotateDirection,
  updateItemGeometry,
  calculateExpectedEconomy,
  validateCoordinateMap,
  validateRouteSegments,
} = sandbox.planner;

assert.equal(coordinateMap.length, 0, 'Cleared item data remains in app.js.');
assert.equal(routeSegments.length, 0, 'Cleared route data remains in app.js.');
assert.equal(validation, null, 'Cleared validation data remains in app.js.');
assert.equal(activePlan, null, 'The committed board is not empty.');

assert.deepEqual(
  { ...parseCoordinate('AA35') },
  { x: 27, y: 35 },
  'A1 coordinate parsing failed.',
);
assert.deepEqual(
  { ...parseCoordinate('3, 5') },
  { x: 3, y: 5 },
  'Numeric coordinate parsing failed.',
);
assert.equal(rotateDirection('north', 'left'), 'west');
assert.equal(rotateDirection('north', 'right'), 'east');

const rotationFixtures = [
  placeItem(1, 'Even North', 1, 1, 6, 3, 'north'),
  placeItem(2, 'Even East', 8, 1, 6, 3, 'east'),
  placeItem(3, 'Odd South', 1, 8, 3, 2, 'south'),
  placeItem(4, 'Odd West', 8, 8, 3, 2, 'west'),
];

const detailedItem = placeItem(
  5,
  'Detailed Upgrader',
  4,
  5,
  6,
  3,
  'north',
  'upgrader',
  { description: 'Fixture description', stats: { Multiplier: '3x' } },
);
assert.equal(detailedItem.description, 'Fixture description');
assert.equal(detailedItem.stats.Multiplier, '3x');
const rotatedDetailedItem = updateItemGeometry(detailedItem, {
  direction: rotateDirection(detailedItem.direction, 'right'),
});
assert.equal(rotatedDetailedItem.direction, 'east');
assert.equal(rotatedDetailedItem.width, 3);
assert.equal(rotatedDetailedItem.height, 6);

assert.deepEqual(
  {
    width: rotationFixtures[0].width,
    height: rotationFixtures[0].height,
    conveyorWidth: rotationFixtures[0].conveyorWidth,
  },
  { width: 6, height: 3, conveyorWidth: 2 },
);
assert.deepEqual(
  {
    width: rotationFixtures[1].width,
    height: rotationFixtures[1].height,
    conveyorWidth: rotationFixtures[1].conveyorWidth,
  },
  { width: 3, height: 6, conveyorWidth: 2 },
);
assert.deepEqual(
  {
    width: rotationFixtures[2].width,
    height: rotationFixtures[2].height,
    conveyorWidth: rotationFixtures[2].conveyorWidth,
  },
  { width: 3, height: 2, conveyorWidth: 1 },
);
assert.deepEqual(
  {
    width: rotationFixtures[3].width,
    height: rotationFixtures[3].height,
    conveyorWidth: rotationFixtures[3].conveyorWidth,
  },
  { width: 2, height: 3, conveyorWidth: 1 },
);

const mappedTiles = validateCoordinateMap(rotationFixtures, 20);
assert.equal(
  mappedTiles,
  rotationFixtures.reduce((sum, item) => sum + item.width * item.height, 0),
  'Fixture item tile count is incorrect.',
);

const routeFixtures = [
  {
    name: 'Fixture Conveyor',
    x: 14,
    y: 1,
    width: 2,
    height: 2,
  },
  {
    name: 'Fixture Quarter',
    x: 16,
    y: 2,
    width: 1,
    height: 1,
  },
];
assert.equal(
  validateRouteSegments(routeFixtures, rotationFixtures, 20),
  5,
  'Fixture route tile count is incorrect.',
);

assert.throws(
  () => validateCoordinateMap([
    placeItem(1, 'Overlap A', 1, 1, 2, 2, 'north'),
    placeItem(2, 'Overlap B', 2, 2, 2, 2, 'north'),
  ], 20),
  /overlaps/,
  'Item-overlap validation did not fail.',
);
assert.throws(
  () => validateCoordinateMap([
    placeItem(1, 'Out of bounds', 20, 20, 2, 2, 'north'),
  ], 20),
  /outside/,
  'Boundary validation did not fail.',
);
assert.throws(
  () => validateRouteSegments([
    { name: 'Bad Route', x: 1, y: 1, width: 1, height: 1 },
  ], rotationFixtures, 20),
  /overlaps an item/,
  'Route/item-overlap validation did not fail.',
);

const economy = calculateExpectedEconomy({
  cashPerOre: 100,
  oreCap: 100,
  droppers: [
    { routeTimeSeconds: 15, oresPerSecond: 2 },
    { routeTimeSeconds: 15, oresPerSecond: 2 },
    { routeTimeSeconds: 15, oresPerSecond: 2 },
    { routeTimeSeconds: 15, oresPerSecond: 2 },
  ],
});
assert.equal(economy.projectedActiveOres, 120);
assert.equal(economy.weightedRouteTime, 15);
assert.equal(Number(economy.estimatedEntriesPerMinute.toFixed(1)), 400);
assert.equal(economy.expectedCashPerMinute, 40_000);
assert.equal(economy.limitedByOreCap, true);

const measuredEconomy = calculateExpectedEconomy({
  cashPerOre: 250,
  oreCap: 100,
  knownFurnaceEntriesPerMinute: 90,
  droppers: [{ routeTimeSeconds: 10, oresPerSecond: 1 }],
});
assert.equal(measuredEconomy.estimatedEntriesPerMinute, 90);
assert.equal(measuredEconomy.expectedCashPerMinute, 22_500);

const destructiveEconomy = calculateExpectedEconomy({
  cashPerOre: 1_000,
  oreCap: 100,
  droppers: [{
    routeTimeSeconds: 20,
    averageRemovalTimeSeconds: 12,
    oresPerSecond: 4,
    processedFraction: 0.6,
  }],
});
assert.equal(destructiveEconomy.projectedActiveOres, 48);
assert.equal(destructiveEconomy.estimatedEntriesPerMinute, 144);
assert.equal(destructiveEconomy.expectedCashPerMinute, 144_000);

console.log(
  'Planner validation passed: blank board, editor controls, rotation, internal '
  + 'path width, boundaries, overlaps, database, throughput, and cash/min.',
);
