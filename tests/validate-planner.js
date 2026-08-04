const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const appSource = read('app.js');
const stylesSource = read('styles.css');
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
assert.match(indexSource, /id="keybind-guide"/);
assert.match(indexSource, /id="live-ore-tracker"/);
assert.match(indexSource, /id="live-dropper-select"/);
assert.match(indexSource, /id="live-ore-content"/);
assert.match(stylesSource, /\.board-layout \{[^}]*grid-template-columns: minmax\(0, 1fr\) 330px;/s);
assert.match(stylesSource, /\.board-layout:has\(\.live-ore-tracker\[hidden\]\) \{[^}]*grid-template-columns: minmax\(0, 1fr\);/s);
assert.match(stylesSource, /\.live-ore-tracker/);
assert.match(indexSource, /id="live-ore-tracker"[\s\S]+id="live-ore-content"[\s\S]+id="keybind-guide"[\s\S]+<\/aside>/);
assert.match(stylesSource, /\.keybind-guide \{[^}]*position: static;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*width: auto;/s);
assert.match(stylesSource, /\.keybind-row \{[^}]*grid-template-columns: 52px minmax\(0, 1fr\);/s);
assert.match(stylesSource, /\.live-ore-tracker \{[^}]*grid-template-rows: auto auto minmax\(0, 1fr\) auto;[^}]*height: calc\(100vh - 190px\);/s);
assert.match(stylesSource, /\.live-ore-content \{[^}]*overflow-y: auto;[^}]*scrollbar-gutter: stable;/s);
assert.match(appSource, /function renderKeybindGuide/);
assert.match(appSource, /<kbd aria-label="Backspace or Delete">&larr; \/ Del<\/kbd><span>Delete<\/span>/);
assert.match(appSource, /<kbd>R<\/kbd><span>Rotate 90°<\/span>/);
assert.match(appSource, /<kbd>Esc<\/kbd><span>Cancel<\/span>/);
assert.match(indexSource, /data\/workflow-state\.js/);
assert.match(indexSource, /data\/coordinate-preview\.js/);
assert.match(indexSource, /data\/optimization-baseline\.js/);
assert.match(indexSource, /data\/optimization-progress\.js/);
assert.match(indexSource, /id="stage-preview-summary"/);
assert.match(indexSource, /id="item-library"/);
assert.match(indexSource, /data-category="conveyor"/);
assert.match(appSource, /button\.dataset\.category === libraryCategory[\s\S]+itemSearch\.value = '';/);
assert.match(appSource, /libraryTabs\.addEventListener\('pointerdown'[\s\S]+document\.activeElement === itemSearch/);
assert.match(appSource, /if \(shouldRestoreSearchFocus\) itemSearch\.focus\(\)/);
assert.match(indexSource, /id="library-filter-toggle"/);
assert.match(indexSource, /id="mass-selection-dialog"/);
assert.match(indexSource, /data-mass-action="rotate"/);
assert.match(indexSource, /data-mass-action="move"/);
assert.match(indexSource, /data-mass-action="delete"/);
assert.match(indexSource, /value="tier-name"/);
assert.match(stylesSource, /\.library-filter-panel/);
assert.match(stylesSource, /\.box-selection-overlay/);
assert.match(stylesSource, /\.mass-selection-bounds/);
assert.match(stylesSource, /\.mass-selection-number/);
assert.match(stylesSource, /\.mass-selection-facing/);
assert.match(stylesSource, /\.has-mass-selection/);
assert.match(stylesSource, /\.game-grid\.has-mass-selection \.portable-beam:not\(\.is-box-selected\)/);
assert.match(appSource, /portable-beam\$\{massSelectedIds\.has\(item\.id\) \? ' is-box-selected' : ''\}/);
assert.match(appSource, /Portable Spinner[\s\S]+?one-tile surrounding upgrade zone/);
assert.match(appSource, /function previewPortableBeams/);
assert.doesNotMatch(stylesSource, /mass-selection-dialog \[data-mass-action="rotate"\]/);
assert.match(stylesSource, /\.mass-selection-dialog \{[^}]*position: fixed;/s);
assert.match(stylesSource, /\.mass-selection-dialog::backdrop \{[^}]*background: transparent;/s);
assert.match(appSource, /massSelectionDialog\.show\(\)/);
assert.doesNotMatch(appSource, /massSelectionDialog\.showModal\(\)/);
assert.match(appSource, /massSelectionDialog\.style\.top = '16px'/);
assert.match(appSource, /<h2>Group selection<\/h2>/);
assert.match(appSource, /<kbd aria-label="Backspace or Delete">&larr; \/ Del<\/kbd><span>Delete selection<\/span>/);
assert.match(appSource, /massSelectionDialog\.open && massSelectedIds\.size[\s\S]+event\.key === 'Backspace' \|\| event\.key === 'Delete'[\s\S]+deleteMassSelection\(\)/);
assert.match(appSource, /massSelectionDialog\.open && massSelectedIds\.size[\s\S]+key === 'r'[\s\S]+rotateMassSelection\(\)[\s\S]+key === 'm'[\s\S]+startMassMove\(\)[\s\S]+event\.key === 'Escape'[\s\S]+clearMassSelection\(\)/);
assert.match(indexSource, /data-planner-mode="build"/);
assert.match(indexSource, /data-planner-mode="generation"/);
assert.match(indexSource, /id="clear-workspace"/);
assert.match(indexSource, /id="simulate-base"/);
assert.match(indexSource, /id="save-base"/);
assert.match(indexSource, /id="load-bases"/);
assert.match(indexSource, /planner-loadout-actions[\s\S]+id="load-bases"[\s\S]+id="save-base"[^>]+disabled/);
assert.match(indexSource, /id="save-base-dialog"/);
assert.match(indexSource, /id="load-base-dialog"/);
assert.match(indexSource, /id="confirm-load-base-dialog"/);
assert.doesNotMatch(indexSource, /Ã—/);
assert.equal((indexSource.match(/&times;/g) ?? []).length, 4);
assert.match(indexSource, /id="saved-loadout-folder-input"[^>]+webkitdirectory/);
assert.match(indexSource, /Load anyway/);
assert.match(indexSource, /Never mind/);
assert.match(indexSource, /id="size-out"/);
assert.match(indexSource, /id="size-in"/);
assert.match(appSource, /function applyBaseSize/);
assert.match(appSource, /viewPreferencesStorageKey/);
assert.match(appSource, /function saveViewPreferences/);
assert.match(appSource, /function loadViewPreferences/);
assert.match(appSource, /baseSize: Number\(sizeSlider\.value\)/);
assert.match(appSource, /gridZoom: Number\(zoomSlider\.value\)/);
assert.match(appSource, /loadViewPreferences\(\);\s*sizeSlider\.addEventListener/);
assert.match(appSource, /sizeOut\.addEventListener\('click'/);
assert.match(appSource, /sizeIn\.addEventListener\('click'/);
assert.match(stylesSource, /::-webkit-slider-thumb/);
assert.match(stylesSource, /::-moz-range-thumb/);
assert.match(stylesSource, /\.saved-base-browser/);
assert.match(stylesSource, /\.saved-base-button:disabled/);
assert.match(stylesSource, /\.saved-base-preview-grid/);
assert.match(stylesSource, /\.saved-base-list[^}]+overflow-y: auto/);
assert.match(appSource, /savedLoadoutsStorageKey = 'tycoon-sim-2:saved-loadouts:v1'/);
assert.match(appSource, /loadoutFileType = 'tycoon-sim-2-loadout'/);
assert.match(appSource, /showDirectoryPicker/);
assert.match(appSource, /function writeLoadoutFile/);
assert.match(appSource, /function importSavedLoadoutFiles/);
assert.match(appSource, /function renderSavedLoadoutPreview/);
assert.match(appSource, /function loadSavedBaseIntoGrid/);
assert.match(appSource, /function updateSavedBaseButton/);
assert.match(appSource, /validation\?\.kind === 'manual-simulation'/);
assert.match(appSource, /Red Teleporter Sender/);
assert.match(appSource, /Red Teleporter Receiver/);
assert.match(appSource, /Blue Teleporter Sender/);
assert.match(appSource, /Blue Teleporter Receiver/);
assert.match(appSource, /function loadWorkflowProgress/);
assert.match(appSource, /function renderPlanningPreview/);
assert.match(appSource, /function startPlacingRecord/);
assert.match(appSource, /function validateRouteSegments\(segments, items, size, \{ allowUncompressedQuarterConveyors = false \} = \{\}\)/);
assert.match(appSource, /function validateBuildCandidate[\s\S]+validateRouteSegments\(lanes, activePlan\.items, Number\(sizeSlider\.value\), \{ allowUncompressedQuarterConveyors: true \}\)/);
assert.match(appSource, /if \(!allowUncompressedQuarterConveyors\) \{[\s\S]+Quarter Conveyor pair[\s\S]+Straight 2x2 Quarter Conveyor block/);
assert.match(appSource, /allowUncompressedQuarterConveyors: plannerMode === 'build'/);
assert.match(appSource, /function startMovingPlacement/);
assert.match(appSource, /function showItemTooltip[\s\S]+buildInteraction \|\| massMoveInteraction[\s\S]+hideItemTooltip\(\)/);
assert.match(appSource, /function startMovingPlacement[\s\S]+hideItemTooltip\(\)/);
assert.match(appSource, /function startMovingHoveredPlacement/);
assert.match(appSource, /event\.key\.toLowerCase\(\) === 'm' && !event\.repeat && !isTypingTarget\(event\.target\)/);
assert.match(appSource, /function startCopyingHoveredPlacement/);
assert.match(appSource, /startPlacingRecord\(record, placement\.direction\)/);
assert.match(appSource, /event\.key\.toLowerCase\(\) === 'c' && !event\.repeat && !isTypingTarget\(event\.target\)/);
assert.match(appSource, /function removeHoveredPlacement/);
assert.match(appSource, /\(event\.key === 'Backspace' \|\| event\.key === 'Delete'\) && !event\.repeat && !isTypingTarget\(event\.target\)/);
assert.match(appSource, /function rotateActivePlacementClockwise/);
assert.match(appSource, /event\.key\.toLowerCase\(\) === 'r' && !event\.repeat && buildInteraction/);
assert.match(appSource, /function commitBuildInteraction/);
assert.match(appSource, /function placeOnGrid/);
assert.match(appSource, /function mapPlacementCoordinates/);
assert.match(appSource, /function saveWorkspace/);
assert.match(appSource, /function loadSavedWorkspace/);
assert.match(appSource, /function setPlannerMode/);
assert.match(appSource, /function resetWorkspaceForMode/);
assert.match(appSource, /function runManualSimulation/);
assert.match(appSource, /function renderLiveOreTracker/);
assert.match(appSource, /liveOreTracker\.hidden = !visible/);
assert.match(appSource, /TycoonPlanner\.traceManualDropper/);
assert.match(appSource, /liveDropperId: selectedLiveDropperId/);
assert.match(appSource, /selectedLiveDropperId = saved\.liveDropperId \?\? null/);
assert.match(appSource, /liveDropperSelect\.addEventListener\('change'/);
assert.match(appSource, /function manualSimulationItemHtml/);
assert.match(appSource, /Last base simulation/);
assert.match(appSource, /Value after furnace/);
assert.match(appSource, /simulationMoney\(route\.valueBeforeFurnace\)/);
assert.match(appSource, /simulationMoney\(route\.cashPerOre\)/);
assert.match(stylesSource, /\.simulation-hover-table/);
assert.match(stylesSource, /overflow-y: auto/);
assert.match(appSource, /scheduleItemTooltipHide/);
assert.match(appSource, /buildSimulationVisible/);
assert.match(appSource, /No optimizer or item suggestions were run/);
assert.match(appSource, /Generation mode · Stage 1/);
assert.match(appSource, /Build mode · Stage 3/);
assert.match(appSource, /candidate\.direction,/);
assert.match(appSource, /placement-ghost-direction/);
assert.match(appSource, /Facing \$\{candidate\.direction\}/);
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
const appSandbox = {
  document: { querySelector: () => ({ addEventListener: () => {} }) },
  TycoonWorkflowState: restoredWorkflowState,
  TycoonDatabase: generatedDatabase,
};
vm.createContext(appSandbox);
vm.runInContext(`${appSource.slice(0, appEnd)}
this.api = { coordinateMap, routeSegments, validation, activePlan, placeItem, conveyorCatalog,
  parseCoordinate, rotateDirection, updateConveyorGeometry, databaseRenderType, uniqueDatabaseRecords, mapPlacementCoordinates, placementFromRecord,
  furnaceProcessingZoneGeometry, itemTransportGeometry, updateItemGeometry, portableBeamGeometry, completedStageForPlan, categorizedManualSimulationHtml,
  shouldShowLiveOreTracker,
  libraryTier, compareLibraryRecords, filteredAndSortedLibraryRecords, axisLockedLineCoordinates,
  selectionRectangle, placementIntersectsRectangle, placementContainsCoordinate, massSelectionBounds,
  automaticBaseMetadata, crateRequirementForPlacement, loadoutFilename, normalizeSavedLoadout, abbreviateDiagnosticMoney,
  recordStats, recordDescription, displayItemDescription, statsSectionsHtml,
  setValidation: (next) => { validation = next; }, workflowStage, workflowProgress, plannerMode };`, appSandbox);
const app = appSandbox.api;
assert.equal(app.coordinateMap.length, 0);
assert.equal(app.routeSegments.length, 0);
assert.equal(app.validation, null);
assert.equal(app.activePlan.title, 'Manual build workspace');
assert.equal(app.activePlan.items.length, 0);
assert.equal(app.activePlan.lanes.length, 0);
assert.equal(app.workflowStage, 2);
assert.equal(app.workflowProgress, null);
assert.equal(app.plannerMode, 'build');
assert.equal(app.shouldShowLiveOreTracker('build', null), true);
assert.equal(app.shouldShowLiveOreTracker('build', { kind: 'manual-simulation' }), false);
assert.equal(app.shouldShowLiveOreTracker('generation', null), false);
const spinnerZones = app.portableBeamGeometry({ name: 'Portable Spinner', type: 'portable', x: 5, y: 5, width: 2, height: 2, direction: 'east', beamLength: 1 });
assert.deepEqual(JSON.parse(JSON.stringify(spinnerZones)), [
  { x: 4, y: 4, width: 4, height: 1 },
  { x: 4, y: 7, width: 4, height: 1 },
  { x: 4, y: 5, width: 1, height: 2 },
  { x: 7, y: 5, width: 1, height: 2 },
]);
assert.deepEqual(
  JSON.parse(JSON.stringify(app.portableBeamGeometry({ name: "Dragon's Breath", type: 'portable', x: 5, y: 5, width: 3, height: 3, direction: 'east', beamLength: 2 }))),
  [{ x: 8, y: 6, width: 2, height: 1 }],
);
assert.deepEqual(
  JSON.parse(JSON.stringify(app.portableBeamGeometry({ name: 'Derp Blaster', type: 'portable', x: 5, y: 5, width: 2, height: 2, direction: 'north', beamLength: 2 }))),
  [{ x: 5.5, y: 3, width: 1, height: 2 }],
);
const uiGumball = app.placeItem(1, 'Gumball Enhancer', 10, 10, 5, 3, 'north', 'upgrader');
assert.equal(uiGumball.conveyorWidth, 2);
assert.equal(uiGumball.conveyorOffset, 1);
assert.deepEqual(
  JSON.parse(JSON.stringify(app.itemTransportGeometry(uiGumball))),
  { x: 11, y: 10, width: 2, height: 3 },
);
const uiTiki = app.placeItem(2, 'Tiki Evaluator', 10, 10, 5, 4, 'north', 'upgrader');
const expectedUiTikiTransport = {
  north: { x: 12, y: 10, width: 2, height: 4 },
  east: { x: 10, y: 12, width: 4, height: 2 },
  south: { x: 11, y: 10, width: 2, height: 4 },
  west: { x: 10, y: 11, width: 4, height: 2 },
};
for (const [direction, expected] of Object.entries(expectedUiTikiTransport)) {
  const rotated = app.updateItemGeometry(uiTiki, { direction });
  assert.deepEqual(JSON.parse(JSON.stringify(app.itemTransportGeometry(rotated))), expected);
}
assert.deepEqual(
  JSON.parse(JSON.stringify(app.axisLockedLineCoordinates({ x: 2, y: 3 }, { x: 9, y: 5 }, { width: 2, height: 3 }))),
  { axis: 'horizontal', coordinates: [{ x: 2, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 3 }, { x: 8, y: 3 }] },
);
assert.equal(app.placementContainsCoordinate({ x: 5, y: 6, width: 4, height: 3 }, { x: 5, y: 6 }), true);
assert.equal(app.placementContainsCoordinate({ x: 5, y: 6, width: 4, height: 3 }, { x: 8, y: 8 }), true);
assert.equal(app.placementContainsCoordinate({ x: 5, y: 6, width: 4, height: 3 }, { x: 9, y: 8 }), false);
assert.match(appSource, /candidateAt\(placement\.x, placement\.y\);/);
assert.match(appSource, /keepCurrentMovePreview[\s\S]+placementContainsCoordinate\(buildInteraction\.candidate, clickCoordinate\)[\s\S]+if \(!keepCurrentMovePreview\) updateBuildPreview\(event\)/);
assert.deepEqual(
  JSON.parse(JSON.stringify(app.axisLockedLineCoordinates({ x: 5, y: 8 }, { x: 4, y: 1 }, { width: 2, height: 3 }, 'vertical'))),
  { axis: 'vertical', coordinates: [{ x: 5, y: 8 }, { x: 5, y: 5 }, { x: 5, y: 2 }] },
);
assert.match(appSource, /pointerdown', startMassPlacementDrag/);
assert.deepEqual(
  JSON.parse(JSON.stringify(app.selectionRectangle({ x: 8, y: 7 }, { x: 3, y: 2 }))),
  { x: 3, y: 2, width: 6, height: 6 },
);
assert.equal(app.placementIntersectsRectangle(
  { x: 8, y: 8, width: 3, height: 2 },
  { x: 2, y: 2, width: 7, height: 7 },
), true);
assert.equal(app.placementIntersectsRectangle(
  { x: 10, y: 10, width: 2, height: 2 },
  { x: 2, y: 2, width: 7, height: 7 },
), false);
assert.deepEqual(
  JSON.parse(JSON.stringify(app.massSelectionBounds([
    { x: 3, y: 5, width: 2, height: 4 },
    { x: 8, y: 2, width: 3, height: 2 },
  ]))),
  { x: 3, y: 2, width: 8, height: 7 },
);
assert.match(appSource, /ROTATES TOGETHER/);
assert.match(appSource, /pointerdown', startBoxSelectionDrag/);
const savedMetadata = app.automaticBaseMetadata([
  { name: 'Bling Dropper', stats: { Variant: 'Base' } },
  { name: 'Star Scanner', stats: { Variant: 'Base' } },
  { name: 'Godly Stone Dropper', stats: { Variant: 'Base' } },
  { name: 'King Dropper', stats: { Variant: 'Base' } },
  { name: 'Meltdown Dropper', stats: { Variant: 'Base' } },
], [], {
  valid: true,
  diagnostics: [],
  routes: [{ reachedFurnace: true }],
  metrics: {
    expectedCashPerMinute: 123456,
    oreCap: 100,
    cappedActiveOres: 80,
    projectedActiveOres: 80,
    destroyedOresPerMinute: 4,
    survivalToFurnace: .8,
    furnaceEntriesPerMinute: 16,
    routeTimeSeconds: 12,
    reservedTiles: 120,
    remainingTiles: 1105,
  },
}, 35);
assert.equal(savedMetadata.rebirth, 7);
assert.equal(savedMetadata.lastRebirthItem, 'Meltdown Dropper');
assert.equal(savedMetadata.payment, 'P2W');
assert.ok(savedMetadata.specialItems.premium.some((name) => name.includes('Bling Dropper')));
assert.ok(savedMetadata.specialItems.merchant.some((name) => name.includes('Star Scanner')));
assert.ok(savedMetadata.specialItems.secret.some((name) => name.includes('Godly Stone Dropper')));
assert.ok(savedMetadata.specialItems.achievement.some((name) => name.includes('King Dropper')));
assert.equal(app.crateRequirementForPlacement({ name: 'Iron Dropper', stats: { Variant: 'Base' } }).name, 'Advanced');
assert.equal(app.loadoutFilename('  Azure / Scanner Base  '), 'azure-scanner-base.tycoon-loadout.json');
assert.equal(
  app.abbreviateDiagnosticMoney('enters with $330268.17, outside $1000000-$15000000.'),
  'enters with $330.26K, outside $1.00M-$15.00M.',
);
const sortedLibrary = app.filteredAndSortedLibraryRecords([
  { name: 'Zulu', type: 'upgrader', variant: 'Base', rarity: 'Epic' },
  { name: 'Beta', type: 'upgrader', variant: 'Base', rarity: 'Common' },
  { name: 'Alpha', type: 'upgrader', variant: 'Shiny', rarity: 'Common' },
  { name: 'Alpha', type: 'upgrader', variant: 'Base', rarity: 'Common' },
], { tier: 'all', variant: 'all', sortMode: 'tier-name' });
assert.deepEqual(
  JSON.parse(JSON.stringify(sortedLibrary.map((record) => `${record.rarity}:${record.name}:${record.variant}`))),
  ['Common:Alpha:Base', 'Common:Alpha:Shiny', 'Common:Beta:Base', 'Epic:Zulu:Base'],
);
const rareOnly = app.filteredAndSortedLibraryRecords([
  { name: 'Common Item', type: 'dropper', variant: 'Base', rarity: 'Common' },
  { name: 'Rare Item', type: 'dropper', variant: 'Base', rarity: 'Rare' },
], { tier: 'Rare', variant: 'all', sortMode: 'tier-name' });
assert.deepEqual(JSON.parse(JSON.stringify(rareOnly.map((record) => record.name))), ['Rare Item']);
app.setValidation({
  kind: 'manual-simulation',
  diagnostics: [],
  routes: [{
    dropperOrder: 1,
    stages: [{
      itemId: 'lambda-ui', beforeValue: 100, afterValue: 250, beforeOreSize: 1, afterOreSize: 1,
      survivalBefore: 1, survivalAfter: .75, itemSurvival: .75, destructionChance: .25, destroyedOresPerMinute: 15,
      replicationBefore: 1, replicationAfter: 1, arrivalSeconds: 3, crossingSeconds: .5,
      outcomeModel: { expectedValuePerInput: 187.5, outcomes: [
        { label: '2.2x', probability: .75, value: 220 },
        { label: 'Destroyed', probability: .25, destroyed: true },
      ] },
    }],
  }],
});
const categorizedLambdaHtml = app.categorizedManualSimulationHtml({ id: 'lambda-ui', type: 'upgrader' });
assert.match(categorizedLambdaHtml, /Route timing/);
assert.match(categorizedLambdaHtml, /Expected value & RNG/);
assert.match(categorizedLambdaHtml, /Ore destruction/);
assert.match(categorizedLambdaHtml, /Reaches item/);
assert.match(categorizedLambdaHtml, /Still alive after/);
assert.match(categorizedLambdaHtml, /Destroyed here/);
assert.match(categorizedLambdaHtml, /Survives this item/);
assert.match(categorizedLambdaHtml, /dropper's original ore output/);
assert.doesNotMatch(categorizedLambdaHtml, /Original entering|Survive this use|Original after|Original lost here/);
assert.doesNotMatch(categorizedLambdaHtml, /<h3>Ore size<\/h3>/);
assert.doesNotMatch(categorizedLambdaHtml, /<h3>Ore replication<\/h3>/);
app.setValidation({
  kind: 'manual-simulation',
  diagnostics: [],
  routes: [{
    dropperOrder: 1,
    stages: [{
      itemId: 'scanner-ui', beforeValue: 100, afterValue: 190, beforeOreSize: 1, afterOreSize: 1,
      survivalBefore: 1, survivalAfter: 1, destructionChance: 0, destroyedOresPerMinute: 0,
      replicationBefore: 1, replicationAfter: 1, arrivalSeconds: 3, crossingSeconds: .5,
      outcomeModel: { expectedValuePerInput: 190, outcomes: [
        { label: 'Hit: 2x', probability: .9, value: 200 },
        { label: 'Miss: unchanged', probability: .1, value: 100 },
      ] },
    }],
  }],
});
const categorizedScannerHtml = app.categorizedManualSimulationHtml({ id: 'scanner-ui', type: 'upgrader' });
assert.match(categorizedScannerHtml, /Expected value & RNG/);
assert.doesNotMatch(categorizedScannerHtml, /Ore destruction/);
assert.doesNotMatch(categorizedScannerHtml, /<h3>Ore size<\/h3>/);
const uiDropper = app.placeItem(1, 'Iron Dropper', 1, 1, 2, 3, 'east', 'dropper');
assert.equal(uiDropper.conveyorWidth, 0);
assert.deepEqual({ ...app.parseCoordinate('AA35') }, { x: 27, y: 35 });
assert.equal(app.rotateDirection('north', 'right'), 'east');
assert.equal(app.databaseRenderType({ name: 'Portable Spinner', type: 'upgrader' }), 'portable');
assert.equal(app.databaseRenderType({ name: 'Fusion Upgrader', type: 'upgrader', sourceSheets: [{ sheet: 'Capgrader' }] }), 'capgrader');
const solarRecords = app.uniqueDatabaseRecords(generatedDatabase.records.filter((record) => record.name === 'Solar Upgrader'));
assert.deepEqual(JSON.parse(JSON.stringify(solarRecords.map((record) => record.variant))), ['Base', 'Shiny']);
assert.ok(solarRecords.every((record) => record.sheet === 'Upgraders'));
const lambdaRecord = app.uniqueDatabaseRecords(generatedDatabase.records.filter(
  (record) => record.key === 'lambda upgrader::base',
))[0];
assert.ok(lambdaRecord);
assert.doesNotMatch(lambdaRecord.description, /refer to (?:the )?["“]?stats for nerds/i);
assert.match(lambdaRecord.description, /1\/19|upgrade count/i);
assert.equal(Object.hasOwn(app.recordStats(lambdaRecord), 'Effects'), false);
const legacyEffectHtml = app.statsSectionsHtml({
  Effects: 'Refer to the "Stats for Nerds" Page',
  Variant: 'Base',
});
assert.doesNotMatch(legacyEffectHtml, /Effect & safety/i);
assert.doesNotMatch(legacyEffectHtml, /Stats for Nerds/i);
const refreshedLambdaDescription = app.displayItemDescription({
  name: 'Lambda Upgrader',
  variant: 'Base',
  description: 'Refer to the "Stats for Nerds" Page',
  stats: { Variant: 'Base' },
});
assert.doesNotMatch(refreshedLambdaDescription, /Stats for Nerds/i);
assert.match(refreshedLambdaDescription, /1\/19|upgrade count/i);
const rotatedConveyor = app.updateConveyorGeometry({
  x: 2, y: 3, direction: 'east', itemWidth: 4, itemLength: 2, width: 2, height: 4,
}, { direction: 'north' });
assert.deepEqual(
  { x: rotatedConveyor.x, y: rotatedConveyor.y, width: rotatedConveyor.width, height: rotatedConveyor.height, direction: rotatedConveyor.direction },
  { x: 2, y: 3, width: 4, height: 2, direction: 'north' },
);
const mappedPlacement = app.mapPlacementCoordinates({ x: 2, y: 3, width: 2, height: 3, direction: 'south' });
assert.equal(mappedPlacement.topLeft, 'B3');
assert.equal(mappedPlacement.bottomRight, 'C5');
assert.equal(mappedPlacement.coordinateRange, 'B3:C5');
assert.equal(mappedPlacement.facing, 'south');
assert.deepEqual({ ...mappedPlacement.footprint }, { width: 2, height: 3 });
assert.equal(mappedPlacement.occupiedCells.length, 6);
assert.deepEqual({ ...mappedPlacement.occupiedCells[5] }, { x: 3, y: 5, coordinate: 'C5' });
const repeatedConveyor = app.placementFromRecord(
  { key: 'conveyor::ultracharged', name: 'Ultracharged Conveyor', type: 'conveyor', size: { width: 4, length: 2 }, speed: 24 },
  6,
  7,
  'south',
);
assert.equal(repeatedConveyor.direction, 'south');
assert.deepEqual(
  { x: repeatedConveyor.x, y: repeatedConveyor.y, width: repeatedConveyor.width, height: repeatedConveyor.height },
  { x: 6, y: 7, width: 4, height: 2 },
);
const teleporters = app.conveyorCatalog.filter((entry) => entry.key.startsWith('teleporter::'));
assert.equal(teleporters.length, 4);
const conveyorWall = app.conveyorCatalog.find((entry) => entry.key === 'conveyor::wall');
assert.deepEqual(JSON.parse(JSON.stringify(conveyorWall.size)), { width: 1, length: 2 });
assert.equal(conveyorWall.wall, true);
assert.equal(conveyorWall.nonTransport, true);
assert.match(stylesSource, /\.plan-lane\.conveyor-wall/);
const placedWall = app.placementFromRecord(conveyorWall, 3, 4, 'east');
assert.deepEqual(
  JSON.parse(JSON.stringify({ width: placedWall.width, height: placedWall.height, wall: placedWall.wall, nonTransport: placedWall.nonTransport })),
  { width: 2, height: 1, wall: true, nonTransport: true },
);
assert.match(stylesSource, /red-teleporter-receiver[^}]+--receiver-surface/);
assert.match(stylesSource, /direction-east, \.direction-west[^}]+#fff/);
assert.match(appSource, /placement-ghost\$\{conveyorClass\} direction-\$\{candidate\.direction\}/);
assert.match(appSource, /furnace-processing-zone placement-ghost-zone/);
assert.match(appSource, /item-belt placement-ghost-belt/);
assert.match(stylesSource, /\.placement-ghost-belt/);
assert.match(stylesSource, /\.placement-ghost-zone/);
assert.deepEqual(
  JSON.parse(JSON.stringify(teleporters.map((entry) => [entry.name, entry.size.width, entry.size.length, entry.speed]))),
  [
    ['Red Teleporter Sender', 2, 2, null],
    ['Red Teleporter Receiver', 4, 2, 12],
    ['Blue Teleporter Sender', 2, 2, null],
    ['Blue Teleporter Receiver', 4, 2, 12],
  ],
);
assert.equal(app.completedStageForPlan({ valid: true }), 3);
assert.equal(app.completedStageForPlan({ valid: true, optimization: { complete: true } }), 4);
assert.equal(app.completedStageForPlan({ valid: true, optimization: { complete: true }, finalVerification: { complete: true } }), 5);

const coreSandbox = {};
vm.createContext(coreSandbox);
vm.runInContext(coreSource, coreSandbox);
const planner = coreSandbox.TycoonPlanner;
assert.ok(planner);
const spinnerCells = planner.portableUpgradeCells({ name: 'Portable Spinner', x: 5, y: 5, width: 2, height: 2, direction: 'north' });
assert.equal(spinnerCells.length, 12);
assert.deepEqual(
  JSON.parse(JSON.stringify(spinnerCells.map((cell) => `${cell.x},${cell.y}`).sort())),
  ['4,4', '4,5', '4,6', '4,7', '5,4', '5,7', '6,4', '6,7', '7,4', '7,5', '7,6', '7,7'],
);
assert.deepEqual(
  JSON.parse(JSON.stringify(planner.portableUpgradeCells({ name: "Dragon's Breath", x: 5, y: 5, width: 3, height: 3, direction: 'east', beamLength: 2 }))),
  [{ x: 8, y: 6 }, { x: 9, y: 6 }],
);
assert.deepEqual(
  JSON.parse(JSON.stringify(planner.portableUpgradeCells({ name: 'Derp Blaster', x: 5, y: 5, width: 2, height: 2, direction: 'north', beamLength: 2 }))),
  [{ x: 5, y: 4 }, { x: 5, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 3 }],
);

const manualSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: { records: [
    { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 10, dropSpeed: 1, oreSize: 1 },
    { key: 'azure scanner::base', name: 'Azure Scanner', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 2, mainStatType: 'Multiplicative', conveyorSpeed: 12 },
    { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 2 },
  ] },
  items: [
    { id: 'd1', order: 1, name: 'Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'u1', order: 2, name: 'Azure Scanner', variant: 'Base', type: 'upgrader', x: 5, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'f1', order: 3, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 7, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    { id: 'c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 3, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
  ],
});
assert.equal(manualSimulation.valid, true);
assert.equal(manualSimulation.routes[0].reachedFurnace, true);
assert.equal(manualSimulation.metrics.routeTimeSeconds, 1);
assert.equal(manualSimulation.metrics.projectedActiveOres, 1);
assert.equal(manualSimulation.metrics.expectedCashPerMinute, 2280);
assert.equal(manualSimulation.routes[0].stages[0].itemId, 'u1');
assert.equal(manualSimulation.routes[0].stages[0].beforeValue, 10);
assert.equal(manualSimulation.routes[0].stages[0].afterValue, 19);
assert.equal(manualSimulation.routes[0].stages[0].outcomeModel.kind, 'scanner');
assert.equal(manualSimulation.routes[0].stages[0].outcomeModel.outcomes.length, 2);
assert.equal(manualSimulation.metrics.destroyedOresPerMinute, 0);

const incrementalSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: { records: [
    { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 100, dropSpeed: 1, oreSize: 1 },
    { key: 'incremental upgrader::base', name: 'Incremental Upgrader', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: null, mainStatType: 'Multiplicative', conveyorSpeed: 12, limitedUses: '3' },
    { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 1 },
  ] },
  items: [
    { id: 'inc-d1', order: 1, name: 'Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } },
    ...[5, 7, 9].map((x, index) => ({ id: `inc-u${index + 1}`, order: index + 2, name: 'Incremental Upgrader', variant: 'Base', type: 'upgrader', x, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } })),
    { id: 'inc-f1', order: 5, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 11, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    { id: 'inc-c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 3, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
  ],
});
assert.equal(incrementalSimulation.valid, true);
assert.deepEqual(
  JSON.parse(JSON.stringify(incrementalSimulation.routes[0].stages.map((stage) => ({
    useNumber: stage.useNumber,
    useLimit: stage.useLimit,
    multiplier: stage.appliedMultiplier,
    before: stage.beforeValue,
    after: stage.afterValue,
  })))),
  [
    { useNumber: 1, useLimit: 3, multiplier: 1.1, before: 100, after: 110.00000000000001 },
    { useNumber: 2, useLimit: 3, multiplier: 1.25, before: 110.00000000000001, after: 137.50000000000003 },
    { useNumber: 3, useLimit: 3, multiplier: 1.75, before: 137.50000000000003, after: 240.62500000000006 },
  ],
);

const liveTrace = planner.traceManualDropper({
  dropperId: 'live-d1',
  plotSize: 20,
  database: { records: [
    { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 10, dropSpeed: 1, oreSize: 1 },
    { key: 'azure scanner::base', name: 'Azure Scanner', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 2, mainStatType: 'Multiplicative', conveyorSpeed: 12 },
  ] },
  items: [
    { id: 'live-d1', order: 1, name: 'Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'live-u1', order: 2, name: 'Azure Scanner', variant: 'Base', type: 'upgrader', x: 5, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, conveyorOffset: 0, direction: 'east', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    { id: 'live-c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 3, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
  ],
});
assert.equal(liveTrace.route.reachedFurnace, false);
assert.equal(liveTrace.route.routeStatus, 'incomplete');
assert.equal(liveTrace.route.stages.length, 1);
assert.equal(liveTrace.route.currentValue, 19);
assert.equal(liveTrace.route.stages[0].outcomeModel.kind, 'scanner');

const teleporterSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: { records: [
    { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 10, dropSpeed: 1, oreSize: 1 },
    { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 2 },
  ] },
  items: [
    { id: 'tele-d1', order: 1, name: 'Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'tele-f1', order: 2, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 12, y: 2, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    { id: 'red-send', name: 'Red Teleporter Sender', conveyor: 'Red Teleporter Sender', x: 3, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: null, teleporterColor: 'red', teleporterRole: 'sender' },
    { id: 'red-receive', name: 'Red Teleporter Receiver', conveyor: 'Red Teleporter Receiver', x: 8, y: 1, width: 2, height: 4, itemWidth: 4, itemLength: 2, direction: 'east', speed: 12, teleporterColor: 'red', teleporterRole: 'receiver' },
    { id: 'tele-c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 10, y: 2, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
  ],
});
assert.equal(teleporterSimulation.valid, true, JSON.stringify(teleporterSimulation.diagnostics));
assert.equal(teleporterSimulation.routes[0].reachedFurnace, true);
assert.equal(teleporterSimulation.routes[0].seconds, 1);
assert.deepEqual(
  JSON.parse(JSON.stringify(teleporterSimulation.routes[0].teleporterJumps)),
  [{ color: 'red', senderId: 'red-send', receiverId: 'red-receive' }],
);
app.setValidation({ ...teleporterSimulation, kind: 'manual-simulation' });
const teleporterTooltipHtml = app.categorizedManualSimulationHtml({ id: 'tele-d1', type: 'dropper' });
assert.match(teleporterTooltipHtml, /red sender.*receiver/i);
const receiverTooltipHtml = app.categorizedManualSimulationHtml({ id: 'red-receive', type: 'conveyor', teleporterColor: 'red', teleporterRole: 'receiver' });
assert.match(receiverTooltipHtml, /#1.*furnace/i);

const crimsonSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: { records: [
    { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 10, dropSpeed: 2, oreSize: 1 },
    { key: 'crimson pillars::base', name: 'Crimson Pillars', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 1.5, mainStatType: 'Multiplicative', conveyorSpeed: 12, limitedUses: '1' },
    { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 2 },
  ] },
  items: [
    { id: 'crimson-d1', order: 1, name: 'Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'crimson-u1', order: 2, name: 'Crimson Pillars', variant: 'Base', type: 'upgrader', x: 5, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'crimson-f1', order: 3, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 9, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    { id: 'crimson-c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 3, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
    { id: 'crimson-c2', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 7, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 3 },
  ],
});
assert.equal(crimsonSimulation.valid, true, JSON.stringify(crimsonSimulation.diagnostics));
assert.equal(crimsonSimulation.routes[0].valueBeforeFurnace, 10, 'Crimson must not apply its phantom multiplier immediately');
assert.equal(crimsonSimulation.routes[0].phantomZones.length, 1);
assert.equal(crimsonSimulation.routes[0].phantomZones[0].windowSeconds, 15);
assert.equal(crimsonSimulation.routes[0].phantomZones[0].minimumDelaySeconds, 1);
assert.equal(crimsonSimulation.routes[0].phantomZones[0].zoneLifetimeSeconds, 30);
assert.equal(crimsonSimulation.routes[0].phantomZones[0].dropIntervalSeconds, .5);
assert(Math.abs(crimsonSimulation.routes[0].phantomZones[0].spawnBeforeFurnaceProbability - 1 / 14) < 1e-12);
assert(Math.abs(crimsonSimulation.routes[0].phantomZones[0].expectedActiveZones - 30 / 7) < 1e-12);
assert.deepEqual(
  JSON.parse(JSON.stringify(crimsonSimulation.routes[0].phantomZones[0].candidates.map((candidate) => candidate.componentId))),
  ['crimson-c2'],
);
assert.match(appSource, /function renderPhantomZoneOverlays/);
assert.match(stylesSource, /\.phantom-zone-overlay/);
app.setValidation({ ...crimsonSimulation, kind: 'manual-simulation' });
const crimsonTooltipHtml = app.categorizedManualSimulationHtml({ id: 'crimson-u1', type: 'upgrader' });
assert.match(crimsonTooltipHtml, /Phantom-zone estimate/);
assert.match(crimsonTooltipHtml, /0\.500s/);
assert.match(crimsonTooltipHtml, /30 seconds/i);
assert.match(crimsonTooltipHtml, /Active zones/);

const constraintSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: { records: [
    { key: 'large test dropper::base', name: 'Large Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 10, dropSpeed: 1, oreSize: 1.84 },
    { key: 'limited test upgrader::base', name: 'Limited Test Upgrader', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 2, mainStatType: 'Multiplicative', conveyorSpeed: 12, limitedUses: '1', oreSizeRestriction: { acceptable: [1.83], rejected: [1.84] } },
    { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 2 },
  ] },
  items: [
    { id: 'large-d1', order: 1, name: 'Large Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'limited-u1', order: 2, name: 'Limited Test Upgrader', variant: 'Base', type: 'upgrader', x: 5, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'limited-u2', order: 3, name: 'Limited Test Upgrader', variant: 'Base', type: 'upgrader', x: 7, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'constraint-f1', order: 4, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 9, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    { id: 'constraint-c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 3, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
  ],
});
assert.equal(constraintSimulation.valid, false);
const useLimitDiagnostic = constraintSimulation.diagnostics.find((entry) => entry.code === 'USE_LIMIT');
assert.ok(useLimitDiagnostic);
assert.equal(useLimitDiagnostic.itemId, 'limited-u2');
assert.match(useLimitDiagnostic.message, /use 2, exceeding its limit of 1 use per ore/);
const oreSizeDiagnostics = constraintSimulation.diagnostics.filter((entry) => entry.code === 'ORE_SIZE');
assert.equal(oreSizeDiagnostics.length, 1);
assert.equal(oreSizeDiagnostics[0].itemId, 'limited-u1');
assert(oreSizeDiagnostics.every((entry) => /ore size 1\.840.*acceptable size 1\.83/.test(entry.message)));
assert.equal(planner.itemUseLimit({ limitedUses: 'Unlimited' }), Infinity);
assert.equal(planner.exceedsItemUseLimit({ name: 'Star Scanner', limitedUses: '1' }, 2), false);
assert.equal(planner.maximumAcceptedOreSize({ oreSizeRestriction: { acceptable: [2.01, 1.83] } }), 2.01);

const rngSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: { records: [
    { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 100, dropSpeed: 1, oreSize: 1 },
    { key: 'tiki evaluator::base', name: 'Tiki Evaluator', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 3, mainStatType: 'Multiplicative', conveyorSpeed: 12 },
    { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 2 },
  ] },
  items: [
    { id: 'd1', order: 1, name: 'Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 3, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'u1', order: 2, name: 'Tiki Evaluator', variant: 'Base', type: 'upgrader', x: 5, y: 1, width: 4, height: 5, itemWidth: 5, itemLength: 4, conveyorWidth: 2, conveyorOffset: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'f1', order: 3, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 9, y: 3, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    { id: 'c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 3, y: 3, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
  ],
});
assert.equal(rngSimulation.valid, true);
assert.equal(rngSimulation.routes[0].stages[0].outcomeModel.kind, 'tiki-phase');
assert.equal(rngSimulation.routes[0].stages[0].afterValue, 15200);
assert(Math.abs(rngSimulation.routes[0].stages[0].destructionChance - 1 / 3) < 1e-12);
assert(Math.abs(rngSimulation.metrics.destroyedOresPerMinute - 20) < 1e-12);
assert.equal(rngSimulation.metrics.survivalToFurnace, 2 / 3);

const effectDatabase = { records: [
  { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 100, dropSpeed: 1, oreSize: 1 },
  { key: 'acid plant::base', name: 'Acid Plant', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 2, mainStatType: 'Multiplicative', conveyorSpeed: 12 },
  { key: 'ore wash::base', name: 'Ore Wash', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 1, mainStatType: 'Multiplicative', conveyorSpeed: 12 },
  { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 2 },
] };
const effectDropper = { id: 'd1', order: 1, name: 'Test Dropper', variant: 'Base', type: 'dropper', x: 1, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', stats: { Variant: 'Base' } };
const effectSource = { id: 'acid1', order: 2, name: 'Acid Plant', variant: 'Base', type: 'upgrader', x: 5, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } };
const effectEntryConveyor = { id: 'c1', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 3, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 };
const safeEffectSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: effectDatabase,
  items: [
    effectDropper,
    effectSource,
    { id: 'wash1', order: 3, name: 'Ore Wash', variant: 'Base', type: 'upgrader', x: 7, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'f1', order: 4, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 9, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [effectEntryConveyor],
});
const safeToxic = safeEffectSimulation.routes[0].stages.find((stage) => stage.itemId === 'acid1').effectSafety[0];
assert.equal(safeEffectSimulation.valid, true);
assert.equal(safeToxic.effect, 'Toxic');
assert.equal(safeToxic.removedBy, 'Ore Wash');
assert.equal(safeToxic.safe, true);
assert(safeToxic.exposureSeconds < safeToxic.timerSeconds);

const unsafeEffectSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: effectDatabase,
  items: [
    effectDropper,
    effectSource,
    { id: 'f1', order: 3, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 9, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    effectEntryConveyor,
    { id: 'c2', name: 'Slow Conveyor', conveyor: 'Normal Conveyor', x: 7, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 1 },
  ],
});
const unsafeToxic = unsafeEffectSimulation.routes[0].stages.find((stage) => stage.itemId === 'acid1').effectSafety[0];
assert.equal(unsafeEffectSimulation.valid, false);
assert.equal(unsafeToxic.removedBy, 'Furnace');
assert.equal(unsafeToxic.safe, false);
assert.equal(unsafeToxic.exposureSeconds, 6);
assert.equal(unsafeEffectSimulation.routes[0].survival, 0);
assert.equal(unsafeEffectSimulation.metrics.destroyedOresPerMinute, 60);
assert(unsafeEffectSimulation.diagnostics.some((entry) => entry.code === 'EFFECT_TIMER'));
app.setValidation({ ...safeEffectSimulation, kind: 'manual-simulation' });
const safeEffectHtml = app.categorizedManualSimulationHtml({ id: 'acid1', type: 'upgrader' });
assert.match(safeEffectHtml, /Effect & safety/);
assert.match(safeEffectHtml, /Ore Wash/);
assert.match(safeEffectHtml, />Safe</);
assert.doesNotMatch(safeEffectHtml, /Destroyed when timer ends/);
app.setValidation({ ...unsafeEffectSimulation, kind: 'manual-simulation' });
const unsafeEffectHtml = app.categorizedManualSimulationHtml({ id: 'acid1', type: 'upgrader' });
assert.match(unsafeEffectHtml, /Effect & safety/);
assert.match(unsafeEffectHtml, /Furnace/);
assert.match(unsafeEffectHtml, />Destroyed</);
assert.match(unsafeEffectHtml, /Destroyed when timer ends/);
const colliderSimulation = planner.simulateManualBase({
  plotSize: 14,
  oreCap: 100,
  database: { records: [
    { key: 'test dropper::base', name: 'Test Dropper', variant: 'Base', type: 'dropper', sheet: 'Droppers', mainStat: 100, dropSpeed: 1, oreSize: 1 },
    { key: 'chartreuse collider::base', name: 'Chartreuse Collider', variant: 'Base', type: 'upgrader', sheet: 'Upgraders', mainStat: 1.6, mainStatType: 'Multiplicative', conveyorSpeed: 12 },
    { key: 'test furnace::base', name: 'Test Furnace', variant: 'Base', type: 'furnace', sheet: 'Furnaces', mainStat: 2 },
  ] },
  items: [
    effectDropper,
    { id: 'collider1', order: 2, name: 'Chartreuse Collider', variant: 'Base', type: 'upgrader', x: 5, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'collider2', order: 3, name: 'Chartreuse Collider', variant: 'Base', type: 'upgrader', x: 9, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, conveyorWidth: 2, direction: 'east', stats: { Variant: 'Base' } },
    { id: 'f1', order: 4, name: 'Test Furnace', variant: 'Base', type: 'furnace', x: 13, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', processingZoneAcross: 2, processingZoneDepth: 2, processingZonePlacement: 'front-center', stats: { Variant: 'Base' } },
  ],
  conveyors: [
    effectEntryConveyor,
    { id: 'c2', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 7, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
    { id: 'c3', name: 'Normal Conveyor', conveyor: 'Normal Conveyor', x: 11, y: 1, width: 2, height: 2, itemWidth: 2, itemLength: 2, direction: 'east', speed: 12 },
  ],
});
assert.equal(colliderSimulation.valid, true);
assert.equal(colliderSimulation.routes[0].effectSafety.length, 2);
assert.equal(colliderSimulation.routes[0].effectSafety[0].removedBy, 'Chartreuse Collider');
assert.equal(colliderSimulation.routes[0].effectSafety[1].removedBy, 'Furnace');
assert(colliderSimulation.routes[0].effectSafety.every((effect) => effect.safe));
const fastTurnBefore = { direction: 'east', path: { x: 1, y: 2, width: 2, height: 2 } };
const fastTurnAfter = { direction: 'south', path: { x: 3, y: 2, width: 1, height: 1 } };
assert.equal(planner.isFastTurnBlocked(fastTurnBefore, fastTurnAfter, []), false);
assert.equal(planner.isFastTurnBlocked(fastTurnBefore, fastTurnAfter, [{ x: 4, y: 2, width: 1, height: 2 }]), true);
assert.equal(planner.isFastTurnBlocked(fastTurnBefore, fastTurnAfter, [{ x: 4, y: 1, width: 2, height: 2 }]), true);

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

const gumball = planner.createItem(
  { name: 'Gumball Enhancer', variant: 'Base', type: 'upgrader', size: { width: 5, length: 3 } },
  { x: 10, y: 10, direction: 'north' },
);
assert.equal(gumball.conveyorWidth, 2);
assert.equal(gumball.conveyorOffset, 1);
assert.deepEqual(JSON.parse(JSON.stringify(gumball.internalTransport)), { x: 11, y: 10, width: 2, height: 3 });
const tiki = planner.createItem(
  { name: 'Tiki Evaluator', variant: 'Base', type: 'upgrader', size: { width: 5, length: 4 } },
  { x: 10, y: 10, direction: 'north' },
);
assert.equal(tiki.conveyorWidth, 2);
assert.equal(tiki.conveyorOffset, 2);
assert.deepEqual(JSON.parse(JSON.stringify(tiki.internalTransport)), { x: 12, y: 10, width: 2, height: 4 });

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
