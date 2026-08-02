const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const appSource = read('app.js');
const coreSource = read('planner-core.js');
const indexSource = read('index.html');
const rulesSource = read('docs/BUILD_RULES.md');
const databasePath = path.join(root, 'data', 'Tycoon Sim Database.xlsx');
const generatedDatabaseSource = read('data/items.generated.js');
const workflowStateSource = read('data/workflow-state.js');
const cliSource = read('scripts/planner-cli.mjs');
const packageSource = read('package.json');

assert.ok(fs.existsSync(databasePath));
assert.ok(fs.statSync(databasePath).size > 1_000_000);
assert.doesNotMatch(appSource, /function loadKunziteAlienPlan/);
assert.match(appSource, /function clearPlanner/);
assert.match(cliSource, /replaceSummary: true/, 'clear must discard the previous test summary');
assert.match(appSource, /clearPlanner\(\);/);
assert.match(appSource, /item\.type !== 'portable' && item\.type !== 'dropper'/);
assert.match(rulesSource, /Droppers have no built-in conveyor/);
assert.match(rulesSource, /continuous\s+ore route/);
assert.match(indexSource, /planner-core\.js/);
assert.match(indexSource, /data\/workflow-state\.js/);
assert.match(indexSource, /data\/coordinate-preview\.js/);
assert.match(indexSource, /data\/optimization-baseline\.js/);
assert.match(indexSource, /data\/optimization-progress\.js/);
assert.match(indexSource, /id="stage-preview-summary"/);
assert.match(appSource, /function loadWorkflowProgress/);
assert.match(appSource, /function renderPlanningPreview/);
assert.match(cliSource, /plans', 'coordinate-map\.json'\), \{ force: true \}/);
assert.match(cliSource, /plans', 'route-validation\.json'\), \{ force: true \}/);
assert.match(cliSource, /plans', 'optimization-baseline\.json'\), \{ force: true \}/);
assert.match(appSource, /4\. Optimization and grid preview/);
assert.match(cliSource, /removedActiveProfile/);
assert.match(cliSource, /writeCoordinatePreview\(null\)/);
assert.match(cliSource, /writeOptimizationBaseline\(null\)/);
assert.match(cliSource, /writeOptimizationProgress\(null\)/);
assert.match(cliSource, /optimization-in-progress/);
assert.match(cliSource, /restoreCoordinateMapPreview/);
assert.match(cliSource, /Step 5 cannot complete until finalVerificationComplete/);
assert.match(cliSource, /command === 'optimize-current'/);
assert.match(cliSource, /configKey/);
assert.match(cliSource, /command === 'finalize-winner'/);
assert.match(cliSource, /PROJECT_STATE\.md/);
assert.match(packageSource, /"optimize"/);
const workflowState = JSON.parse(
  workflowStateSource.slice(
    workflowStateSource.indexOf('=') + 1,
    workflowStateSource.lastIndexOf(';'),
  ),
);
assert(Number.isInteger(workflowState.completedStage));
assert(workflowState.completedStage >= 0 && workflowState.completedStage <= 5);
const generatedDatabase = JSON.parse(
  generatedDatabaseSource.slice(
    generatedDatabaseSource.indexOf('=') + 1,
    generatedDatabaseSource.lastIndexOf(';'),
  ),
);
const kingDropperRecords = generatedDatabase.records.filter(
  (record) => record.key === 'king dropper::base',
);
assert.ok(kingDropperRecords.some((record) => record.sheet === 'Achievement Items'));
assert.ok(kingDropperRecords.every((record) => record.acquisition === 'achievement'));
assert.ok(kingDropperRecords.every((record) => record.maxCopies === 1));

const appEnd = appSource.indexOf('sizeSlider.addEventListener');
assert.ok(appEnd > 0);
const restoredWorkflowState = { completedStage: 2, status: 'mapped-complete' };
const appSandbox = { document: { querySelector: () => ({}) }, TycoonWorkflowState: restoredWorkflowState };
vm.createContext(appSandbox);
vm.runInContext(`${appSource.slice(0, appEnd)}
this.api = { coordinateMap, routeSegments, validation, activePlan, placeItem,
  parseCoordinate, rotateDirection, furnaceProcessingZoneGeometry, completedStageForPlan, workflowStage, workflowProgress };`, appSandbox);
const app = appSandbox.api;
assert.equal(app.coordinateMap.length, 0);
assert.equal(app.routeSegments.length, 0);
assert.equal(app.validation, null);
assert.equal(app.activePlan, null);
assert.equal(app.workflowStage, 2);
assert.equal(app.workflowProgress.status, 'mapped-complete');
const uiDropper = app.placeItem(1, 'Iron Dropper', 1, 1, 2, 3, 'east', 'dropper');
assert.equal(uiDropper.conveyorWidth, 0);
assert.deepEqual({ ...app.parseCoordinate('AA35') }, { x: 27, y: 35 });
assert.equal(app.rotateDirection('north', 'right'), 'east');
assert.equal(app.completedStageForPlan({ valid: true }), 3);
assert.equal(app.completedStageForPlan({ valid: true, optimization: { complete: true } }), 4);
assert.equal(app.completedStageForPlan({ valid: true, optimization: { complete: true }, finalVerification: { complete: true } }), 5);

const coreSandbox = {};
vm.createContext(coreSandbox);
vm.runInContext(coreSource, coreSandbox);
const planner = coreSandbox.TycoonPlanner;
assert.ok(planner);

const dropperDef = { name: 'Iron Dropper', variant: 'Base', type: 'dropper', size: { width: 2, length: 3 }, stats: { dropSpeed: 2 } };
const upgraderDef = { name: 'Test Upgrader', variant: 'Base', type: 'upgrader', size: { width: 2, length: 2 }, stats: { 'Conveyor speed': 12 } };
const furnaceDef = { name: 'Test Furnace', variant: 'Base', type: 'furnace', size: { width: 4, length: 3 } };
const dropper = planner.createItem(dropperDef, { x: 1, y: 1, direction: 'east' });
assert.equal(dropper.internalTransport, null);
assert.equal(dropper.conveyorWidth, 0);
assert.equal(dropper.dropPoint.cells.length, 2);
assert.deepEqual({ ...planner.rotatedFootprint(6, 3, 'north') }, { width: 6, height: 3 });
assert.deepEqual({ ...planner.rotatedFootprint(6, 3, 'east') }, { width: 3, height: 6 });

const odd = planner.createItem(
  { name: 'Odd', variant: 'Base', type: 'upgrader', size: { width: 3, length: 2 } },
  { x: 1, y: 5, direction: 'east' },
);
assert.equal(odd.conveyorWidth, 1);
assert.equal(odd.internalTransport.height, 1);

const quarterBlock = [[1, 1], [2, 1], [1, 2], [2, 2]]
  .map(([x, y]) => planner.createConveyor('Quarter Conveyor', x, y, 'east'));
const compressedBlock = planner.compressConveyors(quarterBlock);
assert.equal(compressedBlock.length, 1);
assert.equal(compressedBlock[0].conveyor, 'Supercharged Conveyor');

const quarterPair = [
  planner.createConveyor('Quarter Conveyor', 1, 1, 'east'),
  planner.createConveyor('Quarter Conveyor', 1, 2, 'east'),
];
const compressedPair = planner.compressConveyors(quarterPair);
assert.equal(compressedPair.length, 1);
assert.equal(compressedPair[0].conveyor, 'Half Conveyor');

const halfPair = [
  planner.createConveyor('Half Conveyor', 1, 1, 'east'),
  planner.createConveyor('Half Conveyor', 2, 1, 'east'),
];
assert.equal(planner.compressConveyors(halfPair)[0].conveyor, 'Supercharged Conveyor');

const routePlanner = planner.createPlanner(20);
const routeDropper = routePlanner.addItem(dropperDef, { x: 1, y: 1, direction: 'east' });
const firstStep = routePlanner.addConveyor('Normal Conveyor', 4, 1, 'east');
const upgrader = routePlanner.addItem(upgraderDef, { x: 6, y: 1, direction: 'east' });
const lastStep = routePlanner.addConveyor('Normal Conveyor', 8, 1, 'east');
const furnace = routePlanner.addItem(furnaceDef, { x: 10, y: 0, direction: 'west' });
routePlanner.state.route.push(firstStep, upgrader, lastStep);
const routeResult = routePlanner.simulate(routeDropper, furnace);
assert.equal(routeResult.valid, true, routeResult.errors.join('\n'));
assert.ok(routeResult.elapsedSeconds > 0);

const brokenResult = planner.simulateOreRoute([firstStep, { ...lastStep, x: 12 }], {
  dropCells: routeDropper.dropPoint.cells,
  furnaceZone: furnace.processingZone,
});
assert.equal(brokenResult.valid, false);
assert.ok(brokenResult.errors.some((error) => error.includes('not connected')));

const placementResult = planner.validatePlacements([
  planner.createItem(upgraderDef, { x: 1, y: 1, direction: 'north' }),
  planner.createItem(upgraderDef, { x: 1, y: 1, direction: 'north' }),
], 20);
assert.equal(placementResult.valid, false);
assert.ok(placementResult.errors.some((error) => error.includes('overlaps')));

const conflicts = planner.compareDatabaseRecords([
  { name: 'Runic Array', variant: 'Base', sheet: 'Upgraders', size: { width: 6, length: 3 } },
  { name: 'Runic Array', variant: 'Base', sheet: 'Crates', size: { width: 6, length: 5 } },
]);
assert.equal(conflicts.length, 1);
assert.equal(conflicts[0].field, 'size');
assert.throws(
  () => planner.resolveDatabaseItem(
    { records: [], conflicts: [{ item: 'runic array::base', field: 'size' }] },
    'Runic Array',
    'Base',
  ),
  /cross-sheet conflicts/,
);

const economy = planner.calculateExpectedEconomy({
  cashPerOre: 100,
  oreCap: 100,
  droppers: [{
    oresPerSecond: 10,
    routeTimeSeconds: 20,
    outcomes: [
      { probability: 0.5, removalTimeSeconds: 5, processed: false },
      { probability: 0.5, removalTimeSeconds: 20, processed: true },
    ],
  }],
});
assert.equal(economy.projectedActiveOres, 125);
assert.equal(economy.throughputScale, 0.8);
assert.equal(economy.furnaceEntriesPerMinute, 240);
assert.equal(economy.expectedCashPerMinute, 24000);

console.log('Planner core, clean-board, dropper, compression, and continuous-route checks passed.');
