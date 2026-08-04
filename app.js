const grid = document.querySelector('#game-grid');
const columnLabels = document.querySelector('#column-labels');
const rowLabels = document.querySelector('#row-labels');
const sizeSlider = document.querySelector('#base-size');
const sizeLabel = document.querySelector('#size-label');
const sizeOut = document.querySelector('#size-out');
const sizeIn = document.querySelector('#size-in');
const zoomSlider = document.querySelector('#grid-zoom');
const zoomLabel = document.querySelector('#zoom-label');
const zoomOut = document.querySelector('#zoom-out');
const zoomIn = document.querySelector('#zoom-in');
const tileCount = document.querySelector('#tile-count');
const status = document.querySelector('#status');
const stagePreviewSummary = document.querySelector('#stage-preview-summary');
const legend = document.querySelector('#plan-legend');
const workflowSteps = document.querySelector('#workflow-steps');
const coordinateSummary = document.querySelector('#coordinate-summary');
const validationSummary = document.querySelector('#validation-summary');
const itemTooltip = document.querySelector('#item-tooltip');
const itemEditor = document.querySelector('#item-editor');
const itemEditorTitle = document.querySelector('#item-editor-title');
const itemEditorDetails = document.querySelector('#item-editor-details');
const itemEditorError = document.querySelector('#item-editor-error');
const massSelectionDialog = document.querySelector('#mass-selection-dialog');
const massSelectionTitle = document.querySelector('#mass-selection-title');
const massSelectionDetails = document.querySelector('#mass-selection-details');
const massSelectionError = document.querySelector('#mass-selection-error');
const moveCoordinate = document.querySelector('#move-coordinate');
const itemSearch = document.querySelector('#item-search');
const libraryTabs = document.querySelector('#library-tabs');
const itemLibrary = document.querySelector('#item-library');
const libraryCount = document.querySelector('#library-count');
const libraryFilterToggle = document.querySelector('#library-filter-toggle');
const libraryFilterPanel = document.querySelector('#library-filter-panel');
const librarySort = document.querySelector('#library-sort');
const libraryTierFilter = document.querySelector('#library-tier-filter');
const libraryVariantFilter = document.querySelector('#library-variant-filter');
const libraryFilterReset = document.querySelector('#library-filter-reset');
const buildModeHint = document.querySelector('#build-mode-hint');
const plannerModeToggle = document.querySelector('#planner-mode-toggle');
const simulateBaseButton = document.querySelector('#simulate-base');
const saveBaseButton = document.querySelector('#save-base');
const loadBasesButton = document.querySelector('#load-bases');
const clearWorkspaceButton = document.querySelector('#clear-workspace');
const keybindGuide = document.querySelector('#keybind-guide');
const saveBaseDialog = document.querySelector('#save-base-dialog');
const saveBaseForm = document.querySelector('#save-base-form');
const savedBaseName = document.querySelector('#saved-base-name');
const saveBaseMetadata = document.querySelector('#save-base-metadata');
const saveBaseStatus = document.querySelector('#save-base-status');
const loadBaseDialog = document.querySelector('#load-base-dialog');
const savedBaseList = document.querySelector('#saved-base-list');
const savedBaseDetails = document.querySelector('#saved-base-details');
const savedBasePreview = document.querySelector('#saved-base-preview');
const loadBaseStatus = document.querySelector('#load-base-status');
const savedLoadoutFolderInput = document.querySelector('#saved-loadout-folder-input');
const savedLoadoutFileInput = document.querySelector('#saved-loadout-file-input');
const confirmLoadBaseDialog = document.querySelector('#confirm-load-base-dialog');
const liveOreTracker = document.querySelector('#live-ore-tracker');
const liveDropperSelect = document.querySelector('#live-dropper-select');
const liveOreContent = document.querySelector('#live-ore-content');

const workflow = [
  '1. Legal item list',
  '2. Coordinate map',
  '3. Route validation',
  '4. Optimization and grid preview',
  '5. Final verification',
];
let workflowStage = 0;
let workflowProgress = null;
const planningPreview = globalThis.TycoonCoordinateMapPreview ?? null;
const optimizationBaseline = globalThis.TycoonOptimizationBaseline ?? null;
const optimizationProgress = globalThis.TycoonOptimizationProgress ?? null;
const baseTileSize = 24;
const workspaceStorageKey = 'tycoon-sim-2:benchmark-workspace:v1';
const plannerModeStorageKey = 'tycoon-sim-2:planner-mode:v1';
const generationBaselineStorageKey = 'tycoon-sim-2:generation-baseline:v1';
const viewPreferencesStorageKey = 'tycoon-sim-2:view-preferences:v1';
const savedLoadoutsStorageKey = 'tycoon-sim-2:saved-loadouts:v1';
const loadoutFileType = 'tycoon-sim-2-loadout';
const crateProgression = ['Basic', 'Advanced', 'Factory', 'Quarry', 'Futuristic', 'Toxic',
  'Desert', 'Fantasy', 'Space', 'Candy', 'Periastron', 'Ancient', 'Alien', 'Tropical', 'Ocean', 'Trinket', 'Toy'];
const portableItemPattern = /Portable Upgrader|Portable Spinner|Ore Glazer|Derp Blaster|Dragon/i;
const conveyorCatalog = [
  { key: 'conveyor::quarter', name: 'Quarter Conveyor', type: 'conveyor', size: { width: 1, length: 1 }, speed: 12 },
  { key: 'conveyor::half', name: 'Half Conveyor', type: 'conveyor', size: { width: 2, length: 1 }, speed: 12 },
  { key: 'conveyor::normal', name: 'Normal Conveyor', type: 'conveyor', size: { width: 2, length: 2 }, speed: 12 },
  { key: 'conveyor::supercharged', name: 'Supercharged Conveyor', type: 'conveyor', size: { width: 2, length: 2 }, speed: 18 },
  { key: 'conveyor::centering', name: 'Centering Conveyor', type: 'conveyor', size: { width: 2, length: 2 }, speed: 12 },
  { key: 'conveyor::ultracharged', name: 'Ultracharged Conveyor', type: 'conveyor', size: { width: 4, length: 2 }, speed: 24 },
  { key: 'conveyor::wall', name: 'Conveyor Wall', type: 'conveyor', size: { width: 1, length: 2 }, speed: null, description: '1x2 barrier for keeping fast ore on safe turns', wall: true, nonTransport: true },
  { key: 'teleporter::red-sender', name: 'Red Teleporter Sender', type: 'conveyor', size: { width: 2, length: 2 }, speed: null, description: 'Teleporter sender · Rebirth 5', teleporterColor: 'red', teleporterRole: 'sender' },
  { key: 'teleporter::red-receiver', name: 'Red Teleporter Receiver', type: 'conveyor', size: { width: 4, length: 2 }, speed: 12, description: 'Teleporter receiver · Speed 12 · Rebirth 5', teleporterColor: 'red', teleporterRole: 'receiver' },
  { key: 'teleporter::blue-sender', name: 'Blue Teleporter Sender', type: 'conveyor', size: { width: 2, length: 2 }, speed: null, description: 'Teleporter sender · Rebirth 5', teleporterColor: 'blue', teleporterRole: 'sender' },
  { key: 'teleporter::blue-receiver', name: 'Blue Teleporter Receiver', type: 'conveyor', size: { width: 4, length: 2 }, speed: 12, description: 'Teleporter receiver · Speed 12 · Rebirth 5', teleporterColor: 'blue', teleporterRole: 'receiver' },
];
let libraryCategory = 'dropper';
let restoreLibrarySearchFocus = false;
let buildInteraction = null;
let placementGhost = null;
let massPlacementDrag = null;
let suppressGridClick = false;
let boxSelectionDrag = null;
let massMoveInteraction = null;
const massSelectedIds = new Set();
let plannerMode = 'build';
let tooltipHideTimer = null;
let selectedSavedBaseId = null;
let pendingLoadBaseId = null;
let savedLoadoutDirectoryHandle = null;
let pendingSaveSnapshot = null;
let selectedLiveDropperId = null;
const libraryTierOrder = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Secret', 'Unknown'];
const libraryVariantOrder = ['Base', 'Shiny', 'Mythic', 'Shiny Mythic', 'Standard'];

function loadWorkflowProgress(progress) {
  if (!progress || typeof progress !== 'object') return false;
  const savedStage = Number(progress.completedStage ?? progress.stage);
  if (!Number.isFinite(savedStage)) return false;
  workflowStage = Math.max(0, Math.min(workflow.length, Math.trunc(savedStage)));
  workflowProgress = progress;
  const previewSize = planningPreview?.map?.plotSize ?? planningPreview?.profile?.plotSize;
  if (previewSize >= Number(sizeSlider.min) && previewSize <= Number(sizeSlider.max)) sizeSlider.value = previewSize;
  return true;
}

function applyGridZoom(value) {
  const zoom = Math.min(Number(zoomSlider.max), Math.max(Number(zoomSlider.min), Number(value)));
  zoomSlider.value = zoom;
  zoomLabel.textContent = `${zoom}%`;
  document.documentElement.style.setProperty('--tile', `${baseTileSize * zoom / 100}px`);
  document.documentElement.style.setProperty('--grid-zoom', String(zoom / 100));
  saveViewPreferences();
}

function applyBaseSize(value) {
  const size = Math.min(Number(sizeSlider.max), Math.max(Number(sizeSlider.min), Math.round(Number(value))));
  sizeSlider.value = size;
  if (plannerMode === 'build' && validation?.kind === 'manual-simulation') {
    validation = null;
    workflowStage = Math.min(workflowStage, 2);
    renderWorkflow();
  }
  renderGrid(size);
  saveWorkspace();
  saveViewPreferences();
}

// Coordinates are 1-based to match the labels shown to the player.
// Database sizes are WIDTH x LENGTH. Internal conveyors use the default
// centered width unless an item-specific mechanical override is documented.
// East/west placements therefore use LENGTH on the grid's X axis, while
// north/south placements use LENGTH on the grid's Y axis.
const internalTransportOverrides = {
  'Gumball Enhancer': { across: 2, northOffset: 1 },
  'Tiki Evaluator': { across: 2, northOffset: 2 },
};

function internalTransportProfile(name, itemWidth, type) {
  if (['dropper', 'portable', 'furnace'].includes(type)) return null;
  const override = internalTransportOverrides[name];
  const across = override?.across ?? (itemWidth % 2 === 0 ? 2 : 1);
  return { across, northOffset: override?.northOffset ?? ((itemWidth - across) / 2) };
}

function placeItem(order, name, x, y, itemWidth, itemLength, direction, type = null, details = {}) {
  const horizontal = direction === 'east' || direction === 'west';
  const resolvedType = itemType(name, type);
  const dropper = resolvedType === 'dropper';
  const portable = resolvedType === 'portable';
  const furnace = resolvedType === 'furnace';
  const transport = internalTransportProfile(name, itemWidth, resolvedType);
  return {
    id: details.id ?? `item-${order}`,
    order,
    name,
    label: details.label ?? shortLabel(name),
    description: details.description ?? 'No description loaded for this item.',
    stats: details.stats ?? {},
    x,
    y,
    itemWidth,
    itemLength,
    conveyorWidth: transport?.across ?? 0,
    conveyorOffset: transport?.northOffset ?? 0,
    width: portable
      ? (horizontal ? itemWidth : itemLength)
      : (horizontal ? itemLength : itemWidth),
    height: portable
      ? (horizontal ? itemLength : itemWidth)
      : (horizontal ? itemWidth : itemLength),
    beamLength: portable ? (details.beamLength ?? 2) : 0,
    processingZoneAcross: furnace ? 2 : 0,
    processingZoneDepth: furnace ? (name.includes('Krakatoa') ? 1 : 2) : 0,
    processingZonePlacement: furnace && /Proficient Furnace|Toxic Wasteland/.test(name)
      ? 'front-corner'
      : (furnace ? 'front-center' : null),
    sourceDroppers: details.sourceDroppers ?? null,
    direction,
    type: resolvedType,
  };
}

const coordinateMap = [];
const routeSegments = [];
let plannedOrder = 1;
let capOreValue = 0;
let validation = null;

function abbreviatedRate(value) {
  const units = [[1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'],
    [1e18, 'Qn'], [1e15, 'Qd'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const [divisor, suffix] = units.find(([minimum]) => value >= minimum) ?? [1, ''];
  const truncated = Math.floor((value / divisor) * 100) / 100;
  return `$${truncated.toFixed(2)}${suffix}/min`;
}

function abbreviatedPerSecond(value) {
  return abbreviatedRate(value).replace('/min', '/sec');
}
function itemType(name, declaredType = null) {
  if (declaredType) return declaredType;
  if (name.includes('Dropper')) return 'dropper';
  if (name.includes('Furnace')) return 'furnace';
  return 'upgrader';
}

function databaseRenderType(record) {
  if (record.type !== 'upgrader') return record.type;
  if (portableItemPattern.test(record.name)) return 'portable';
  if (record.sourceSheets?.some((source) => source.sheet === 'Capgrader')) return 'capgrader';
  return 'upgrader';
}

function displayVariant(record) {
  return record.variant && !/^base$/i.test(record.variant) ? record.variant : 'Base';
}

function uniqueDatabaseRecords(records) {
  const primarySheets = { Droppers: 0, Upgraders: 0, Furnaces: 0, Capgrader: 1 };
  const byKey = new Map();
  for (const record of records) {
    const existing = byKey.get(record.key);
    const priority = primarySheets[record.sheet] ?? 2;
    const existingPriority = existing ? (primarySheets[existing.sheet] ?? 2) : Infinity;
    if (!existing || priority < existingPriority) byKey.set(record.key, record);
  }
  return [...byKey.values()];
}

function libraryRecords(category = libraryCategory) {
  if (category === 'conveyor') return conveyorCatalog;
  return uniqueDatabaseRecords((globalThis.TycoonDatabase?.records ?? []).filter((record) => (
    record.type === category && record.size?.width > 0 && record.size?.length > 0
  )));
}

function libraryTier(record) {
  if (record.type === 'conveyor') return record.tier ?? 'Standard';
  const tier = String(record.rarity ?? 'Unknown').trim();
  return libraryTierOrder.find((candidate) => candidate.toLowerCase() === tier.toLowerCase()) ?? tier;
}

function libraryVariant(record) {
  return record.type === 'conveyor' ? 'Standard' : displayVariant(record);
}

function compareLibraryRecords(left, right, sortMode = 'tier-name') {
  const nameComparison = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  const variantIndex = (record) => {
    const index = libraryVariantOrder.indexOf(libraryVariant(record));
    return index < 0 ? libraryVariantOrder.length : index;
  };
  const variantComparison = variantIndex(left) - variantIndex(right);
  if (sortMode === 'name-asc') return nameComparison || variantComparison;
  if (sortMode === 'name-desc') return -nameComparison || variantComparison;
  const leftTier = libraryTierOrder.indexOf(libraryTier(left));
  const rightTier = libraryTierOrder.indexOf(libraryTier(right));
  const safeLeftTier = leftTier < 0 ? libraryTierOrder.length : leftTier;
  const safeRightTier = rightTier < 0 ? libraryTierOrder.length : rightTier;
  const tierComparison = safeLeftTier - safeRightTier;
  if (sortMode === 'tier-desc') {
    const leftUnknown = libraryTier(left) === 'Unknown' || leftTier < 0;
    const rightUnknown = libraryTier(right) === 'Unknown' || rightTier < 0;
    if (leftUnknown !== rightUnknown) return leftUnknown ? 1 : -1;
    return -tierComparison || nameComparison || variantComparison;
  }
  return tierComparison || nameComparison || variantComparison;
}

function filteredAndSortedLibraryRecords(records, options = {}) {
  const query = String(options.query ?? '').trim().toLowerCase();
  const tier = options.tier ?? 'all';
  const variant = options.variant ?? 'all';
  return records.filter((record) => (
    (!query || `${record.name} ${libraryVariant(record)} ${libraryTier(record)}`.toLowerCase().includes(query))
    && (tier === 'all' || libraryTier(record) === tier)
    && (variant === 'all' || libraryVariant(record) === variant)
  )).sort((left, right) => compareLibraryRecords(left, right, options.sortMode));
}

function updateLibraryFilterButton() {
  const activeFilters = Number(libraryTierFilter.value !== 'all') + Number(libraryVariantFilter.value !== 'all');
  libraryFilterToggle.textContent = activeFilters ? `Filter & sort (${activeFilters})` : 'Filter & sort';
  libraryFilterToggle.classList.toggle('has-active-filters', activeFilters > 0);
}

function renderItemLibrary() {
  const records = filteredAndSortedLibraryRecords(libraryRecords(), {
    query: itemSearch.value,
    tier: libraryTierFilter.value,
    variant: libraryVariantFilter.value,
    sortMode: librarySort.value,
  });
  updateLibraryFilterButton();
  libraryCount.textContent = `${records.length} item${records.length === 1 ? '' : 's'}`;
  itemLibrary.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('p');
    empty.className = 'library-empty';
    empty.textContent = 'No database items match this search.';
    itemLibrary.append(empty);
    return;
  }
  records.forEach((record) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `library-item${buildInteraction?.record?.key === record.key ? ' is-selected' : ''}`;
    button.dataset.itemKey = record.key;
    button.setAttribute('role', 'listitem');
    const name = document.createElement('strong');
    name.textContent = record.name;
    const meta = document.createElement('small');
    meta.textContent = record.type === 'conveyor'
      ? (record.description ?? `Speed ${record.speed}`)
      : `${displayVariant(record)} · ${record.rarity ?? 'Unknown rarity'}`;
    const size = document.createElement('span');
    size.className = 'library-size';
    size.textContent = `${record.size.width}x${record.size.length}`;
    button.append(name, meta, size);
    button.addEventListener('click', () => startPlacingRecord(record));
    itemLibrary.append(button);
  });
}

function shortLabel(name) {
  return name
    .replace('Shiny Mythic ', '')
    .replace('Shiny ', '')
    .replace(' Upgrader', '')
    .replace(' Fortress', '')
    .replace(' Remains', '')
    .replace(' Furnace', '')
    .toUpperCase();
}

function baseItemName(name) {
  return name.replace(/^(?:Shiny Mythic|Mythic|Shiny|Base)\s+/i, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatStats(stats) {
  if (typeof stats === 'string') return stats;
  const entries = Object.entries(stats ?? {})
    .filter(([label]) => !/^(Effects|Description)$/i.test(label));
  if (entries.length === 0) return 'No stats loaded.';
  return entries.map(([label, value]) => `${label}: ${value}`).join(' · ');
}

function statRowsHtml(entries) {
  return entries.map(([label, value]) => {
    const valueHtml = label === 'Arrival time from droppers'
      ? `<span class="timing-arrivals">${String(value)
        .split(' · ')
        .map((arrival) => `<span>${escapeHtml(arrival)}</span>`)
        .join('')}</span>`
      : escapeHtml(value);
    return `
    <div class="item-stat-row">
      <span class="item-stat-label">${escapeHtml(label)}</span>
      <span class="item-stat-value">${valueHtml}</span>
    </div>`;
  }).join('');
}

function statsSectionsHtml(stats) {
  if (typeof stats === 'string') {
    return `<section class="item-stat-section"><h3>Item stats</h3><p>${escapeHtml(stats)}</p></section>`;
  }

  const entries = Object.entries(stats ?? {})
    .filter(([label]) => !/^(Effects|Description)$/i.test(label));
  if (entries.length === 0) {
    return '<section class="item-stat-section"><h3>Item stats</h3><p>No stats loaded.</p></section>';
  }

  const isOreTracking = ([label]) => /^Ore (value|size) (before|after)$/i.test(label);
  const isTiming = ([label]) => /^(Arrival time|Time across)/i.test(label);
  const isEffectTracking = ([label]) => /^(Effect|Effect behavior|Possible effect|Next remover|Route to safety|Destruction timer|Safety margin)$/i.test(label);
  const isLambdaValueTracking = ([label]) => /^(Expected ore value before Lambda|Good outcome)/i.test(label);
  const isDestructionTracking = ([label]) => /^(Intrinsic survival|Survival including|Destruction at|(?:.+ )?Total ore destruction)/i.test(label);
  const oreTracking = entries.filter(isOreTracking);
  const timing = entries.filter(isTiming);
  const effectTracking = entries.filter(isEffectTracking);
  const lambdaValueTracking = entries.filter(isLambdaValueTracking);
  const destructionTracking = entries.filter(isDestructionTracking);
  const itemStats = entries.filter((entry) => !isOreTracking(entry)
    && !isTiming(entry)
    && !isEffectTracking(entry)
    && !isLambdaValueTracking(entry)
    && !isDestructionTracking(entry));
  return `
    ${oreTracking.length > 0 ? `
      <section class="item-stat-section ore-tracking">
        <h3>Ore tracking</h3>
        <div class="item-stat-grid">${statRowsHtml(oreTracking)}</div>
      </section>` : ''}
    ${timing.length > 0 ? `
      <section class="item-stat-section timing-tracking">
        <h3>Route timing</h3>
        <div class="item-stat-grid">${statRowsHtml(timing)}</div>
      </section>` : ''}
    ${destructionTracking.length > 0 ? `
      <section class="item-stat-section destruction-tracking">
        <h3>Ore destruction</h3>
        <div class="item-stat-grid">${statRowsHtml(destructionTracking)}</div>
      </section>` : ''}
    ${lambdaValueTracking.length > 0 ? `
      <section class="item-stat-section lambda-value-tracking">
        <h3>Lambda value outcomes</h3>
        <div class="item-stat-grid">${statRowsHtml(lambdaValueTracking)}</div>
      </section>` : ''}
    ${effectTracking.length > 0 ? `
      <section class="item-stat-section effect-tracking">
        <h3>Effect & safety</h3>
        <div class="item-stat-grid">${statRowsHtml(effectTracking)}</div>
      </section>` : ''}
    ${itemStats.length > 0 ? `
      <section class="item-stat-section">
        <h3>Item stats</h3>
        <div class="item-stat-grid">${statRowsHtml(itemStats)}</div>
      </section>` : ''}`;
}

function simulationMoney(value) {
  return abbreviatedRate(Number(value ?? 0)).replace('/min', '');
}

function liveTrackerDroppers() {
  const droppers = (activePlan?.items ?? [])
    .filter((item) => item.type === 'dropper')
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  const used = new Set();
  let nextNumber = Math.max(0, ...droppers.map((dropper) => Number(dropper.liveDropperNumber) || 0)) + 1;
  droppers.forEach((dropper) => {
    const current = Number(dropper.liveDropperNumber);
    if (Number.isInteger(current) && current > 0 && !used.has(current)) {
      used.add(current);
      return;
    }
    while (used.has(nextNumber)) nextNumber += 1;
    dropper.liveDropperNumber = nextNumber;
    used.add(nextNumber);
    nextNumber += 1;
  });
  return droppers;
}

function reconcileLiveDropperSelection({ persist = false } = {}) {
  const droppers = liveTrackerDroppers();
  const selectedExists = droppers.some((dropper) => dropper.id === selectedLiveDropperId);
  const nextId = selectedExists ? selectedLiveDropperId : (droppers[0]?.id ?? null);
  const changed = nextId !== selectedLiveDropperId;
  selectedLiveDropperId = nextId;
  if (changed && persist) saveWorkspace();
  return droppers;
}

function liveRangePresentation(stage) {
  if (!stage.range) return { className: '', text: '' };
  const input = Number(stage.beforeValue);
  if (input < stage.range.minimum) {
    return { className: 'is-error', text: `Below range ${simulationMoney(stage.range.minimum)}–${simulationMoney(stage.range.maximum)}` };
  }
  if (input > stage.range.maximum) {
    return { className: 'is-error', text: `Above range ${simulationMoney(stage.range.minimum)}–${simulationMoney(stage.range.maximum)}` };
  }
  const usefulRatio = stage.range.maximum > 0 ? input / stage.range.maximum : 1;
  return usefulRatio < .8
    ? { className: 'is-warning', text: `Valid · ${(usefulRatio * 100).toFixed(1)}% of maximum input` }
    : { className: 'is-valid', text: `Valid · ${(usefulRatio * 100).toFixed(1)}% of maximum input` };
}

function liveRouteStatus(route) {
  if (!route) return { className: 'is-error', text: 'The selected dropper is not connected to a route yet.' };
  if (route.routeStatus === 'furnace') return { className: 'is-complete', text: 'Route reaches the furnace.' };
  if (route.routeStatus === 'ambiguous') return { className: 'is-error', text: 'The connected route branches. Showing the longest reachable branch.' };
  if (route.routeStatus === 'disconnected') return { className: 'is-error', text: 'No conveyor or upgrader is connected to this dropper output.' };
  const last = route.stages?.at(-1)?.item;
  return { className: '', text: `Route is unfinished${last ? ` after ${last}` : ''}. Values are calculated through the last connected component.` };
}

function shouldShowLiveOreTracker(mode, currentValidation) {
  return mode === 'build' && currentValidation?.kind !== 'manual-simulation';
}

function liveStageHtml(stage, routeDiagnostics) {
  const range = liveRangePresentation(stage);
  const diagnostic = routeDiagnostics.find((entry) => entry.itemId === stage.itemId
    && ['CAP_RANGE', 'USE_LIMIT', 'ORE_SIZE', 'EFFECT_TIMER'].includes(entry.code));
  const rowClass = diagnostic ? 'is-error' : range.className;
  const outcomes = stage.outcomeModel?.outcomes ?? [];
  const outcomesHtml = outcomes.length ? `<div class="live-outcomes"><strong>Expected-value outcomes</strong><br>${outcomes.map((outcome) => (
    `${escapeHtml(outcome.label)} ${(Number(outcome.probability) * 100).toFixed(1)}%${outcome.destroyed ? ' · destroyed' : ''}`
  )).join('<br>')}</div>` : '';
  const details = [
    stage.appliedMultiplier != null ? `Use ${stage.useNumber} of ${stage.useLimit} · ${Number(stage.appliedMultiplier).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}× multiplier` : '',
    range.text,
    stage.beforeOreSize !== stage.afterOreSize ? `Ore size ${stage.beforeOreSize.toFixed(3)} → ${stage.afterOreSize.toFixed(3)}` : '',
    stage.survivalAfter < 1 ? `Cumulative survival ${(stage.survivalAfter * 100).toFixed(2)}%` : '',
    (stage.effectsAfter ?? []).length ? `Effects: ${stage.effectsAfter.join(', ')}` : '',
  ].filter(Boolean).join(' · ');
  return `<article class="live-chain-row ${rowClass}">
    <div class="live-chain-title"><span>${stage.itemOrder ?? '–'}. ${escapeHtml(stage.item)}</span><span>${stage.outcomeModel ? 'Expected' : 'Exact'}</span></div>
    <div class="live-chain-values"><span>${simulationMoney(stage.beforeValue)}</span><span>→</span><strong>${simulationMoney(stage.afterValue)}</strong></div>
    ${details ? `<p class="live-chain-note">${escapeHtml(details)}</p>` : ''}
    ${diagnostic ? `<p class="live-chain-note is-error">${escapeHtml(abbreviateDiagnosticMoney(diagnostic.message))}</p>` : ''}
    ${outcomesHtml}
  </article>`;
}

function renderLiveOreTracker() {
  if (!liveOreTracker || !liveDropperSelect || !liveOreContent) return;
  const visible = shouldShowLiveOreTracker(plannerMode, validation);
  liveOreTracker.hidden = !visible;
  if (!visible) return;
  const droppers = reconcileLiveDropperSelection({ persist: true });
  liveDropperSelect.replaceChildren();
  if (!droppers.length) {
    liveDropperSelect.disabled = true;
    const option = document.createElement('option');
    option.textContent = 'No droppers placed';
    liveDropperSelect.append(option);
    liveOreContent.innerHTML = '<p class="live-empty">Place a dropper to begin tracking its ore value while you build.</p>';
    return;
  }
  liveDropperSelect.disabled = false;
  droppers.forEach((dropper) => {
    const option = document.createElement('option');
    option.value = dropper.id;
    option.textContent = `${dropper.name} #${dropper.liveDropperNumber} — ${columnName(dropper.x)}${dropper.y}`;
    option.selected = dropper.id === selectedLiveDropperId;
    liveDropperSelect.append(option);
  });
  const selected = droppers.find((dropper) => dropper.id === selectedLiveDropperId);
  let trace;
  try {
    trace = globalThis.TycoonPlanner.traceManualDropper({
      dropperId: selected.id,
      items: activePlan.items,
      conveyors: activePlan.lanes,
      database: globalThis.TycoonDatabase,
      plotSize: Number(sizeSlider.value),
      oreCap: 100,
    });
  } catch (error) {
    liveOreContent.innerHTML = `<p class="live-empty">Live tracking could not update: ${escapeHtml(error.message)}</p>`;
    return;
  }
  const route = trace.route;
  const statusPresentation = liveRouteStatus(route);
  const currentValue = route?.currentValue ?? route?.startingValue ?? 0;
  const stages = route?.stages ?? [];
  const routeDiagnostics = (trace.diagnostics ?? []).filter((entry) => entry.dropperId === selected.id);
  const finalEffects = stages.at(-1)?.effectsAfter ?? [];
  const lastReached = route?.reachedFurnace ? 'Furnace' : (stages.at(-1)?.item ?? 'Route start');
  liveOreContent.innerHTML = `
    <div class="live-summary-grid">
      <div class="live-summary-card"><span>Starting value</span><strong>${simulationMoney(route?.startingValue ?? 0)}</strong></div>
      <div class="live-summary-card"><span>Current expected value</span><strong>${simulationMoney(currentValue)}</strong></div>
      <div class="live-summary-card"><span>Ore size</span><strong>${Number(route?.oreSize ?? selected.definition?.oreSize ?? 1).toFixed(3)}</strong></div>
      <div class="live-summary-card"><span>Survival</span><strong>${((route?.survival ?? 1) * 100).toFixed(2)}%</strong></div>
      <div class="live-summary-card"><span>Last reached</span><strong>${escapeHtml(lastReached)}</strong></div>
      ${route?.replication !== 1 ? `<div class="live-summary-card"><span>Replication</span><strong>${Number(route?.replication ?? 1).toFixed(2)}×</strong></div>` : ''}
      ${finalEffects.length ? `<div class="live-summary-card"><span>Effects</span><strong>${escapeHtml(finalEffects.join(', '))}</strong></div>` : ''}
    </div>
    <p class="live-route-status ${statusPresentation.className}">${escapeHtml(statusPresentation.text)}</p>
    <div class="live-chain-heading"><h3>Connected value chain</h3><span>${stages.length} item${stages.length === 1 ? '' : 's'}</span></div>
    ${stages.length ? `<div class="live-chain">${stages.map((stage) => liveStageHtml(stage, routeDiagnostics)).join('')}</div>`
    : '<p class="live-empty">Connect this dropper to an upgrader to see before-and-after ore values.</p>'}`;
}

function abbreviateDiagnosticMoney(message) {
  return String(message ?? '').replace(/\$([0-9][0-9,]*(?:\.\d+)?)/g, (match, amount) => {
    const value = Number(amount.replaceAll(',', ''));
    return Number.isFinite(value) ? simulationMoney(value) : match;
  });
}

function manualSimulationItemHtml(item) {
  if (validation?.kind !== 'manual-simulation') return '';
  const routeStages = validation.routes.flatMap((route) => (
    (route.stages ?? []).filter((stage) => stage.itemId === item.id).map((stage) => ({ route, stage }))
  ));
  const relevantDiagnostics = validation.diagnostics.filter((entry) => (
    entry.itemId === item.id || entry.dropperId === item.id
  ));
  const sampleOutcomeStage = routeStages.find(({ stage }) => stage.outcomeModel?.outcomes?.length)?.stage;
  let rows = '';
  if (item.type === 'dropper') {
    const route = validation.routes.find((entry) => entry.dropperId === item.id);
    rows = route ? `
      <div class="item-stat-row"><span class="item-stat-label">Route</span><span class="item-stat-value">Dropper #${route.dropperOrder}</span></div>
      <div class="item-stat-row"><span class="item-stat-label">Starting ore value</span><span class="item-stat-value">${route.startingValue == null ? 'N/A' : simulationMoney(route.startingValue)}</span></div>
      <div class="item-stat-row"><span class="item-stat-label">Reaches furnace</span><span class="item-stat-value">${route.reachedFurnace ? 'Yes' : 'No'}</span></div>
      <div class="item-stat-row"><span class="item-stat-label">Route time</span><span class="item-stat-value">${route.seconds == null ? 'N/A' : `${route.seconds.toFixed(3)}s`}</span></div>
      <div class="item-stat-row"><span class="item-stat-label">Value before furnace</span><span class="item-stat-value">${route.valueBeforeFurnace == null ? 'N/A' : simulationMoney(route.valueBeforeFurnace)}</span></div>
      <div class="item-stat-row"><span class="item-stat-label">Survival to furnace</span><span class="item-stat-value">${((route.survival ?? 0) * 100).toFixed(2)}%</span></div>
      <div class="item-stat-row"><span class="item-stat-label">Destroyed ore</span><span class="item-stat-value">${(route.destroyedOresPerMinute ?? 0).toFixed(2)}/min</span></div>` : '<p>This dropper was not included in the last simulation.</p>';
  } else if (item.type === 'furnace') {
    const successful = validation.routes.filter((route) => route.reachedFurnace);
    rows = successful.length ? `<table class="simulation-hover-table">
      <thead><tr><th>Dropper</th><th>Before furnace</th><th>After furnace</th><th>Survival</th></tr></thead>
      <tbody>${successful.map((route) => `<tr><td>#${route.dropperOrder}</td><td>${simulationMoney(route.valueBeforeFurnace)}</td><td>${simulationMoney(route.cashPerOre)}</td><td>${((route.survival ?? 0) * 100).toFixed(2)}%</td></tr>`).join('')}</tbody>
    </table>` : '<p>No simulated ore reaches this furnace.</p>';
  } else if (routeStages.length) {
    rows = `<table class="simulation-hover-table">
      <thead><tr><th>Dropper</th><th>Before</th><th>Expected after (survivors)</th><th>Expected per input</th><th>Destroyed here</th><th>Ore size</th><th>Time after</th></tr></thead>
      <tbody>${routeStages.map(({ route, stage }) => `<tr>
        <td>#${route.dropperOrder}</td>
        <td>${simulationMoney(stage.beforeValue)}</td>
        <td>${simulationMoney(stage.afterValue)}</td>
        <td>${simulationMoney(stage.outcomeModel?.expectedValuePerInput ?? stage.afterValue)}</td>
        <td>${((stage.destructionChance ?? 0) * 100).toFixed(2)}%</td>
        <td>${stage.beforeOreSize.toFixed(3)} &rarr; ${stage.afterOreSize.toFixed(3)}</td>
        <td>${stage.arrivalSeconds.toFixed(3)}s</td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="simulation-secondary-stats">${routeStages.map(({ route, stage }) => (
      `<span>#${route.dropperOrder}: cumulative survival ${(stage.survivalBefore * 100).toFixed(2)}% &rarr; ${(stage.survivalAfter * 100).toFixed(2)}% &middot; ${(stage.destroyedOresPerMinute ?? 0).toFixed(2)} ore destroyed/min &middot; replication ${stage.replicationBefore.toFixed(2)}&times; &rarr; ${stage.replicationAfter.toFixed(2)}&times;</span>`
    )).join('')}</div>
    ${sampleOutcomeStage ? `<div class="simulation-outcome-summary">
      <strong>RNG outcomes</strong>
      <p>${sampleOutcomeStage.outcomeModel.outcomes.map((outcome) => `${escapeHtml(outcome.label)} ${(outcome.probability * 100).toFixed(2)}%${outcome.destroyed ? ' (destroyed)' : ''}`).join(' &middot; ')}</p>
    </div>` : ''}`;
  } else rows = '<p>No simulated ore passes through this item.</p>';
  return `
    <section class="item-stat-section ore-tracking simulation-item-tracking">
      <h3>Last base simulation</h3>
      ${rows}
      ${relevantDiagnostics.length ? `<div class="simulation-item-errors">${relevantDiagnostics.map((entry) => `<p><strong>${escapeHtml(entry.code)}</strong> ${escapeHtml(abbreviateDiagnosticMoney(entry.message))}</p>`).join('')}</div>` : ''}
    </section>`;
}

function categorizedManualSimulationHtml(item) {
  if (validation?.kind !== 'manual-simulation') return '';
  const routeStages = validation.routes.flatMap((route) => (
    (route.stages ?? []).filter((stage) => stage.itemId === item.id).map((stage) => ({ route, stage }))
  ));
  const relevantDiagnostics = validation.diagnostics.filter((entry) => (
    entry.itemId === item.id || entry.dropperId === item.id
  ));
  const diagnosticsHtml = relevantDiagnostics.length ? `
    <section class="item-stat-section simulation-diagnostic-tracking simulation-item-tracking">
      <h3>Simulation warnings</h3>
      ${relevantDiagnostics.map((entry) => `<p><strong>${escapeHtml(entry.code)}</strong> ${escapeHtml(abbreviateDiagnosticMoney(entry.message))}</p>`).join('')}
    </section>` : '';

  if (item.type === 'dropper') {
    const route = validation.routes.find((entry) => entry.dropperId === item.id);
    if (!route) return `<section class="item-stat-section timing-tracking simulation-item-tracking"><h3>Route result</h3><p>This dropper was not included in the last simulation.</p></section>${diagnosticsHtml}`;
    const destructionHtml = (route.destroyedOresPerMinute ?? 0) > .000001 ? `
      <section class="item-stat-section destruction-tracking simulation-item-tracking">
        <h3>Ore destruction</h3>
        <div class="item-stat-grid">${statRowsHtml([
          ['Survival to furnace', `${((route.survival ?? 0) * 100).toFixed(2)}%`],
          ['Destroyed ore', `${route.destroyedOresPerMinute.toFixed(2)}/min`],
        ])}</div>
      </section>` : '';
    return `
      <section class="item-stat-section timing-tracking simulation-item-tracking">
        <h3>Route result</h3>
        <div class="item-stat-grid">${statRowsHtml([
          ['Route', `Dropper #${route.dropperOrder}`],
          ['Reaches furnace', route.reachedFurnace ? 'Yes' : 'No'],
          ['Route time', route.seconds == null ? 'N/A' : `${route.seconds.toFixed(3)}s`],
          ...((route.teleporterJumps ?? []).length ? [['Teleporter', route.teleporterJumps.map((jump) => `${jump.color} sender → receiver`).join(', ')]] : []),
        ])}</div>
      </section>
      <section class="item-stat-section value-tracking simulation-item-tracking">
        <h3>Ore value</h3>
        <div class="item-stat-grid">${statRowsHtml([
          ['Starting value', route.startingValue == null ? 'N/A' : simulationMoney(route.startingValue)],
          ['Before furnace', route.valueBeforeFurnace == null ? 'N/A' : simulationMoney(route.valueBeforeFurnace)],
        ])}</div>
      </section>
      ${destructionHtml}${diagnosticsHtml}`;
  }

  if (item.type === 'furnace') {
    const successful = validation.routes.filter((route) => route.reachedFurnace);
    const rows = successful.length ? `<table class="simulation-hover-table">
      <thead><tr><th>Dropper</th><th>Before furnace</th><th>Cash per ore</th></tr></thead>
      <tbody>${successful.map((route) => `<tr><td>#${route.dropperOrder}</td><td>${simulationMoney(route.valueBeforeFurnace)}</td><td>${simulationMoney(route.cashPerOre)}</td></tr>`).join('')}</tbody>
    </table>` : '<p>No simulated ore reaches this furnace.</p>';
    return `<section class="item-stat-section value-tracking simulation-item-tracking"><h3>Furnace payout</h3>${rows}</section>${diagnosticsHtml}`;
  }

  if (item.teleporterRole) {
    const matchingRoutes = validation.routes.filter((route) => (route.teleporterJumps ?? []).some((jump) => (
      item.teleporterRole === 'sender' ? jump.senderId === item.id : jump.receiverId === item.id
    )));
    const routeText = matchingRoutes.length
      ? matchingRoutes.map((route) => `#${route.dropperOrder} → furnace`).join(', ')
      : 'No simulated dropper route uses this teleporter.';
    return `<section class="item-stat-section timing-tracking simulation-item-tracking">
      <h3>Teleporter route</h3>
      <div class="item-stat-grid">${statRowsHtml([
        ['Pair', `${item.teleporterColor} sender → receiver`],
        ['This part', item.teleporterRole],
        ['Routes using warp', routeText],
      ])}</div>
    </section>${diagnosticsHtml}`;
  }

  if (!routeStages.length) {
    return `<section class="item-stat-section timing-tracking simulation-item-tracking"><h3>Route result</h3><p>No simulated ore passes through this item.</p></section>${diagnosticsHtml}`;
  }

  const hasRng = routeStages.some(({ stage }) => stage.outcomeModel?.outcomes?.length);
  const isIncremental = item.name === 'Incremental Upgrader';
  const changesValue = routeStages.some(({ stage }) => Math.abs(stage.afterValue - stage.beforeValue) > .000001);
  const changesSize = routeStages.some(({ stage }) => Math.abs(stage.afterOreSize - stage.beforeOreSize) > .000001);
  const changesReplication = routeStages.some(({ stage }) => Math.abs(stage.replicationAfter - stage.replicationBefore) > .000001);
  const hasImmediateDestruction = routeStages.some(({ stage }) => (stage.destructionChance ?? 0) > .000001);
  const effectSafetyEntries = routeStages.flatMap(({ route, stage }) => (
    (stage.effectSafety ?? []).map((effect) => ({ route, stage, effect }))
  ));
  const unsafeEffectEntries = effectSafetyEntries.filter(({ effect }) => !effect.safe);
  const destroysOre = hasImmediateDestruction || unsafeEffectEntries.length > 0;
  const sampleModel = routeStages.find(({ stage }) => stage.outcomeModel?.outcomes?.length)?.stage.outcomeModel;
  const survivingOutcomes = sampleModel?.outcomes?.filter((outcome) => !outcome.destroyed) ?? [];
  const destructiveOutcomes = sampleModel?.outcomes?.filter((outcome) => outcome.destroyed) ?? [];
  const itemSurvivalChance = survivingOutcomes.reduce((total, outcome) => total + outcome.probability, 0);
  const sparkleOutcome = sampleModel?.outcomes?.find((outcome) => /sparkle/i.test(outcome.label));
  const crossingSeconds = Math.max(...routeStages.map(({ stage }) => Number(stage.crossingSeconds ?? 0)));
  const phantomZones = validation.routes.flatMap((route) => (
    (route.phantomZones ?? [])
      .filter((zone) => zone.sourceItemId === item.id)
      .map((zone) => ({ route, zone }))
  ));

  const timingHtml = `
    <section class="item-stat-section timing-tracking simulation-item-tracking">
      <h3>Route timing</h3>
      <div class="item-stat-grid">${statRowsHtml([
        ['Arrival time from droppers', routeStages.map(({ route, stage }) => `#${route.dropperOrder} ${(stage.arrivalSeconds - (stage.crossingSeconds ?? 0)).toFixed(3)}s`).join(' Â· ')],
        ['Time across item', `${crossingSeconds.toFixed(3)}s`],
      ])}</div>
    </section>`;

  const valueHtml = (changesValue || hasRng) ? `
    <section class="item-stat-section value-tracking simulation-item-tracking">
      <h3>${hasRng ? 'Expected value & RNG' : 'Ore value'}</h3>
      <table class="simulation-hover-table">
        <thead><tr><th>Dropper</th>${isIncremental ? '<th>Use</th><th>Multiplier</th>' : ''}<th>Before</th><th>${hasRng ? 'Expected after (survivors)' : 'After'}</th>${hasRng ? '<th>Expected per input</th>' : ''}</tr></thead>
        <tbody>${routeStages.map(({ route, stage }) => `<tr>
          <td>#${route.dropperOrder}</td>${isIncremental ? `<td>${stage.useNumber} of ${stage.useLimit}</td><td>${Number(stage.appliedMultiplier ?? 1).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}&times;</td>` : ''}<td>${simulationMoney(stage.beforeValue)}</td><td>${simulationMoney(stage.afterValue)}</td>${hasRng ? `<td>${simulationMoney(stage.outcomeModel?.expectedValuePerInput ?? stage.afterValue)}</td>` : ''}
        </tr>`).join('')}</tbody>
      </table>
      ${survivingOutcomes.length ? `<div class="simulation-outcome-list"><h4>Surviving outcomes</h4>${survivingOutcomes.map((outcome) => `<div><span>${escapeHtml(outcome.label)}</span><strong>${(outcome.probability * 100).toFixed(2)}%</strong></div>`).join('')}</div>` : ''}
    </section>` : '';

  const destructionHtml = destroysOre ? `
    <section class="item-stat-section destruction-tracking simulation-item-tracking">
      <h3>Ore destruction</h3>
      ${hasImmediateDestruction ? `<table class="simulation-hover-table">
        <thead><tr><th>Dropper</th><th>Reaches item</th><th>Still alive after</th><th>Destroyed here</th><th>Destroyed/min</th></tr></thead>
        <tbody>${routeStages.map(({ route, stage }) => `<tr>
          <td>#${route.dropperOrder}</td><td>${(stage.survivalBefore * 100).toFixed(2)}%</td><td>${(stage.survivalAfter * 100).toFixed(2)}%</td><td>${((stage.survivalBefore - stage.survivalAfter) * 100).toFixed(2)}%</td><td>${(stage.destroyedOresPerMinute ?? 0).toFixed(2)}</td>
        </tr>`).join('')}</tbody>
      </table><p class="simulation-card-note">Percentages compare against the dropper's original ore output.</p>` : ''}
      ${unsafeEffectEntries.length ? `<table class="simulation-hover-table effect-destruction-table">
        <thead><tr><th>Dropper</th><th>Effect</th><th>Destroyed when timer ends</th><th>Destroyed/min</th></tr></thead>
        <tbody>${unsafeEffectEntries.map(({ route, effect }) => `<tr><td>#${route.dropperOrder}</td><td>${escapeHtml(effect.effect)}</td><td>${(effect.destroyedOriginalFraction * 100).toFixed(2)}%</td><td>${effect.destroyedOresPerMinute.toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>` : ''}
      ${destructiveOutcomes.length ? `<div class="simulation-outcome-list destructive-outcomes"><h4>What happens at this item</h4><p class="simulation-card-note">These chances apply to each ore that reaches the item.</p><div><span>Survives this item</span><strong>${(itemSurvivalChance * 100).toFixed(2)}%</strong></div>${destructiveOutcomes.map((outcome) => `<div><span>${escapeHtml(outcome.label)}</span><strong>${(outcome.probability * 100).toFixed(2)}%</strong></div>`).join('')}</div>` : ''}
    </section>` : '';

  const sizeHtml = changesSize ? `
    <section class="item-stat-section size-tracking simulation-item-tracking">
      <h3>Ore size</h3>
      <div class="item-stat-grid">${statRowsHtml(routeStages.map(({ route, stage }) => [
        `Dropper #${route.dropperOrder}`,
        `${stage.beforeOreSize.toFixed(3)} -> ${stage.afterOreSize.toFixed(3)}`,
      ]))}</div>
    </section>` : '';

  const replicationHtml = changesReplication ? `
    <section class="item-stat-section replication-tracking simulation-item-tracking">
      <h3>Ore replication</h3>
      <div class="item-stat-grid">${statRowsHtml(routeStages.map(({ route, stage }) => [
        `Dropper #${route.dropperOrder}`,
        `${stage.replicationBefore.toFixed(2)}x -> ${stage.replicationAfter.toFixed(2)}x`,
      ]))}</div>
    </section>` : '';

  const effectHtml = (effectSafetyEntries.length || sparkleOutcome) ? `
    <section class="item-stat-section effect-tracking simulation-item-tracking">
      <h3>Effect & safety</h3>
      ${effectSafetyEntries.length ? `<table class="simulation-hover-table effect-safety-table">
        <thead><tr><th>Dropper</th><th>Effect</th><th>Safety point</th><th>Exposure</th><th>Timer</th><th>Margin</th><th>Result</th></tr></thead>
        <tbody>${effectSafetyEntries.map(({ route, effect }) => `<tr><td>#${route.dropperOrder}</td><td>${escapeHtml(effect.effect)}</td><td>${escapeHtml(effect.removedBy)}</td><td>${effect.exposureSeconds.toFixed(3)}s</td><td>${effect.timerSeconds.toFixed(3)}s</td><td>${effect.marginSeconds >= 0 ? '+' : ''}${effect.marginSeconds.toFixed(3)}s</td><td class="${effect.safe ? 'effect-safe' : 'effect-unsafe'}">${effect.immune ? 'Immune' : (effect.safe ? 'Safe' : 'Destroyed')}</td></tr>`).join('')}</tbody>
      </table>` : ''}
      ${sparkleOutcome ? `<div class="item-stat-grid">${statRowsHtml([
        ['Possible effect', 'Sparkles'],
        ['Outcome chance', `${(sparkleOutcome.probability * 100).toFixed(2)}%`],
        ['Effect behavior', 'Cosmetic; it does not destroy or otherwise change the ore by itself.'],
      ])}</div>` : ''}
    </section>` : '';

  const phantomZoneHtml = phantomZones.length ? `
    <section class="item-stat-section phantom-zone-tracking simulation-item-tracking">
      <h3>Phantom-zone estimate</h3>
      <p class="simulation-card-note">Each surviving marked ore triggers uniformly from 1–15 seconds. A zone remains at that route position for 30 seconds; ore reaching the furnace before its trigger does not spawn a zone. Rates include the current ore-cap throughput adjustment.</p>
      <table class="simulation-hover-table">
        <thead><tr><th>Dropper</th><th>Triggers before furnace</th><th>Spawns/min</th><th>Active zones</th><th>Ore spacing</th></tr></thead>
        <tbody>${phantomZones.map(({ route, zone }) => `<tr><td>#${route.dropperOrder}</td><td>${(zone.spawnBeforeFurnaceProbability * 100).toFixed(2)}%</td><td>${zone.expectedSpawnsPerMinute.toFixed(2)}</td><td>${zone.expectedActiveZones.toFixed(2)}</td><td>${zone.dropIntervalSeconds == null ? 'N/A' : `${zone.dropIntervalSeconds.toFixed(3)}s`}</td></tr>`).join('')}</tbody>
      </table>
      <div class="item-stat-grid">${statRowsHtml([
        ['Random trigger', 'Uniform from 1–15 seconds'],
        ['Zone lifetime', `${phantomZones[0].zone.zoneLifetimeSeconds}s`],
        ['Phantom multiplier', `${Number(phantomZones[0].zone.multiplier).toFixed(2)}×`],
        ['Maximum boosts per ore', '3'],
      ])}</div>
      <details class="phantom-zone-breakdown">
        <summary>Per-section spawn estimate</summary>
        ${phantomZones.map(({ route, zone }) => `<table class="simulation-hover-table">
          <thead><tr><th>Dropper</th><th>Section</th><th>Trigger time</th><th>Spawn chance</th><th>Active zones</th></tr></thead>
          <tbody>${zone.candidates.map((candidate) => `<tr><td>#${route.dropperOrder}</td><td>${escapeHtml(candidate.name ?? candidate.componentId)}</td><td>${candidate.startSeconds.toFixed(3)}–${candidate.endSeconds.toFixed(3)}s</td><td>${(candidate.spawnProbability * 100).toFixed(2)}%</td><td>${candidate.expectedActiveZones.toFixed(2)}</td></tr>`).join('')}</tbody>
        </table>`).join('')}
      </details>
    </section>` : '';

  return `${timingHtml}${phantomZoneHtml}${destructionHtml}${valueHtml}${sizeHtml}${replicationHtml}${effectHtml}${diagnosticsHtml}`;
}

function itemDetailsHtml(item) {
  const processingZone = furnaceProcessingZoneGeometry(item);
  return `
    <strong>${escapeHtml(item.name)}</strong>
    <p>${escapeHtml(displayItemDescription(item))}</p>
    ${categorizedManualSimulationHtml(item)}
    ${statsSectionsHtml(item.stats)}
    <dl class="item-meta">
      <dt>Database size</dt><dd>${item.itemWidth}×${item.itemLength}</dd>
      <dt>Grid footprint</dt><dd>${item.width}×${item.height}</dd>
      <dt>Top-left</dt><dd>${columnName(item.x)}${item.y}</dd>
      ${item.coordinateRange ? `<dt>Mapped range</dt><dd>${escapeHtml(item.coordinateRange)}</dd>
        <dt>Occupied cells</dt><dd>${item.occupiedCells.length}</dd>` : ''}
      <dt>Facing</dt><dd>${escapeHtml(item.direction)}</dd>
      ${processingZone ? `
        <dt>Processing zone</dt><dd>${processingZone.width}×${processingZone.height} at ${coordinateRange(processingZone)}</dd>
        <dt>Zone placement</dt><dd>${escapeHtml(item.processingZonePlacement.replaceAll('-', ' '))}</dd>` : ''}
    </dl>`;
}

function conveyorDetailsHtml(conveyor) {
  const isTeleporter = Boolean(conveyor.teleporterRole);
  const isWall = Boolean(conveyor.wall);
  return `
    <strong>${escapeHtml(conveyor.conveyor)}</strong>
    <p>${isWall
      ? 'A separate 1x2 barrier. It occupies grid space and does not transport ore.'
      : isTeleporter
      ? `${escapeHtml(conveyor.teleporterColor)} teleporter ${escapeHtml(conveyor.teleporterRole)} · requires Rebirth 5.`
      : 'External conveyor segment from the planner rules.'}</p>
    ${categorizedManualSimulationHtml(conveyor)}
    <dl class="item-meta">
      <dt>Grid footprint</dt><dd>${conveyor.width}x${conveyor.height}</dd>
      <dt>Top-left</dt><dd>${columnName(conveyor.x)}${conveyor.y}</dd>
      ${conveyor.coordinateRange ? `<dt>Mapped range</dt><dd>${escapeHtml(conveyor.coordinateRange)}</dd>
        <dt>Occupied cells</dt><dd>${conveyor.occupiedCells.length}</dd>` : ''}
      <dt>Facing</dt><dd>${escapeHtml(conveyor.direction)}</dd>
      ${conveyor.speed != null ? `<dt>Speed</dt><dd>${conveyor.speed}</dd>` : ''}
    </dl>`;
}

function parseCoordinate(value) {
  const trimmed = value.trim();
  const a1Match = /^([A-Za-z]+)\s*(\d+)$/.exec(trimmed);
  if (a1Match) {
    const x = [...a1Match[1].toUpperCase()].reduce(
      (total, letter) => total * 26 + letter.charCodeAt(0) - 64,
      0,
    );
    return { x, y: Number(a1Match[2]) };
  }

  const numericMatch = /^(\d+)\s*[, ]\s*(\d+)$/.exec(trimmed);
  if (numericMatch) return { x: Number(numericMatch[1]), y: Number(numericMatch[2]) };
  throw new Error('Enter a coordinate such as A1 or 1,1.');
}

function rotateDirection(direction, turn) {
  const directions = ['north', 'east', 'south', 'west'];
  const current = directions.indexOf(direction);
  if (current === -1) throw new Error(`Unknown direction: ${direction}.`);
  const offset = turn === 'left' ? -1 : 1;
  return directions[(current + offset + directions.length) % directions.length];
}

function updateItemGeometry(item, { x = item.x, y = item.y, direction = item.direction } = {}) {
  const horizontal = direction === 'east' || direction === 'west';
  const portable = item.type === 'portable';
  return {
    ...item,
    x,
    y,
    direction,
    width: portable
      ? (horizontal ? item.itemWidth : item.itemLength)
      : (horizontal ? item.itemLength : item.itemWidth),
    height: portable
      ? (horizontal ? item.itemLength : item.itemWidth)
      : (horizontal ? item.itemWidth : item.itemLength),
  };
}

function updateConveyorGeometry(conveyor, {
  x = conveyor.x,
  y = conveyor.y,
  direction = conveyor.direction,
} = {}) {
  const definition = conveyorCatalog.find((entry) => entry.name === conveyor.conveyor);
  const itemWidth = conveyor.itemWidth ?? definition?.size.width;
  const itemLength = conveyor.itemLength ?? definition?.size.length;
  const horizontal = direction === 'east' || direction === 'west';
  return {
    ...conveyor,
    x,
    y,
    direction,
    itemWidth,
    itemLength,
    width: horizontal ? itemLength : itemWidth,
    height: horizontal ? itemWidth : itemLength,
  };
}

function portableBeamGeometry(item) {
  if (item.type !== 'portable' || !item.beamLength) return null;
  if (item.direction === 'north') {
    return { x: item.x, y: item.y - item.beamLength, width: item.width, height: item.beamLength };
  }
  if (item.direction === 'south') {
    return { x: item.x, y: item.y + item.height, width: item.width, height: item.beamLength };
  }
  if (item.direction === 'west') {
    return { x: item.x - item.beamLength, y: item.y, width: item.beamLength, height: item.height };
  }
  return { x: item.x + item.width, y: item.y, width: item.beamLength, height: item.height };
}

function itemTransportGeometry(item) {
  const profile = internalTransportProfile(item.name, item.itemWidth, item.type);
  const conveyorWidth = item.conveyorWidth ?? profile?.across ?? 0;
  const conveyorOffset = item.conveyorOffset ?? profile?.northOffset ?? 0;
  if (!conveyorWidth) return null;
  const offset = item.direction === 'south' || item.direction === 'west'
    ? item.itemWidth - conveyorOffset - conveyorWidth
    : conveyorOffset;
  const horizontal = item.direction === 'east' || item.direction === 'west';
  return horizontal
    ? { x: item.x, y: item.y + offset, width: item.width, height: conveyorWidth }
    : { x: item.x + offset, y: item.y, width: conveyorWidth, height: item.height };
}

function furnaceProcessingZoneGeometry(item) {
  if (item.type !== 'furnace' || !item.processingZoneAcross || !item.processingZoneDepth) return null;
  const across = item.processingZoneAcross;
  const depth = item.processingZoneDepth;

  if (item.processingZonePlacement === 'front-corner') {
    if (item.direction === 'south') {
      return { x: item.x, y: item.y + item.height - depth, width: across, height: depth };
    }
    if (item.direction === 'west') {
      return { x: item.x, y: item.y, width: depth, height: across };
    }
    if (item.direction === 'north') {
      return { x: item.x + item.width - across, y: item.y, width: across, height: depth };
    }
    return {
      x: item.x + item.width - depth,
      y: item.y + item.height - across,
      width: depth,
      height: across,
    };
  }
  if (item.direction === 'west') {
    return {
      x: item.x,
      y: item.y + (item.height - across) / 2,
      width: depth,
      height: across,
    };
  }
  if (item.direction === 'east') {
    return {
      x: item.x + item.width - depth,
      y: item.y + (item.height - across) / 2,
      width: depth,
      height: across,
    };
  }
  if (item.direction === 'north') {
    return {
      x: item.x + (item.width - across) / 2,
      y: item.y,
      width: across,
      height: depth,
    };
  }
  return {
    x: item.x + (item.width - across) / 2,
    y: item.y + item.height - depth,
    width: across,
    height: depth,
  };
}

function coordinateRange({ x, y, width, height }) {
  const start = `${columnName(x)}${y}`;
  const end = `${columnName(x + width - 1)}${y + height - 1}`;
  return start === end ? start : `${start}:${end}`;
}

function mapPlacementCoordinates(placement) {
  const occupiedCells = [];
  for (let y = placement.y; y < placement.y + placement.height; y += 1) {
    for (let x = placement.x; x < placement.x + placement.width; x += 1) {
      occupiedCells.push({ x, y, coordinate: `${columnName(x)}${y}` });
    }
  }
  const topLeft = `${columnName(placement.x)}${placement.y}`;
  const bottomRight = `${columnName(placement.x + placement.width - 1)}${placement.y + placement.height - 1}`;
  return {
    ...placement,
    topLeft,
    bottomRight,
    facing: placement.direction,
    footprint: { width: placement.width, height: placement.height },
    occupiedCells,
    coordinateRange: topLeft === bottomRight ? topLeft : `${topLeft}:${bottomRight}`,
  };
}

let activePlan = null;
let selectedItemId = null;
let hoveredPlacementId = null;
let editNotice = '';

function clearPlanner() {
  coordinateMap.length = 0;
  routeSegments.length = 0;
  plannedOrder = 1;
  capOreValue = 0;
  validation = null;
  activePlan = null;
  workflowStage = 0;
  workflowProgress = null;
  selectedItemId = null;
  hoveredPlacementId = null;
  editNotice = '';
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function cloneLoadoutValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadSavedLoadouts() {
  const storage = browserStorage();
  if (!storage) return [];
  try {
    const saved = JSON.parse(storage.getItem(savedLoadoutsStorageKey));
    return saved?.version === 1 && Array.isArray(saved.loadouts) ? saved.loadouts : [];
  } catch {
    return [];
  }
}

function storeSavedLoadouts(loadouts) {
  const storage = browserStorage();
  if (!storage) throw new Error('Browser storage is unavailable.');
  storage.setItem(savedLoadoutsStorageKey, JSON.stringify({ version: 1, loadouts }));
}

function upsertSavedLoadout(record) {
  const loadouts = loadSavedLoadouts();
  const nameKey = record.name.trim().toLowerCase();
  const existingIndex = loadouts.findIndex((candidate) => (
    candidate.id === record.id || candidate.name?.trim().toLowerCase() === nameKey
  ));
  if (existingIndex >= 0) {
    record.id = loadouts[existingIndex].id;
    record.createdAt = loadouts[existingIndex].createdAt ?? record.createdAt;
    loadouts.splice(existingIndex, 1, record);
  } else {
    loadouts.push(record);
  }
  storeSavedLoadouts(loadouts);
  return record;
}

function removeSavedLoadout(id) {
  const loadouts = loadSavedLoadouts().filter((record) => record.id !== id);
  storeSavedLoadouts(loadouts);
  return loadouts;
}

function acquisitionRecordsForPlacement(item) {
  if (isConveyorPlacement(item)) return [];
  const name = String(item.name ?? '').toLowerCase();
  const variant = String(item.stats?.Variant ?? item.variant ?? 'Base').toLowerCase();
  const all = globalThis.TycoonDatabase?.records ?? [];
  const exact = all.filter((record) => (
    String(record.name).toLowerCase() === name && String(record.variant ?? 'Base').toLowerCase() === variant
  ));
  return exact.length ? exact : all.filter((record) => String(record.name).toLowerCase() === name);
}

function rebirthRequirementForPlacement(placement) {
  if (isConveyorPlacement(placement) && placement.teleporterRole) return 5;
  const name = String(placement.name ?? '').toLowerCase();
  const related = (globalThis.TycoonDatabase?.records ?? []).filter((record) => (
    String(record.name).toLowerCase() === name
  ));
  const values = related.flatMap((record) => [record.source, ...(record.sources ?? []),
    ...(record.sourceSheets ?? []).map((source) => source.source)])
    .map((source) => String(source ?? '').match(/reb(?:irth|rith)\s*(\d+)/i))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return values.length ? Math.max(...values) : 0;
}

function crateRequirementForPlacement(placement) {
  const sources = acquisitionRecordsForPlacement(placement)
    .flatMap((record) => [record.source, ...(record.sources ?? []),
      ...(record.sourceSheets ?? []).map((source) => source.source)]);
  let highest = null;
  for (const source of sources) {
    const text = String(source ?? '').toLowerCase();
    crateProgression.forEach((crate, index) => {
      if (text.includes(`${crate.toLowerCase()} crate`) && (!highest || index > highest.index)) {
        highest = { name: crate, index };
      }
    });
  }
  return highest;
}

function automaticBaseMetadata(items, lanes, simulation, plotSize) {
  const placements = [...items, ...lanes];
  const rebirthItems = placements
    .map((placement) => ({ name: placement.name ?? placement.conveyor, level: rebirthRequirementForPlacement(placement) }))
    .filter((entry) => entry.level > 0)
    .sort((left, right) => right.level - left.level);
  const crateEntries = placements.map(crateRequirementForPlacement).filter(Boolean);
  const highestCrate = crateEntries.sort((left, right) => right.index - left.index)[0]?.name ?? 'None';
  const special = { merchant: [], secret: [], achievement: [], premium: [] };
  items.forEach((item) => {
    const records = acquisitionRecordsForPlacement(item);
    const acquisitions = new Set(records
      .flatMap((record) => [record.acquisition, ...(record.acquisitions ?? [])])
      .filter(Boolean));
    const acquisitionText = records.map((record) => `${record.sheet ?? ''} ${record.source ?? ''} ${record.effects ?? ''}`).join(' ');
    if (/traveling merchant|\bmerchant\b/i.test(acquisitionText)) acquisitions.add('merchant');
    if (/achievement/i.test(acquisitionText)) acquisitions.add('achievement');
    if (/premium|p2w|gamepass|robux/i.test(acquisitionText)) acquisitions.add('premium');
    if (records.some((record) => String(record.rarity).toLowerCase() === 'secret') || /\bsecret\b/i.test(acquisitionText)) acquisitions.add('secret');
    Object.keys(special).forEach((category) => {
      if (acquisitions.has(category)) special[category].push(`${item.name} (${item.stats?.Variant ?? item.variant ?? 'Base'})`);
    });
  });
  Object.keys(special).forEach((category) => { special[category] = [...new Set(special[category])]; });
  const metrics = simulation?.metrics ?? {};
  const routes = simulation?.routes ?? [];
  return {
    expectedCashPerMinute: Number(metrics.expectedCashPerMinute ?? 0),
    rebirth: rebirthItems[0]?.level ?? 0,
    lastRebirthItem: rebirthItems[0]?.name ?? 'None',
    plotSize: Number(plotSize),
    highestCrate,
    payment: special.premium.length ? 'P2W' : 'F2P',
    specialItems: special,
    oreLimit: Number(metrics.oreCap ?? 100),
    activeOres: Number(metrics.cappedActiveOres ?? 0),
    projectedActiveOres: Number(metrics.projectedActiveOres ?? 0),
    limitedByOreCap: Boolean(metrics.limitedByOreCap),
    destroyedOresPerMinute: Number(metrics.destroyedOresPerMinute ?? 0),
    survivalToFurnace: Number(metrics.survivalToFurnace ?? 0),
    furnaceEntriesPerMinute: Number(metrics.furnaceEntriesPerMinute ?? 0),
    longestRouteSeconds: Number(metrics.routeTimeSeconds ?? 0),
    routesTotal: routes.length,
    routesReachingFurnace: routes.filter((route) => route.reachedFurnace).length,
    reservedTiles: Number(metrics.reservedTiles ?? 0),
    remainingTiles: Number(metrics.remainingTiles ?? Math.max(0, Number(plotSize) ** 2)),
    itemCount: items.length,
    conveyorCount: lanes.length,
    diagnosticCount: simulation?.diagnostics?.length ?? 0,
    simulationValid: Boolean(simulation?.valid),
  };
}

function simulateBaseSnapshot(items = activePlan?.items ?? [], lanes = activePlan?.lanes ?? [], plotSize = Number(sizeSlider.value)) {
  return globalThis.TycoonPlanner.simulateManualBase({
    items,
    conveyors: lanes,
    database: globalThis.TycoonDatabase,
    plotSize,
    oreCap: 100,
  });
}

function createSavedLoadout(name, simulation = simulateBaseSnapshot()) {
  const now = new Date().toISOString();
  const items = cloneLoadoutValue(activePlan?.items ?? []);
  const lanes = cloneLoadoutValue(activePlan?.lanes ?? []);
  const plotSize = Number(sizeSlider.value);
  return {
    fileType: loadoutFileType,
    version: 1,
    id: `loadout-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    databaseHash: globalThis.TycoonDatabase?.sourceHash ?? null,
    plan: { plotSize, items, lanes },
    stats: automaticBaseMetadata(items, lanes, simulation, plotSize),
    diagnostics: (simulation?.diagnostics ?? []).map(({ code, message }) => ({ code, message })),
  };
}

function normalizeSavedLoadout(payload) {
  const record = payload?.loadout ?? payload;
  if (!record || record.fileType !== loadoutFileType || record.version !== 1) {
    throw new Error('This is not a Tycoon Sim 2 saved loadout file.');
  }
  if (!record.name?.trim() || !Array.isArray(record.plan?.items) || !Array.isArray(record.plan?.lanes)) {
    throw new Error('The loadout file is missing its name or grid placements.');
  }
  const plotSize = Number(record.plan.plotSize);
  if (!Number.isInteger(plotSize) || plotSize < Number(sizeSlider.min) || plotSize > Number(sizeSlider.max)) {
    throw new Error(`The loadout plot size must be between ${sizeSlider.min} and ${sizeSlider.max}.`);
  }
  return cloneLoadoutValue({
    ...record,
    id: record.id ?? `loadout-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: record.name.trim(),
    createdAt: record.createdAt ?? new Date().toISOString(),
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  });
}

function loadoutFilename(name) {
  const safe = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'saved-base';
  return `${safe}.tycoon-loadout.json`;
}

function downloadLoadoutFile(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = loadoutFilename(record.name);
  link.click();
  URL.revokeObjectURL(url);
}

async function writeLoadoutFile(record) {
  if (typeof globalThis.showDirectoryPicker === 'function') {
    try {
      savedLoadoutDirectoryHandle ??= await globalThis.showDirectoryPicker({
        id: 'tycoon-sim-2-saved-loadouts',
        mode: 'readwrite',
        startIn: 'documents',
      });
      const file = await savedLoadoutDirectoryHandle.getFileHandle(loadoutFilename(record.name), { create: true });
      const writable = await file.createWritable();
      await writable.write(JSON.stringify(record, null, 2));
      await writable.close();
      return 'folder';
    } catch {
      // Cancelling or an unsupported folder falls back to a normal shareable download.
    }
  }
  downloadLoadoutFile(record);
  return 'download';
}

function metadataRows(metadata) {
  const rebirth = metadata.rebirth ? `Rebirth ${metadata.rebirth} · ${metadata.lastRebirthItem}` : 'Rebirth 0 · no rebirth items';
  const destructionPercent = (1 - Number(metadata.survivalToFurnace ?? 0)) * 100;
  return [
    ['Expected cash/min', abbreviatedRate(metadata.expectedCashPerMinute ?? 0)],
    ['Required rebirth', rebirth],
    ['Plot size', `${metadata.plotSize} × ${metadata.plotSize}`],
    ['Highest crate', metadata.highestCrate],
    ['Access type', metadata.payment],
    ['Ore limit', `${Number(metadata.activeOres ?? 0).toFixed(2)} / ${metadata.oreLimit}${metadata.limitedByOreCap ? ' · cap limited' : ''}`],
    ['Ore destruction', `${Number(metadata.destroyedOresPerMinute ?? 0).toFixed(2)}/min · ${destructionPercent.toFixed(2)}% before furnace`],
    ['Routes reaching furnace', `${metadata.routesReachingFurnace}/${metadata.routesTotal}`],
    ['Longest route', `${Number(metadata.longestRouteSeconds ?? 0).toFixed(3)}s`],
    ['Furnace throughput', `${Number(metadata.furnaceEntriesPerMinute ?? 0).toFixed(2)} ores/min`],
    ['Space', `${metadata.reservedTiles} used · ${metadata.remainingTiles} free`],
    ['Placements', `${metadata.itemCount} items · ${metadata.conveyorCount} conveyors`],
    ['Merchant items', metadata.specialItems?.merchant?.join(', ') || 'None', true],
    ['Secret items', metadata.specialItems?.secret?.join(', ') || 'None', true],
    ['Achievement items', metadata.specialItems?.achievement?.join(', ') || 'None', true],
    ['Premium items', metadata.specialItems?.premium?.join(', ') || 'None', true],
  ];
}

function savedBaseMetadataHtml(metadata) {
  return metadataRows(metadata).map(([label, value, wide]) => `
    <div class="saved-base-stat${wide ? ' is-wide' : ''}">
      <span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>
    </div>`).join('');
}

function updateSavedBaseButton() {
  const ready = plannerMode === 'build' && validation?.kind === 'manual-simulation';
  saveBaseButton.disabled = !ready;
  saveBaseButton.title = ready
    ? 'Save the current simulated base'
    : 'Simulate the current base before saving';
}

function selectedSavedLoadout() {
  return loadSavedLoadouts().find((record) => record.id === selectedSavedBaseId) ?? null;
}

function setLoadoutActionButtons(enabled) {
  loadBaseDialog.querySelectorAll('[data-load-base-action="preview"], [data-load-base-action="load"], [data-load-base-action="delete"]')
    .forEach((button) => { button.disabled = !enabled; });
}

function renderSavedBaseDetails(record) {
  savedBasePreview.hidden = true;
  savedBasePreview.replaceChildren();
  setLoadoutActionButtons(Boolean(record));
  if (!record) {
    savedBaseDetails.innerHTML = '<p>Select a saved base to see its benchmark stats.</p>';
    return;
  }
  const databaseChanged = record.databaseHash && globalThis.TycoonDatabase?.sourceHash
    && record.databaseHash !== globalThis.TycoonDatabase.sourceHash;
  savedBaseDetails.innerHTML = `
    <h3>${escapeHtml(record.name)}</h3>
    ${databaseChanged ? '<p class="item-editor-error">This file was saved with a different item database version. It will be revalidated before loading.</p>' : ''}
    <div class="saved-base-metadata">${savedBaseMetadataHtml(record.stats)}</div>
    <p><strong>${record.stats?.simulationValid ? 'Simulation passed' : 'Simulation saved with issues'}</strong> · ${record.stats?.diagnosticCount ?? record.diagnostics?.length ?? 0} diagnostic(s)</p>`;
}

function renderSavedBaseList() {
  const loadouts = loadSavedLoadouts().sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
  if (selectedSavedBaseId && !loadouts.some((record) => record.id === selectedSavedBaseId)) selectedSavedBaseId = null;
  savedBaseList.replaceChildren();
  if (!loadouts.length) {
    const empty = document.createElement('p');
    empty.className = 'saved-base-list-empty';
    empty.textContent = 'No saved bases yet. Save the current grid or import a loadout file.';
    savedBaseList.append(empty);
  } else {
    loadouts.forEach((record) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.savedBaseId = record.id;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(record.id === selectedSavedBaseId));
      button.innerHTML = `<strong>${escapeHtml(record.name)}</strong><small>${escapeHtml(record.stats?.payment ?? 'Unknown')} · ${record.stats?.plotSize ?? record.plan?.plotSize}×${record.stats?.plotSize ?? record.plan?.plotSize} · ${abbreviatedRate(record.stats?.expectedCashPerMinute ?? 0)}</small>`;
      savedBaseList.append(button);
    });
  }
  renderSavedBaseDetails(loadouts.find((record) => record.id === selectedSavedBaseId) ?? null);
}

function openSaveBaseMenu() {
  if (plannerMode !== 'build' || validation?.kind !== 'manual-simulation') return;
  const placements = (activePlan?.items?.length ?? 0) + (activePlan?.lanes?.length ?? 0);
  saveBaseStatus.hidden = true;
  saveBaseStatus.classList.remove('is-success');
  savedBaseName.value = activePlan?.title && !/workspace|benchmark/i.test(activePlan.title) ? activePlan.title : '';
  const submit = saveBaseForm.querySelector('[type="submit"]');
  submit.disabled = placements === 0;
  if (!placements) {
    pendingSaveSnapshot = null;
    saveBaseMetadata.innerHTML = '<p>Place at least one item or conveyor before saving a base.</p>';
  } else {
    pendingSaveSnapshot = validation;
    saveBaseMetadata.innerHTML = savedBaseMetadataHtml(automaticBaseMetadata(
      activePlan.items,
      activePlan.lanes,
      pendingSaveSnapshot,
      Number(sizeSlider.value),
    ));
  }
  saveBaseDialog.showModal();
  if (placements) savedBaseName.focus();
}

async function submitSavedBase(event) {
  event.preventDefault();
  const name = savedBaseName.value.trim();
  if (!name || !pendingSaveSnapshot) return;
  const submit = saveBaseForm.querySelector('[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Saving…';
  try {
    const record = upsertSavedLoadout(createSavedLoadout(name, pendingSaveSnapshot));
    const destination = await writeLoadoutFile(record);
    editNotice = destination === 'folder'
      ? `Saved “${record.name}” to the local library and your saved-loadouts folder.`
      : `Saved “${record.name}” to the local library and downloaded its shareable loadout file.`;
    saveBaseDialog.close();
    renderGrid(Number(sizeSlider.value));
  } catch (error) {
    saveBaseStatus.textContent = error.message;
    saveBaseStatus.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = 'Save Base';
  }
}

function openLoadBaseMenu() {
  selectedSavedBaseId = selectedSavedBaseId && loadSavedLoadouts().some((record) => record.id === selectedSavedBaseId)
    ? selectedSavedBaseId
    : null;
  loadBaseStatus.textContent = `${loadSavedLoadouts().length} saved base${loadSavedLoadouts().length === 1 ? '' : 's'} available.`;
  renderSavedBaseList();
  loadBaseDialog.showModal();
}

function renderSavedLoadoutPreview(record) {
  const size = Number(record.plan.plotSize);
  const previewGrid = document.createElement('div');
  previewGrid.className = 'saved-base-preview-grid';
  previewGrid.style.setProperty('--preview-size', String(size));
  [...record.plan.lanes, ...record.plan.items].forEach((placement) => {
    const element = document.createElement('div');
    const isLane = isConveyorPlacement(placement);
    const type = isLane ? 'routing' : (placement.type ?? itemType(placement.name));
    element.className = `saved-base-preview-placement ${type}`;
    element.style.left = `${(placement.x - 1) / size * 100}%`;
    element.style.top = `${(placement.y - 1) / size * 100}%`;
    element.style.width = `${placement.width / size * 100}%`;
    element.style.height = `${placement.height / size * 100}%`;
    element.textContent = isLane ? '' : shortLabel(placement.name);
    element.title = `${placement.name ?? placement.conveyor} · facing ${placement.direction}`;
    previewGrid.append(element);
  });
  savedBasePreview.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = `${record.name} · non-destructive preview`;
  savedBasePreview.append(heading, previewGrid);
  savedBasePreview.hidden = false;
  savedBasePreview.scrollIntoView?.({ block: 'nearest' });
}

async function importSavedLoadoutFiles(files) {
  let imported = 0;
  const errors = [];
  for (const file of [...files].slice(0, 250)) {
    if (!file.name.toLowerCase().endsWith('.json')) continue;
    try {
      const record = normalizeSavedLoadout(JSON.parse(await file.text()));
      upsertSavedLoadout(record);
      imported += 1;
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }
  loadBaseStatus.textContent = `${imported} loadout${imported === 1 ? '' : 's'} imported.${errors.length ? ` ${errors.length} file${errors.length === 1 ? '' : 's'} skipped.` : ''}`;
  renderSavedBaseList();
}

function requestSavedBaseLoad(record) {
  if (!record) return;
  pendingLoadBaseId = record.id;
  loadBaseDialog.close();
  confirmLoadBaseDialog.showModal();
}

function preparedSavedBasePlan(record) {
  const size = Number(record.plan.plotSize);
  const items = record.plan.items.map((item) => mapPlacementCoordinates(refreshPlacementMetadata(item)));
  const lanes = record.plan.lanes.map((lane) => mapPlacementCoordinates(updateConveyorGeometry(lane)));
  validateCoordinateMap(items, size);
  validateRouteSegments(lanes, items, size, { allowUncompressedQuarterConveyors: true });
  return { size, items, lanes };
}

function loadSavedBaseIntoGrid(record) {
  let prepared;
  try {
    prepared = preparedSavedBasePlan(record);
  } catch (error) {
    confirmLoadBaseDialog.close();
    openLoadBaseMenu();
    loadBaseStatus.textContent = `Could not load “${record.name}”: ${error.message}`;
    return false;
  }
  confirmLoadBaseDialog.close();
  if (itemEditor.open) itemEditor.close();
  if (massSelectionDialog.open) massSelectionDialog.close();
  clearPlanner();
  selectedLiveDropperId = null;
  plannerMode = 'build';
  sizeSlider.value = prepared.size;
  coordinateMap.push(...prepared.items);
  routeSegments.push(...prepared.lanes);
  activePlan = {
    title: record.name,
    minimumSize: prepared.size,
    items: coordinateMap,
    lanes: routeSegments,
  };
  workflowStage = 2;
  editNotice = `Loaded “${record.name}”. Run Simulate base to refresh its stats against the current database.`;
  selectedSavedBaseId = null;
  pendingLoadBaseId = null;
  applyPlannerModeUi();
  savePlannerMode();
  saveWorkspace();
  saveViewPreferences();
  renderWorkflow();
  renderItemLibrary();
  renderGrid(prepared.size);
  return true;
}

function saveViewPreferences() {
  const storage = browserStorage();
  if (!storage) return false;
  try {
    storage.setItem(viewPreferencesStorageKey, JSON.stringify({
      version: 1,
      baseSize: Number(sizeSlider.value),
      gridZoom: Number(zoomSlider.value),
    }));
    return true;
  } catch {
    return false;
  }
}

function loadViewPreferences() {
  const storage = browserStorage();
  if (!storage) return false;
  try {
    const saved = JSON.parse(storage.getItem(viewPreferencesStorageKey));
    if (saved?.version !== 1) return false;
    const baseSize = Number(saved.baseSize);
    const gridZoom = Number(saved.gridZoom);
    if (baseSize >= Number(sizeSlider.min) && baseSize <= Number(sizeSlider.max)) sizeSlider.value = baseSize;
    if (gridZoom >= Number(zoomSlider.min) && gridZoom <= Number(zoomSlider.max)) zoomSlider.value = gridZoom;
    return true;
  } catch {
    return false;
  }
}

function savePlannerMode() {
  const storage = browserStorage();
  if (!storage) return false;
  try {
    storage.setItem(plannerModeStorageKey, plannerMode);
    return true;
  } catch {
    return false;
  }
}

function loadPlannerMode() {
  const storage = browserStorage();
  if (!storage) return 'build';
  try {
    const savedMode = storage.getItem(plannerModeStorageKey);
    return savedMode === 'generation' ? 'generation' : 'build';
  } catch {
    return 'build';
  }
}

function applyPlannerModeUi() {
  document.body?.classList?.toggle('mode-build', plannerMode === 'build');
  document.body?.classList?.toggle('mode-generation', plannerMode === 'generation');
  (plannerModeToggle.querySelectorAll?.('[data-planner-mode]') ?? []).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.plannerMode === plannerMode));
  });
  renderKeybindGuide();
}

function generationSourceSignature() {
  const generatedPlan = globalThis.TycoonActivePlan;
  return JSON.stringify({
    activePlan: generatedPlan ? {
      valid: generatedPlan.valid,
      title: generatedPlan.title,
      profile: generatedPlan.profile,
      items: generatedPlan.items?.map(({ id, name, variant, x, y, width, height, direction }) => (
        { id, name, variant, x, y, width, height, direction }
      )),
      conveyors: generatedPlan.conveyors?.map(({ id, conveyor, x, y, width, height, direction }) => (
        { id, conveyor, x, y, width, height, direction }
      )),
      metrics: generatedPlan.metrics,
    } : null,
    workflow: globalThis.TycoonWorkflowState ?? null,
  });
}

function generationSourceChanged() {
  const storage = browserStorage();
  if (!storage) return false;
  try {
    const baseline = storage.getItem(generationBaselineStorageKey);
    return Boolean(baseline && baseline !== generationSourceSignature());
  } catch {
    return false;
  }
}

function saveWorkspace() {
  if (!activePlan || plannerMode !== 'build') return false;
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(workspaceStorageKey, JSON.stringify({
      version: 1,
      mode: plannerMode,
      databaseHash: globalThis.TycoonDatabase?.sourceHash ?? null,
      baseSize: Number(sizeSlider.value),
      liveDropperId: selectedLiveDropperId,
      plan: {
        title: activePlan.title,
        minimumSize: activePlan.minimumSize,
        items: activePlan.items,
        lanes: activePlan.lanes,
      },
    }));
    return true;
  } catch {
    return false;
  }
}

function loadSavedWorkspace() {
  if (plannerMode !== 'build') return false;
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    const saved = JSON.parse(storage.getItem(workspaceStorageKey));
    if (!saved?.plan || saved.version !== 1) return false;
    const currentDatabaseHash = globalThis.TycoonDatabase?.sourceHash ?? null;
    if (saved.databaseHash && currentDatabaseHash && saved.databaseHash !== currentDatabaseHash) return false;
    const savedSize = Number(saved.baseSize);
    if (savedSize >= Number(sizeSlider.min) && savedSize <= Number(sizeSlider.max)) sizeSlider.value = savedSize;
    selectedLiveDropperId = saved.liveDropperId ?? null;
    coordinateMap.push(...(saved.plan.items ?? [])
      .map((item) => mapPlacementCoordinates(refreshPlacementMetadata(item))));
    routeSegments.push(...(saved.plan.lanes ?? []).map((lane) => (
      mapPlacementCoordinates(updateConveyorGeometry(lane))
    )));
    validateCoordinateMap(coordinateMap, Number(sizeSlider.value));
    validateRouteSegments(routeSegments, coordinateMap, Number(sizeSlider.value), { allowUncompressedQuarterConveyors: true });
    activePlan = {
      title: saved.plan.title ?? 'Benchmark workspace',
      minimumSize: Number(saved.plan.minimumSize ?? sizeSlider.min),
      items: coordinateMap,
      lanes: routeSegments,
    };
    workflowStage = 2;
    editNotice = `Restored ${coordinateMap.length} item${coordinateMap.length === 1 ? '' : 's'} and ${routeSegments.length} conveyor${routeSegments.length === 1 ? '' : 's'} from this browser.`;
    return true;
  } catch {
    coordinateMap.length = 0;
    routeSegments.length = 0;
    activePlan = null;
    return false;
  }
}

function resetWorkspaceForMode({ render = true } = {}) {
  if (itemEditor.open) itemEditor.close();
  massPlacementDrag = null;
  boxSelectionDrag = null;
  massMoveInteraction = null;
  massSelectedIds.clear();
  buildInteraction = null;
  placementGhost = null;
  selectedLiveDropperId = null;
  clearPlanner();
  const storage = browserStorage();
  try {
    storage?.removeItem(workspaceStorageKey);
  } catch {
    // The page still works without persistent browser storage.
  }
  if (plannerMode === 'build') {
    activePlan = {
      title: 'Manual build workspace',
      minimumSize: Number(sizeSlider.min),
      items: coordinateMap,
      lanes: routeSegments,
    };
    workflowStage = 2;
    editNotice = 'Build mode · Stage 3 ready. Add items now; validation runs only when you request it.';
    saveWorkspace();
  } else {
    workflowStage = 0;
    editNotice = 'Generation mode · Stage 1 ready for a new generated setup.';
    try {
      storage?.setItem(generationBaselineStorageKey, generationSourceSignature());
    } catch {
      // Generation mode still resets correctly without persistent storage.
    }
  }
  applyPlannerModeUi();
  savePlannerMode();
  if (render) {
    buildModeMessage('Choose an item, move over the grid, then click to place it.', false);
    renderWorkflow();
    renderItemLibrary();
    renderGrid(Number(sizeSlider.value));
  }
}

function setPlannerMode(mode, { reset = true } = {}) {
  if (!['build', 'generation'].includes(mode)) return false;
  plannerMode = mode;
  applyPlannerModeUi();
  savePlannerMode();
  if (reset) resetWorkspaceForMode();
  return true;
}

function completedStageForPlan(plan) {
  if (!plan?.valid) return 2;
  const optimizationComplete = plan.optimization?.complete === true
    || plan.workflow?.optimizationComplete === true;
  const finalVerificationComplete = plan.finalVerification?.complete === true
    || plan.workflow?.finalVerificationComplete === true;
  if (optimizationComplete && finalVerificationComplete) return 5;
  if (optimizationComplete) return 4;
  return 3;
}

function runManualSimulation() {
  if (plannerMode !== 'build') return false;
  if (buildInteraction) cancelBuildInteraction();
  simulateBaseButton.disabled = true;
  simulateBaseButton.textContent = 'Simulatingâ€¦';
  try {
    const result = globalThis.TycoonPlanner.simulateManualBase({
      items: activePlan?.items ?? [],
      conveyors: activePlan?.lanes ?? [],
      database: globalThis.TycoonDatabase,
      plotSize: Number(sizeSlider.value),
      oreCap: 100,
    });
    validation = { ...result, kind: 'manual-simulation' };
    workflowStage = 3;
    editNotice = result.valid
      ? 'Simulation complete. No optimizer or item suggestions were run.'
      : `Simulation complete with ${result.diagnostics.length} issue${result.diagnostics.length === 1 ? '' : 's'}.`;
    renderWorkflow();
    renderGrid(Number(sizeSlider.value));
    return result.valid;
  } finally {
    simulateBaseButton.disabled = false;
    simulateBaseButton.textContent = 'Simulate base';
  }
}

function loadGeneratedPlan(plan) {
  clearPlanner();
  if (!plan?.valid) return false;
  sizeSlider.value = plan.profile.plotSize;
  coordinateMap.push(...plan.items.map((item, index) => mapPlacementCoordinates({
    ...item,
    order: item.order ?? index + 1,
    label: item.label ?? `${item.order ?? index + 1}. ${shortLabel(item.name)}`,
    stats: item.stats ?? {},
  })));
  routeSegments.push(...plan.conveyors.map(mapPlacementCoordinates));
  const metrics = plan.metrics ?? {};
  const optimization = plan.optimization ?? {};
  validation = {
    routeTimeSeconds: optimization.routeTimeSeconds ?? 0,
    averageRemovalTimeSeconds: optimization.routeTimeSeconds ?? 0,
    estimatedOres: metrics.cappedActiveOres ?? 0,
    uncappedEstimatedOres: metrics.projectedActiveOres ?? 0,
    oreCap: 100,
    dropperCount: optimization.dropperQuantity ?? plan.profile.dropper.quantity ?? 1,
    dropRatePerSecond: metrics.dropRate ? metrics.dropRate / Math.max(1, optimization.dropperQuantity ?? plan.profile.dropper.quantity ?? 1) : 0,
    dropperRouteTimes: { A: optimization.routeTimeSeconds ?? 0 },
    finalOreValue: optimization.valueBeforeFurnace ?? 0,
    estimatedFurnaceOresPerMinute: metrics.furnaceEntriesPerMinute ?? 0,
    finalCapgraderName: coordinateMap.filter((item) => item.type === 'capgrader').at(-1)?.name ?? 'N/A',
    finalCapgraderInput: optimization.finalCapInput ?? 0,
    finalCapgraderOutput: optimization.valueBeforeFurnace ?? 0,
    expectedCashPerMinute: metrics.expectedCashPerMinute ?? 0,
    expectedCashPerSecond: metrics.expectedCashPerSecond ?? 0,
    incomeUncertainty: metrics.uncertainty ?? null,
    optimizationComparison: optimization.comparison ?? null,
    rejectionCounts: optimization.rejectionCounts ?? null,
    throughputLimitedByOreCap: metrics.limitedByOreCap ?? false,
    toxicExposureSeconds: 0,
    fireExposureSeconds: 0,
    reservedTiles: coordinateMap.reduce((sum, item) => sum + item.width * item.height, 0)
      + routeSegments.reduce((sum, item) => sum + item.width * item.height, 0),
    remainingTiles: Math.max(0, plan.profile.plotSize ** 2
      - coordinateMap.reduce((sum, item) => sum + item.width * item.height, 0)
      - routeSegments.reduce((sum, item) => sum + item.width * item.height, 0)),
    checks: (plan.diagnostics ?? []).length
      ? plan.diagnostics.map((entry) => `${entry.code}: ${entry.message}`)
      : ['Machine-generated route passed the planner engine validation gate.'],
  };
  activePlan = {
    title: plan.title,
    minimumSize: plan.profile.plotSize,
    items: coordinateMap,
    lanes: routeSegments,
  };
  workflowStage = completedStageForPlan(plan);
  return true;
}
const legendItems = [
  ['dropper', 'Droppers'], ['capgrader', 'Capgraders'], ['upgrader', 'Upgraders'],
  ['portable', 'Portables'], ['furnace', 'Furnace'], ['routing', 'Blue = external conveyor'],
];

function phantomZoneOverlayGroups() {
  if (validation?.kind !== 'manual-simulation') return [];
  const groups = new Map();
  for (const route of validation.routes ?? []) {
    for (const zone of route.phantomZones ?? []) {
      for (const candidate of zone.candidates ?? []) {
        const path = candidate.path;
        if (!path) continue;
        const groupKey = `${path.x},${path.y},${path.width},${path.height}`;
        const group = groups.get(groupKey) ?? { path, entries: [] };
        group.entries.push({ route, zone, candidate });
        groups.set(groupKey, group);
      }
    }
  }
  return [...groups.values()];
}

function renderPhantomZoneOverlays() {
  const groups = phantomZoneOverlayGroups();
  for (const group of groups) {
    const overlay = document.createElement('div');
    overlay.className = 'phantom-zone-overlay';
    overlay.style.left = `calc(${group.path.x - 1} * var(--tile))`;
    overlay.style.top = `calc(${group.path.y - 1} * var(--tile))`;
    overlay.style.width = `calc(${group.path.width} * var(--tile))`;
    overlay.style.height = `calc(${group.path.height} * var(--tile))`;
    overlay.title = group.entries.map(({ route, zone, candidate }) => (
      `Dropper #${route.dropperOrder}: ${(candidate.spawnProbability * 100).toFixed(2)}% spawn chance here (${candidate.startSeconds.toFixed(3)}-${candidate.endSeconds.toFixed(3)}s); ${candidate.expectedActiveZones.toFixed(2)} expected active zones; ${zone.zoneLifetimeSeconds}s lifetime; ${zone.multiplier}x boost.`
    )).join('\n');
    const label = document.createElement('span');
    label.textContent = `PZ ${group.entries.reduce((total, entry) => total + entry.candidate.expectedActiveZones, 0).toFixed(1)}`;
    overlay.append(label);
    grid.append(overlay);
  }
  return groups.length;
}

const conveyorAbbreviations = {
  'Normal Conveyor': 'Con',
  'Supercharged Conveyor': 'Sup',
  'Ultracharged Conveyor': 'Ult',
  'Conveyor Wall': 'Wall',
  'Centering Conveyor': 'Cen',
  'Half Conveyor': 'Hal',
  'Quarter Conveyor': 'Qua',
  'Red Teleporter Sender': 'R Send',
  'Red Teleporter Receiver': 'R Recv',
  'Blue Teleporter Sender': 'B Send',
  'Blue Teleporter Receiver': 'B Recv',
};

function renderGrid(size) {
  renderKeybindGuide();
  updateSavedBaseButton();
  const tiles = size * size;
  grid.replaceChildren();
  grid.style.gridTemplateColumns = `repeat(${size}, var(--tile))`;
  grid.style.gridTemplateRows = `repeat(${size}, var(--tile))`;
  grid.setAttribute('aria-label', `${size} by ${size} base planning grid`);
  columnLabels.replaceChildren();
  rowLabels.replaceChildren();
  columnLabels.style.gridTemplateColumns = `repeat(${size}, var(--tile))`;
  rowLabels.style.gridTemplateRows = `repeat(${size}, var(--tile))`;

  for (let index = 0; index < size; index += 1) {
    const column = document.createElement('span');
    column.className = 'axis-label';
    column.textContent = columnName(index + 1);
    columnLabels.append(column);

    const rowLabel = document.createElement('span');
    rowLabel.className = 'axis-label';
    rowLabel.textContent = index + 1;
    rowLabels.append(rowLabel);
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.row = row;
      tile.dataset.column = column;
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `Row ${row + 1}, column ${column + 1}: empty`);
      grid.append(tile);
    }
  }

  sizeLabel.textContent = `${size} × ${size}`;
  tileCount.textContent = tiles.toLocaleString();
  status.textContent = `Planning canvas · ${tiles.toLocaleString()} tiles available`;
  renderPlan(size);
  renderPlacementGhost();
}

function columnName(number) {
  let label = '';
  let value = number;
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function renderWorkflow() {
  updateSavedBaseButton();
  const listedItems = activePlan?.items ?? coordinateMap;
  const buildSimulationVisible = plannerMode !== 'build' || validation?.kind === 'manual-simulation';
  workflowSteps.replaceChildren(...workflow.map((label, index) => {
    const step = document.createElement('li');
    const isDone = index < workflowStage;
    const isCurrent = index === workflowStage && workflowStage < workflow.length;
    step.className = `workflow-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`;
    step.dataset.status = isDone ? 'complete' : isCurrent ? 'current' : 'pending';
    step.innerHTML = `<span>${isDone ? '✓ ' : ''}${label}</span><small>${isDone ? 'Complete' : isCurrent ? 'In progress' : 'Pending'}</small>`;
    return step;
  }));

  if (workflowStage >= 2 && listedItems.length && buildSimulationVisible) {
    coordinateSummary.hidden = false;
    coordinateSummary.innerHTML = `
      <table>
        <thead><tr><th>Order</th><th>Item</th><th>Variant</th><th>Top-left</th><th>Database W×L</th><th>Path width</th><th>Grid footprint</th><th>Facing</th></tr></thead>
        <tbody>${listedItems.map((item) => `
          <tr>
            <td>${item.order}</td>
            <td>${escapeHtml(baseItemName(item.name))}</td>
            <td>${escapeHtml(item.stats?.Variant ?? item.variant ?? 'Base')}</td>
            <td>(${item.x}, ${item.y})</td>
            <td>${item.itemWidth}×${item.itemLength}</td>
            <td>${item.type === 'furnace'
              ? `${item.processingZoneAcross}×${item.processingZoneDepth} processing zone`
              : item.conveyorWidth}</td>
            <td>${item.width}×${item.height}</td>
            <td>${item.direction}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  if (workflowStage >= 2 && !listedItems.length && workflowProgress && buildSimulationVisible) {
    const summary = workflowProgress.summary ?? {};
    coordinateSummary.hidden = false;
    coordinateSummary.innerHTML = `
      <strong>Coordinate map saved.</strong>
      ${summary.itemCount != null ? ` ${summary.itemCount} items` : ''}
      ${summary.conveyorRunCount != null ? ` · ${summary.conveyorRunCount} conveyor runs` : ''}
      ${summary.plotSize != null ? ` · ${summary.plotSize}×${summary.plotSize} plot` : ''}
      ${summary.routeCount != null ? ` · ${summary.routeCount} dropper routes checked` : ''}
      ${summary.diagnosticCount ? ` · ${summary.diagnosticCount} correction${summary.diagnosticCount === 1 ? '' : 's'} required` : ''}
      ${workflowProgress.validationPending ? ' · Route validation pending' : ''}`;
  }

  if (!buildSimulationVisible || workflowStage < 2 || (workflowStage >= 2 && !listedItems.length && !workflowProgress)) coordinateSummary.hidden = true;
  if (workflowStage < 3 || !validation) validationSummary.hidden = true;

  if (workflowStage >= 3 && validation) {
    validationSummary.hidden = false;
    if (validation.kind === 'manual-simulation') {
      const metrics = validation.metrics;
      validationSummary.className = `validation-summary${validation.valid ? '' : ' is-error'}`;
      validationSummary.innerHTML = `
        <strong>${validation.valid ? 'Simulation complete: every dropper reaches the furnace.' : 'Simulation found base problems.'}</strong>
        <div class="simulation-metrics">
          <div class="simulation-metric"><span>Ore reaches end</span><strong>${validation.routes.filter((route) => route.reachedFurnace).length}/${validation.routes.length} routes</strong></div>
          <div class="simulation-metric"><span>Longest route</span><strong>${metrics.routeTimeSeconds.toFixed(3)} seconds</strong></div>
          <div class="simulation-metric"><span>Active ore</span><strong>${metrics.cappedActiveOres.toFixed(2)} / ${metrics.oreCap}${metrics.limitedByOreCap ? ' (cap limited)' : ''}</strong></div>
          <div class="simulation-metric"><span>Projected without cap</span><strong>${metrics.projectedActiveOres.toFixed(2)} ores</strong></div>
          <div class="simulation-metric"><span>Furnace throughput</span><strong>${metrics.furnaceEntriesPerMinute.toFixed(2)} ores/min</strong></div>
          <div class="simulation-metric"><span>Ore destroyed</span><strong>${metrics.destroyedOresPerMinute.toFixed(2)} ores/min</strong></div>
          <div class="simulation-metric"><span>Survival to furnace</span><strong>${(metrics.survivalToFurnace * 100).toFixed(2)}%</strong></div>
          <div class="simulation-metric"><span>Expected income</span><strong>${abbreviatedRate(metrics.expectedCashPerMinute)}</strong></div>
          <div class="simulation-metric"><span>Space</span><strong>${metrics.reservedTiles} used / ${metrics.remainingTiles} free</strong></div>
        </div>
        ${validation.routes.length ? `<table class="simulation-route-table">
          <thead><tr><th>Dropper</th><th>Reaches furnace</th><th>Teleporter</th><th>Travel time</th><th>Survival</th><th>Destroyed/min</th><th>Value before furnace</th><th>Value after furnace</th></tr></thead>
          <tbody>${validation.routes.map((route) => `<tr>
            <td>${escapeHtml(route.dropper)}</td>
            <td>${route.reachedFurnace ? 'Yes' : 'No'}</td>
            <td>${(route.teleporterJumps ?? []).length ? escapeHtml(route.teleporterJumps.map((jump) => jump.color).join(', ')) : 'None'}</td>
            <td>${route.seconds == null ? 'N/A' : `${route.seconds.toFixed(3)}s`}</td>
            <td>${route.reachedFurnace ? `${((route.survival ?? 0) * 100).toFixed(2)}%` : 'N/A'}</td>
            <td>${route.reachedFurnace ? (route.destroyedOresPerMinute ?? 0).toFixed(2) : 'N/A'}</td>
            <td>${route.valueBeforeFurnace == null ? 'N/A' : simulationMoney(route.valueBeforeFurnace)}</td>
            <td>${route.cashPerOre == null ? 'N/A' : simulationMoney(route.cashPerOre)}</td>
          </tr>`).join('')}</tbody>
        </table>` : ''}
        ${validation.diagnostics.length ? `<ul class="simulation-diagnostics">${validation.diagnostics.map((entry) => `<li><strong>${escapeHtml(entry.code)}:</strong> ${escapeHtml(abbreviateDiagnosticMoney(entry.message))}</li>`).join('')}</ul>` : ''}
        <p>This is a simulation of the current layout only; no replacement items or optimization suggestions were generated.</p>`;
      return;
    }
    validationSummary.className = 'validation-summary';
    validationSummary.innerHTML = `
      <strong>Route validated:</strong> ${validation.routeTimeSeconds}s end-to-end ·
      ${validation.averageRemovalTimeSeconds}s average removal ×
      ${validation.dropperCount * validation.dropRatePerSecond} ores/sec ≈
      ${validation.uncappedEstimatedOres} projected active ·
      ${validation.estimatedOres} active (${validation.oreCap}-ore cap).
      <br><strong>Per dropper:</strong> ${Object.entries(validation.dropperRouteTimes)
        .map(([label, seconds]) => `${label} ${seconds}s`)
        .join(' · ')}
      <br><strong>Final ore:</strong> $${validation.finalOreValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      · <strong>Furnace rate:</strong> ${validation.estimatedFurnaceOresPerMinute.toLocaleString()} ores/min
      <br><strong>Final capgrader (${validation.finalCapgraderName}):</strong> $${validation.finalCapgraderInput.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      → $${validation.finalCapgraderOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      <br><strong>Expected income:</strong> ${abbreviatedRate(validation.expectedCashPerMinute)}
      · ${abbreviatedPerSecond(validation.expectedCashPerSecond)}
      ${validation.incomeUncertainty ? `<br><strong>Simulation range:</strong> ${abbreviatedRate(validation.incomeUncertainty.lowP10)} low / ${abbreviatedRate(validation.incomeUncertainty.medianP50)} median / ${abbreviatedRate(validation.incomeUncertainty.highP90)} high (${validation.incomeUncertainty.runs} seeded runs)` : ''}
      ${validation.optimizationComparison ? `<br><strong>Winner comparison:</strong> ${abbreviatedRate(validation.optimizationComparison.cashPerMinuteGain)} more than the runner-up / ${validation.optimizationComparison.tilesDifference} tile difference / ${validation.optimizationComparison.secondsDifference.toFixed(3)}s route difference` : ''}
      ${validation.rejectionCounts ? `<br><strong>Search pruning:</strong> ${validation.rejectionCounts.useLimit} use-limit / ${validation.rejectionCounts.prerequisite} prerequisite / ${validation.rejectionCounts.areaBudget} space / ${validation.rejectionCounts.dominatedOrBeamPruned} dominated or beam-pruned` : ''}
      ${validation.throughputLimitedByOreCap ? ' · ore-cap limited' : ''}
      · <strong>Space:</strong> ${validation.reservedTiles} reserved / ${validation.remainingTiles} remaining
      <br><strong>Effect safety:</strong> Toxic ${validation.toxicExposureSeconds}s / 5s
      · Fire ${validation.fireExposureSeconds}s / 2s
      <br>${validation.checks.map((check) => `✓ ${check}`).join('<br>')}
      ${workflowStage >= 5 ? '<br>✓ Final calculation and render verification complete.' : ''}`;
  }
}

function findSelectedItem() {
  return activePlan?.items.find((item) => item.id === selectedItemId)
    ?? activePlan?.lanes.find((lane) => lane.id === selectedItemId)
    ?? null;
}

function findPlacementById(id) {
  if (!id) return null;
  return activePlan?.items.find((item) => item.id === id)
    ?? activePlan?.lanes.find((lane) => lane.id === id)
    ?? null;
}

function setHoveredPlacement(placement) {
  hoveredPlacementId = placement?.id ?? null;
}

function clearHoveredPlacement(placement) {
  if (hoveredPlacementId === placement?.id) hoveredPlacementId = null;
}

function isTypingTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function startMovingHoveredPlacement() {
  if (plannerMode !== 'build' || buildInteraction || massMoveInteraction || itemEditor.open || massSelectionDialog.open) return false;
  const placement = findPlacementById(hoveredPlacementId);
  if (!placement) return false;
  hoveredPlacementId = null;
  hideItemTooltip();
  startMovingPlacement(placement);
  return true;
}

function buildRecordForPlacement(placement) {
  if (isConveyorPlacement(placement)) {
    return conveyorCatalog.find((record) => record.name === placement.conveyor) ?? null;
  }
  return databaseRecordForItem(placement);
}

function startCopyingHoveredPlacement() {
  if (plannerMode !== 'build' || buildInteraction || massMoveInteraction || itemEditor.open || massSelectionDialog.open) return false;
  const placement = findPlacementById(hoveredPlacementId);
  const record = buildRecordForPlacement(placement);
  if (!placement || !record) return false;
  hoveredPlacementId = null;
  hideItemTooltip();
  startPlacingRecord(record, placement.direction);
  return true;
}

function removeHoveredPlacement() {
  if (plannerMode !== 'build' || buildInteraction || massMoveInteraction || itemEditor.open || massSelectionDialog.open) return false;
  const placement = findPlacementById(hoveredPlacementId);
  if (!placement) return false;
  return removePlacement(placement);
}

function isConveyorPlacement(placement) {
  return Boolean(placement?.conveyor);
}

function selectionRectangle(anchor, current) {
  return {
    x: Math.min(anchor.x, current.x),
    y: Math.min(anchor.y, current.y),
    width: Math.abs(current.x - anchor.x) + 1,
    height: Math.abs(current.y - anchor.y) + 1,
  };
}

function placementIntersectsRectangle(placement, rectangle) {
  return placement.x < rectangle.x + rectangle.width
    && placement.x + placement.width > rectangle.x
    && placement.y < rectangle.y + rectangle.height
    && placement.y + placement.height > rectangle.y;
}

function selectedMassPlacements() {
  return [...(activePlan?.items ?? []), ...(activePlan?.lanes ?? [])]
    .filter((placement) => massSelectedIds.has(placement.id));
}

function massSelectionBounds(placements) {
  if (!placements.length) return null;
  const x = Math.min(...placements.map((placement) => placement.x));
  const y = Math.min(...placements.map((placement) => placement.y));
  const right = Math.max(...placements.map((placement) => placement.x + placement.width));
  const bottom = Math.max(...placements.map((placement) => placement.y + placement.height));
  return { x, y, width: right - x, height: bottom - y };
}

function renderMassSelectionEmphasis() {
  grid.querySelector('.mass-selection-bounds')?.remove();
  const placements = selectedMassPlacements();
  const bounds = massSelectionBounds(placements);
  grid.classList.toggle('has-mass-selection', Boolean(bounds && !massMoveInteraction));
  if (!bounds || massMoveInteraction) return;
  const outline = document.createElement('div');
  outline.className = 'mass-selection-bounds';
  outline.style.left = `calc(${bounds.x - 1} * var(--tile))`;
  outline.style.top = `calc(${bounds.y - 1} * var(--tile))`;
  outline.style.width = `calc(${bounds.width} * var(--tile))`;
  outline.style.height = `calc(${bounds.height} * var(--tile))`;
  const label = document.createElement('span');
  label.textContent = `${placements.length} SELECTED · ROTATES TOGETHER`;
  outline.append(label);
  grid.append(outline);
}

function clearMassSelection({ render = true } = {}) {
  massSelectedIds.clear();
  boxSelectionDrag = null;
  if (massSelectionDialog.open) massSelectionDialog.close();
  if (render) renderGrid(Number(sizeSlider.value));
}

function updateMassSelectionDialog() {
  const placements = selectedMassPlacements();
  const itemCount = placements.filter((placement) => !isConveyorPlacement(placement)).length;
  const conveyorCount = placements.length - itemCount;
  massSelectionTitle.textContent = `${placements.length} placement${placements.length === 1 ? '' : 's'} selected`;
  const names = placements.slice(0, 8).map((placement, index) => `${index + 1}. ${escapeHtml(placement.name ?? placement.conveyor)}`).join('<br>');
  massSelectionDetails.innerHTML = `<strong>Highlighted items rotate together</strong><p>${itemCount} item${itemCount === 1 ? '' : 's'} · ${conveyorCount} conveyor${conveyorCount === 1 ? '' : 's'}</p><p>${names}${placements.length > 8 ? `<br>+${placements.length - 8} more` : ''}</p><p>The large gold arrow on each selected placement shows its current facing and updates after every rotation.</p>`;
  massSelectionError.hidden = true;
  if (massSelectionDialog.open) positionMassSelectionDialog();
}

function positionMassSelectionDialog() {
  const bounds = massSelectionBounds(selectedMassPlacements());
  if (!bounds || !massSelectionDialog.open) return;
  const gridRectangle = grid.getBoundingClientRect();
  const tileSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || baseTileSize;
  const selectionCenterX = gridRectangle.left + (bounds.x - 1 + bounds.width / 2) * tileSize;
  const panelWidth = massSelectionDialog.offsetWidth || 360;
  const dockLeft = selectionCenterX >= window.innerWidth / 2;
  massSelectionDialog.style.left = `${dockLeft ? 16 : Math.max(16, window.innerWidth - panelWidth - 16)}px`;
  massSelectionDialog.style.top = '16px';
}

function openMassSelectionDialog() {
  if (!massSelectedIds.size) return;
  updateMassSelectionDialog();
  if (!massSelectionDialog.open) massSelectionDialog.show();
  positionMassSelectionDialog();
  renderKeybindGuide();
}

function validateMassPlacementGroup(candidates) {
  try {
    const selectedIds = new Set(candidates.map((candidate) => candidate.id));
    const items = activePlan.items
      .filter((item) => !selectedIds.has(item.id))
      .concat(candidates.filter((candidate) => !isConveyorPlacement(candidate)));
    const lanes = activePlan.lanes
      .filter((lane) => !selectedIds.has(lane.id))
      .concat(candidates.filter(isConveyorPlacement));
    validateCoordinateMap(items, Number(sizeSlider.value));
    validateRouteSegments(lanes, items, Number(sizeSlider.value), { allowUncompressedQuarterConveyors: true });
    return { valid: true, error: '' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function rotateMassSelection() {
  const originals = selectedMassPlacements();
  const candidates = originals.map((placement) => {
    const direction = rotateDirection(placement.direction, 'right');
    return isConveyorPlacement(placement)
      ? updateConveyorGeometry(placement, { direction })
      : updateItemGeometry(placement, { direction });
  });
  const result = validateMassPlacementGroup(candidates);
  if (!result.valid) {
    massSelectionError.textContent = result.error;
    massSelectionError.hidden = false;
    return;
  }
  candidates.forEach(replaceMappedItem);
  validation = null;
  workflowStage = Math.min(workflowStage, 2);
  editNotice = `${candidates.length} selected placement${candidates.length === 1 ? '' : 's'} rotated clockwise; route validation is required.`;
  saveWorkspace();
  renderWorkflow();
  renderGrid(Number(sizeSlider.value));
  updateMassSelectionDialog();
}

function deleteMassSelection() {
  const count = massSelectedIds.size;
  const removeSelected = (list) => {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (massSelectedIds.has(list[index].id)) list.splice(index, 1);
    }
  };
  removeSelected(activePlan.items);
  removeSelected(activePlan.lanes);
  if (coordinateMap !== activePlan.items) removeSelected(coordinateMap);
  if (routeSegments !== activePlan.lanes) removeSelected(routeSegments);
  activePlan.items.forEach((item, index) => { item.order = index + 1; });
  massSelectionDialog.close();
  massSelectedIds.clear();
  validation = null;
  workflowStage = Math.min(workflowStage, 2);
  editNotice = `${count} selected placement${count === 1 ? '' : 's'} removed; route validation is required.`;
  saveWorkspace();
  renderWorkflow();
  renderGrid(Number(sizeSlider.value));
}

function startMassMove() {
  const originals = selectedMassPlacements().map((placement) => ({ ...placement }));
  if (!originals.length) return;
  const bounds = {
    x: Math.min(...originals.map((placement) => placement.x)),
    y: Math.min(...originals.map((placement) => placement.y)),
  };
  massMoveInteraction = { originals, bounds, candidates: originals, valid: true, error: '' };
  massSelectionDialog.close();
  hideItemTooltip();
  buildModeMessage(`Moving ${originals.length} selected placements. Move the mouse and click to place; Esc cancels.`);
  renderGrid(Number(sizeSlider.value));
  renderMassMoveGhosts();
}

function placeTooltip(event, element) {
  const offset = 14;
  const width = itemTooltip.offsetWidth || 320;
  const height = itemTooltip.offsetHeight || 180;
  const fallback = element.getBoundingClientRect();
  const pointerX = event?.clientX ?? fallback.right;
  const pointerY = event?.clientY ?? fallback.top;
  itemTooltip.style.left = `${Math.max(8, Math.min(pointerX + offset, window.innerWidth - width - 8))}px`;
  itemTooltip.style.top = `${Math.max(8, Math.min(pointerY + offset, window.innerHeight - height - 8))}px`;
}

function showItemTooltip(item, event, element) {
  if (buildInteraction || massMoveInteraction) {
    hideItemTooltip();
    return;
  }
  if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
  itemTooltip.innerHTML = itemDetailsHtml(item);
  itemTooltip.hidden = false;
  placeTooltip(event, element);
}

function hideItemTooltip() {
  if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
  tooltipHideTimer = null;
  itemTooltip.hidden = true;
}

function scheduleItemTooltipHide() {
  if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
  tooltipHideTimer = setTimeout(hideItemTooltip, 180);
}

itemTooltip.addEventListener('pointerenter', () => {
  if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
  tooltipHideTimer = null;
});
itemTooltip.addEventListener('pointerleave', hideItemTooltip);

function openItemEditor(item) {
  selectedItemId = item.id;
  hideItemTooltip();
  itemEditorTitle.textContent = item.name ?? item.conveyor;
  itemEditorDetails.innerHTML = isConveyorPlacement(item) ? conveyorDetailsHtml(item) : itemDetailsHtml(item);
  moveCoordinate.value = `${columnName(item.x)}${item.y}`;
  itemEditorError.hidden = true;
  itemEditorError.textContent = '';
  itemEditor.showModal();
}

function replaceMappedItem(updatedItem) {
  const mappedItem = mapPlacementCoordinates(updatedItem);
  if (isConveyorPlacement(mappedItem)) {
    const laneIndex = activePlan.lanes.findIndex((lane) => lane.id === mappedItem.id);
    activePlan.lanes.splice(laneIndex, 1, mappedItem);
    const routeIndex = routeSegments.findIndex((lane) => lane.id === mappedItem.id);
    if (routeIndex !== -1 && routeSegments !== activePlan.lanes) routeSegments.splice(routeIndex, 1, mappedItem);
    return mappedItem;
  }
  const planIndex = activePlan.items.findIndex((item) => item.id === mappedItem.id);
  activePlan.items.splice(planIndex, 1, mappedItem);

  const mapIndex = coordinateMap.findIndex((item) => item.id === mappedItem.id);
  if (mapIndex !== -1 && coordinateMap !== activePlan.items) {
    coordinateMap.splice(mapIndex, 1, mappedItem);
  }
  return mappedItem;
}

function placeOnGrid(placement) {
  const mappedPlacement = mapPlacementCoordinates(placement);
  if (isConveyorPlacement(mappedPlacement)) {
    activePlan.lanes.push(mappedPlacement);
    if (routeSegments !== activePlan.lanes) routeSegments.push(mappedPlacement);
  } else {
    activePlan.items.push(mappedPlacement);
    if (coordinateMap !== activePlan.items) coordinateMap.push(mappedPlacement);
    activePlan.items.forEach((item, index) => { item.order = index + 1; });
    coordinateMap.forEach((item, index) => { item.order = index + 1; });
  }
  return mappedPlacement;
}

function validateItemEdit(updatedItem) {
  if (isConveyorPlacement(updatedItem)) {
    const candidates = activePlan.lanes.map((lane) => (
      lane.id === updatedItem.id ? updatedItem : lane
    ));
    validateCoordinateMap(activePlan.items, Number(sizeSlider.value));
    validateRouteSegments(candidates, activePlan.items, Number(sizeSlider.value), { allowUncompressedQuarterConveyors: true });
    return;
  }
  const candidates = activePlan.items.map((item) => (
    item.id === updatedItem.id ? updatedItem : item
  ));
  const size = Number(sizeSlider.value);
  validateCoordinateMap(candidates, size);
  validateRouteSegments(activePlan.lanes ?? routeSegments, candidates, size, { allowUncompressedQuarterConveyors: true });
}

function refreshAfterEdit(message) {
  validation = null;
  workflowStage = Math.min(workflowStage, 2);
  editNotice = message;
  saveWorkspace();
  renderWorkflow();
  renderGrid(Number(sizeSlider.value));
}

function submitItemMove() {
  const item = findSelectedItem();
  if (!item) return;
  itemEditor.close();
  startMovingPlacement(item);
}

function submitTypedItemMove() {
  const item = findSelectedItem();
  if (!item) return;
  try {
    const coordinate = parseCoordinate(moveCoordinate.value);
    const updatedItem = isConveyorPlacement(item) ? { ...item, ...coordinate } : updateItemGeometry(item, coordinate);
    validateItemEdit(updatedItem);
    replaceMappedItem(updatedItem);
    itemEditor.close();
    refreshAfterEdit(`${item.name ?? item.conveyor} moved to ${columnName(coordinate.x)}${coordinate.y}; route validation is required.`);
  } catch (error) {
    itemEditorError.textContent = error.message;
    itemEditorError.hidden = false;
  }
}

function rotateSelectedItem(turn) {
  const item = findSelectedItem();
  if (!item) return;
  try {
    const direction = rotateDirection(item.direction, turn);
    const updatedItem = isConveyorPlacement(item)
      ? updateConveyorGeometry(item, { direction })
      : updateItemGeometry(item, { direction });
    validateItemEdit(updatedItem);
    replaceMappedItem(updatedItem);
    itemEditor.close();
    refreshAfterEdit(`${item.name ?? item.conveyor} rotated ${turn} to face ${direction}; route validation is required.`);
  } catch (error) {
    itemEditorError.textContent = error.message;
    itemEditorError.hidden = false;
  }
}

function removePlacement(item) {
  if (!item) return false;
  if (isConveyorPlacement(item)) {
    activePlan.lanes = activePlan.lanes.filter((candidate) => candidate.id !== item.id);
    const routeIndex = routeSegments.findIndex((candidate) => candidate.id === item.id);
    if (routeIndex !== -1 && routeSegments !== activePlan.lanes) routeSegments.splice(routeIndex, 1);
  } else {
    activePlan.items = activePlan.items.filter((candidate) => candidate.id !== item.id);
  }
  if (!isConveyorPlacement(item) && coordinateMap !== activePlan.items) {
    const mapIndex = coordinateMap.findIndex((candidate) => candidate.id === item.id);
    if (mapIndex !== -1) coordinateMap.splice(mapIndex, 1);
  }
  if (!isConveyorPlacement(item)) {
    activePlan.items.forEach((candidate, index) => { candidate.order = index + 1; });
    coordinateMap.forEach((candidate, index) => { candidate.order = index + 1; });
  }
  if (itemEditor.open) itemEditor.close();
  if (selectedItemId === item.id) selectedItemId = null;
  if (hoveredPlacementId === item.id) hoveredPlacementId = null;
  hideItemTooltip();
  refreshAfterEdit(`${item.name ?? item.conveyor} removed; route validation is required.`);
  return true;
}

function removeSelectedItem() {
  return removePlacement(findSelectedItem());
}

function ensureEditablePlan() {
  if (activePlan) return;
  coordinateMap.length = 0;
  routeSegments.length = 0;
  activePlan = {
    title: 'Benchmark workspace',
    minimumSize: Number(sizeSlider.min),
    items: coordinateMap,
    lanes: routeSegments,
  };
  workflowStage = Math.max(workflowStage, 2);
  stagePreviewSummary.hidden = true;
}

function databaseRecordForItem(item) {
  const variant = item?.stats?.Variant ?? item?.variant ?? 'Base';
  const key = `${item?.name ?? ''}::${variant}`.toLowerCase();
  const candidates = (globalThis.TycoonDatabase?.records ?? [])
    .filter((record) => record.key === key);
  return uniqueDatabaseRecords(candidates)[0] ?? null;
}

function recordDescription(record) {
  const placeholder = /refer to (?:the )?["“]?stats for nerds/i;
  const mechanic = record?.description
    ?? (record?.effects && record.effects !== 'N/A' && !placeholder.test(record.effects)
      ? record.effects
      : '');
  return [mechanic, record?.source ?? '']
    .filter(Boolean)
    .join(' · ') || 'No mechanic description is available in the database.';
}

function displayItemDescription(item) {
  const placeholder = /refer to (?:the )?["“]?stats for nerds/i;
  if (item?.description && !placeholder.test(item.description)) return item.description;
  const record = databaseRecordForItem(item);
  return record ? recordDescription(record) : 'No mechanic description is available in the database.';
}

function refreshPlacementMetadata(item) {
  const record = databaseRecordForItem(item);
  const stats = { ...(item?.stats ?? {}), ...(record ? recordStats(record) : {}) };
  const transport = internalTransportProfile(item.name, item.itemWidth, item.type);
  delete stats.Effects;
  delete stats.Description;
  return {
    ...item,
    description: record ? recordDescription(record) : displayItemDescription(item),
    stats,
    conveyorWidth: transport?.across ?? 0,
    conveyorOffset: transport?.northOffset ?? 0,
  };
}

function recordStats(record) {
  return {
    Variant: displayVariant(record),
    Rarity: record.rarity ?? 'Unknown',
    ...(record.mainStat != null ? { 'Main stat': record.mainStat } : {}),
    ...(record.range ? { Range: record.range } : {}),
    ...(record.conveyorSpeed != null ? { 'Conveyor speed': record.conveyorSpeed } : {}),
    ...(record.dropSpeed != null ? { 'Drop speed': record.dropSpeed } : {}),
    ...(record.oreSize != null ? { 'Ore size': record.oreSize } : {}),
  };
}

function placementFromRecord(record, x = 1, y = 1, direction = 'east') {
  if (record.type === 'conveyor') {
    return updateConveyorGeometry({
      id: `manual-conveyor-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: record.name,
      conveyor: record.name,
      x,
      y,
      itemWidth: record.size.width,
      itemLength: record.size.length,
      width: record.size.length,
      height: record.size.width,
      direction,
      speed: record.speed,
      wall: record.wall ?? false,
      nonTransport: record.nonTransport ?? false,
      teleporterColor: record.teleporterColor ?? null,
      teleporterRole: record.teleporterRole ?? null,
    });
  }
  const type = databaseRenderType(record);
  return placeItem(
    (activePlan?.items.length ?? 0) + 1,
    record.name,
    x,
    y,
    record.size.width,
    record.size.length,
    direction,
    type,
    {
      id: `manual-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      description: recordDescription(record),
      stats: recordStats(record),
    },
  );
}

function buildModeMessage(message, active = true) {
  buildModeHint.textContent = message;
  buildModeHint.classList.toggle('is-active', active);
  grid.classList.toggle('is-building', active);
}

function renderKeybindGuide() {
  if (!keybindGuide) return;
  if (plannerMode !== 'build') {
    keybindGuide.hidden = true;
    return;
  }
  keybindGuide.hidden = false;
  keybindGuide.classList?.toggle('is-active', Boolean(buildInteraction || massMoveInteraction));
  if (massMoveInteraction) {
    keybindGuide.innerHTML = `
      <h2>Moving selection</h2>
      <div class="keybind-row"><kbd>Click</kbd><span>Place group</span></div>
      <div class="keybind-row"><kbd>Esc</kbd><span>Cancel</span></div>`;
    return;
  }
  if (massSelectionDialog.open && massSelectedIds.size) {
    keybindGuide.innerHTML = `
      <h2>Group selection</h2>
      <div class="keybind-row"><kbd>R</kbd><span>Rotate all 90Â°</span></div>
      <div class="keybind-row"><kbd>M</kbd><span>Move selection</span></div>
      <div class="keybind-row"><kbd>Backspace / Del</kbd><span>Delete selection</span></div>
      <div class="keybind-row"><kbd>Esc</kbd><span>Cancel selection</span></div>`;
    return;
  }
  if (buildInteraction) {
    const action = buildInteraction.mode === 'move' ? 'Moving an item' : 'Placing an item';
    keybindGuide.innerHTML = `
      <h2>${action}</h2>
      <div class="keybind-row"><kbd>R</kbd><span>Rotate 90°</span></div>
      ${buildInteraction.mode === 'place' ? '<div class="keybind-row"><kbd>Hold click</kbd><span>Place straight line</span></div>' : ''}
      <div class="keybind-row"><kbd>Esc</kbd><span>Cancel</span></div>`;
    return;
  }
  keybindGuide.innerHTML = `
    <h2>Hover shortcuts</h2>
    <p>Drag empty build space to box-select items, or point at one and press:</p>
    <div class="keybind-row"><kbd>Drag</kbd><span>Box select</span></div>
    <div class="keybind-row"><kbd>M</kbd><span>Move</span></div>
    <div class="keybind-row"><kbd>C</kbd><span>Copy</span></div>
    <div class="keybind-row"><kbd>Backspace / Del</kbd><span>Delete</span></div>`;
}

function startPlacingRecord(record, direction = 'east') {
  ensureEditablePlan();
  massPlacementDrag = null;
  buildInteraction = {
    mode: 'place',
    record,
    candidate: placementFromRecord(record, 1, 1, direction),
    sourceId: null,
    valid: false,
    error: 'Move over the grid to choose a location.',
  };
  buildModeMessage(`Placing ${displayVariant(record)} ${record.name}. Click once to place, or hold left click and drag for a straight line; R rotates clockwise; Esc cancels.`);
  renderItemLibrary();
  renderGrid(Number(sizeSlider.value));
}

function startMovingPlacement(placement) {
  massPlacementDrag = null;
  hideItemTooltip();
  buildInteraction = {
    mode: 'move',
    record: null,
    candidate: { ...placement },
    sourceId: placement.id,
    valid: false,
    error: 'Move over the grid to choose a location.',
  };
  candidateAt(placement.x, placement.y);
  buildModeMessage(`Moving ${placement.name ?? placement.conveyor}. Click a green preview to place; R rotates clockwise; Esc cancels.`);
  renderGrid(Number(sizeSlider.value));
}

function rotateActivePlacementClockwise() {
  if (!buildInteraction) return false;
  const candidate = buildInteraction.candidate;
  const direction = rotateDirection(candidate.direction, 'right');
  buildInteraction.candidate = isConveyorPlacement(candidate)
    ? updateConveyorGeometry(candidate, { direction })
    : updateItemGeometry(candidate, { direction });
  candidateAt(buildInteraction.candidate.x, buildInteraction.candidate.y);
  renderPlacementGhost();
  const label = candidate.name ?? candidate.conveyor;
  const action = buildInteraction.mode === 'move' ? 'Moving' : 'Placing';
  buildModeMessage(
    buildInteraction.valid
      ? `${action} ${label}, facing ${direction}. Click to place; R rotates clockwise; Esc cancels.`
      : `${label} now faces ${direction}, but this position is blocked. Move to a green position.`,
  );
  return true;
}

function cancelBuildInteraction(message = 'Choose an item, move over the grid, then click to place it.') {
  massPlacementDrag = null;
  buildInteraction = null;
  placementGhost = null;
  buildModeMessage(message, false);
  renderItemLibrary();
  renderGrid(Number(sizeSlider.value));
}

function candidateAt(x, y) {
  if (!buildInteraction) return null;
  const candidate = isConveyorPlacement(buildInteraction.candidate)
    ? updateConveyorGeometry(buildInteraction.candidate, { x, y })
    : updateItemGeometry(buildInteraction.candidate, { x, y });
  const result = validateBuildCandidate(candidate);
  buildInteraction.valid = result.valid;
  buildInteraction.error = result.error;
  buildInteraction.candidate = candidate;
  return candidate;
}

function validateBuildCandidate(candidate, stagedCandidates = []) {
  try {
    if (isConveyorPlacement(candidate)) {
      const lanes = activePlan.lanes
        .filter((lane) => lane.id !== buildInteraction.sourceId)
        .concat(stagedCandidates.filter(isConveyorPlacement), candidate);
      validateRouteSegments(lanes, activePlan.items, Number(sizeSlider.value), { allowUncompressedQuarterConveyors: true });
    } else {
      const items = activePlan.items
        .filter((item) => item.id !== buildInteraction.sourceId)
        .concat(stagedCandidates.filter((item) => !isConveyorPlacement(item)), candidate);
      validateCoordinateMap(items, Number(sizeSlider.value));
      validateRouteSegments(activePlan.lanes, items, Number(sizeSlider.value), { allowUncompressedQuarterConveyors: true });
    }
    return { valid: true, error: '' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function axisLockedLineCoordinates(anchor, current, footprint, lockedAxis = null) {
  const deltaX = current.x - anchor.x;
  const deltaY = current.y - anchor.y;
  const axis = lockedAxis ?? ((deltaX || deltaY) ? (Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical') : null);
  if (!axis) return { axis: null, coordinates: [{ ...anchor }] };
  const delta = axis === 'horizontal' ? deltaX : deltaY;
  const step = Math.max(1, axis === 'horizontal' ? footprint.width : footprint.height);
  const direction = delta < 0 ? -1 : 1;
  const count = Math.floor(Math.abs(delta) / step);
  const coordinates = Array.from({ length: count + 1 }, (_, index) => ({
    x: anchor.x + (axis === 'horizontal' ? index * step * direction : 0),
    y: anchor.y + (axis === 'vertical' ? index * step * direction : 0),
  }));
  return { axis, coordinates };
}

function gridCoordinateFromPointer(event) {
  const rectangle = grid.getBoundingClientRect();
  const tileSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile')) || baseTileSize;
  return {
    x: Math.floor((event.clientX - rectangle.left) / tileSize) + 1,
    y: Math.floor((event.clientY - rectangle.top) / tileSize) + 1,
  };
}

function placementContainsCoordinate(placement, coordinate) {
  return coordinate.x >= placement.x
    && coordinate.y >= placement.y
    && coordinate.x < placement.x + placement.width
    && coordinate.y < placement.y + placement.height;
}

function clampedGridCoordinateFromPointer(event) {
  const coordinate = gridCoordinateFromPointer(event);
  const size = Number(sizeSlider.value);
  return {
    x: Math.max(1, Math.min(size, coordinate.x)),
    y: Math.max(1, Math.min(size, coordinate.y)),
  };
}

function renderBoxSelectionOverlay() {
  grid.querySelector('.box-selection-overlay')?.remove();
  if (!boxSelectionDrag?.active) return;
  const rectangle = selectionRectangle(boxSelectionDrag.anchor, boxSelectionDrag.current);
  const overlay = document.createElement('div');
  overlay.className = 'box-selection-overlay';
  overlay.style.left = `calc(${rectangle.x - 1} * var(--tile))`;
  overlay.style.top = `calc(${rectangle.y - 1} * var(--tile))`;
  overlay.style.width = `calc(${rectangle.width} * var(--tile))`;
  overlay.style.height = `calc(${rectangle.height} * var(--tile))`;
  grid.append(overlay);
}

function startBoxSelectionDrag(event) {
  if (event.button !== 0 || plannerMode !== 'build' || buildInteraction || massMoveInteraction || itemEditor.open || massSelectionDialog.open) return;
  const coordinate = clampedGridCoordinateFromPointer(event);
  boxSelectionDrag = {
    pointerId: event.pointerId,
    anchor: coordinate,
    current: coordinate,
    startClientX: event.clientX,
    startClientY: event.clientY,
    active: false,
  };
  grid.setPointerCapture?.(event.pointerId);
}

function updateBoxSelectionDrag(event) {
  if (!boxSelectionDrag || event.pointerId !== boxSelectionDrag.pointerId) return false;
  boxSelectionDrag.current = clampedGridCoordinateFromPointer(event);
  const movedPixels = Math.hypot(event.clientX - boxSelectionDrag.startClientX, event.clientY - boxSelectionDrag.startClientY);
  if (movedPixels >= 5) boxSelectionDrag.active = true;
  if (boxSelectionDrag.active) {
    event.preventDefault();
    renderBoxSelectionOverlay();
  }
  return true;
}

function finishBoxSelectionDrag(event) {
  if (!boxSelectionDrag || event.pointerId !== boxSelectionDrag.pointerId) return;
  updateBoxSelectionDrag(event);
  grid.releasePointerCapture?.(event.pointerId);
  const drag = boxSelectionDrag;
  boxSelectionDrag = null;
  grid.querySelector('.box-selection-overlay')?.remove();
  if (!drag.active) return;
  const rectangle = selectionRectangle(drag.anchor, drag.current);
  massSelectedIds.clear();
  for (const placement of [...activePlan.items, ...activePlan.lanes]) {
    if (placementIntersectsRectangle(placement, rectangle)) massSelectedIds.add(placement.id);
  }
  suppressGridClick = true;
  setTimeout(() => { suppressGridClick = false; }, 0);
  renderGrid(Number(sizeSlider.value));
  if (massSelectedIds.size) openMassSelectionDialog();
  else buildModeMessage('No items were inside that selection box.', false);
}

function cancelBoxSelectionDrag(event) {
  if (!boxSelectionDrag || (event?.pointerId != null && event.pointerId !== boxSelectionDrag.pointerId)) return;
  boxSelectionDrag = null;
  grid.querySelector('.box-selection-overlay')?.remove();
}

function updateMassMovePreview(event) {
  if (!massMoveInteraction) return;
  const coordinate = clampedGridCoordinateFromPointer(event);
  const deltaX = coordinate.x - massMoveInteraction.bounds.x;
  const deltaY = coordinate.y - massMoveInteraction.bounds.y;
  const candidates = massMoveInteraction.originals.map((placement) => (
    isConveyorPlacement(placement)
      ? updateConveyorGeometry(placement, { x: placement.x + deltaX, y: placement.y + deltaY })
      : updateItemGeometry(placement, { x: placement.x + deltaX, y: placement.y + deltaY })
  ));
  const result = validateMassPlacementGroup(candidates);
  massMoveInteraction.candidates = candidates;
  massMoveInteraction.valid = result.valid;
  massMoveInteraction.error = result.error;
  renderMassMoveGhosts();
  buildModeMessage(result.valid
    ? `Moving ${candidates.length} placements. Click to place the group; Esc cancels.`
    : result.error);
}

function renderMassMoveGhosts() {
  grid.querySelectorAll('.selection-move-ghost').forEach((ghost) => ghost.remove());
  if (!massMoveInteraction) return;
  for (const candidate of massMoveInteraction.candidates) {
    const ghost = document.createElement('div');
    ghost.className = `placement-ghost selection-move-ghost${massMoveInteraction.valid ? '' : ' is-invalid'}`;
    ghost.style.left = `calc(${candidate.x - 1} * var(--tile))`;
    ghost.style.top = `calc(${candidate.y - 1} * var(--tile))`;
    ghost.style.width = `calc(${candidate.width} * var(--tile))`;
    ghost.style.height = `calc(${candidate.height} * var(--tile))`;
    const label = document.createElement('span');
    label.className = 'placement-ghost-label';
    label.textContent = shortLabel(candidate.name ?? candidate.conveyor);
    ghost.append(label);
    grid.append(ghost);
  }
}

function commitMassMove(event) {
  if (!massMoveInteraction) return false;
  updateMassMovePreview(event);
  if (!massMoveInteraction.valid) return true;
  const candidates = massMoveInteraction.candidates;
  candidates.forEach(replaceMappedItem);
  massMoveInteraction = null;
  massSelectedIds.clear();
  validation = null;
  workflowStage = Math.min(workflowStage, 2);
  editNotice = `${candidates.length} selected placement${candidates.length === 1 ? '' : 's'} moved together; route validation is required.`;
  saveWorkspace();
  renderWorkflow();
  renderGrid(Number(sizeSlider.value));
  buildModeMessage(editNotice, false);
  return true;
}

function cancelMassMove() {
  if (!massMoveInteraction) return false;
  massMoveInteraction = null;
  massSelectedIds.clear();
  buildModeMessage('Group move cancelled.', false);
  renderGrid(Number(sizeSlider.value));
  return true;
}

function renderPlacementGhost() {
  grid.querySelectorAll('.placement-ghost').forEach((ghost) => ghost.remove());
  placementGhost = null;
  if (!buildInteraction?.candidate) return;
  const candidate = buildInteraction.candidate;
  const element = document.createElement('div');
  const conveyorClass = candidate.conveyor
    ? ` ${candidate.conveyor.toLowerCase().replaceAll(' ', '-')}`
    : '';
  element.className = `placement-ghost${conveyorClass} direction-${candidate.direction}${buildInteraction.valid ? '' : ' is-invalid'}`;
  element.style.left = `calc(${candidate.x - 1} * var(--tile))`;
  element.style.top = `calc(${candidate.y - 1} * var(--tile))`;
  element.style.width = `calc(${candidate.width} * var(--tile))`;
  element.style.height = `calc(${candidate.height} * var(--tile))`;
  if (candidate.type === 'furnace') {
    const processingZone = furnaceProcessingZoneGeometry(candidate);
    if (processingZone) {
      const zone = document.createElement('span');
      zone.className = 'furnace-processing-zone placement-ghost-zone';
      zone.style.left = `calc(${processingZone.x - candidate.x} * var(--tile))`;
      zone.style.top = `calc(${processingZone.y - candidate.y} * var(--tile))`;
      zone.style.width = `calc(${processingZone.width} * var(--tile))`;
      zone.style.height = `calc(${processingZone.height} * var(--tile))`;
      element.append(zone);
    }
  } else if (!candidate.conveyor && candidate.type !== 'portable' && candidate.type !== 'dropper') {
    const belt = document.createElement('span');
    belt.className = 'item-belt placement-ghost-belt';
    const transport = itemTransportGeometry(candidate);
    if (transport) {
      belt.style.left = `calc(${transport.x - candidate.x} * var(--tile))`;
      belt.style.top = `calc(${transport.y - candidate.y} * var(--tile))`;
      belt.style.width = `calc(${transport.width} * var(--tile))`;
      belt.style.height = `calc(${transport.height} * var(--tile))`;
    }
    element.append(belt);
  }
  const label = document.createElement('span');
  label.className = 'placement-ghost-label';
  label.textContent = shortLabel(candidate.name ?? candidate.conveyor);
  const arrow = document.createElement('span');
  arrow.className = 'plan-direction placement-ghost-direction';
  arrow.textContent = { north: '↑', east: '→', south: '↓', west: '←' }[candidate.direction] ?? '';
  arrow.setAttribute('aria-label', `Facing ${candidate.direction}`);
  element.append(label, arrow);
  element.setAttribute('aria-label', `${candidate.name ?? candidate.conveyor}, facing ${candidate.direction}`);
  element.title = buildInteraction.error || `Place at ${columnName(candidate.x)}${candidate.y}`;
  grid.append(element);
  placementGhost = element;
}

function renderMassPlacementGhosts() {
  grid.querySelectorAll('.placement-ghost').forEach((ghost) => ghost.remove());
  placementGhost = null;
  for (const preview of massPlacementDrag?.previews ?? []) {
    const candidate = preview.candidate;
    const element = document.createElement('div');
    const conveyorClass = candidate.conveyor
      ? ` ${candidate.conveyor.toLowerCase().replaceAll(' ', '-')}`
      : '';
    element.className = `placement-ghost placement-line-ghost${conveyorClass} direction-${candidate.direction}${preview.valid ? '' : ' is-invalid'}`;
    element.style.left = `calc(${candidate.x - 1} * var(--tile))`;
    element.style.top = `calc(${candidate.y - 1} * var(--tile))`;
    element.style.width = `calc(${candidate.width} * var(--tile))`;
    element.style.height = `calc(${candidate.height} * var(--tile))`;
    element.title = preview.error || `Place at ${columnName(candidate.x)}${candidate.y}`;
    const label = document.createElement('span');
    label.className = 'placement-ghost-label';
    label.textContent = shortLabel(candidate.name ?? candidate.conveyor);
    element.append(label);
    grid.append(element);
  }
}

function updateMassPlacementDrag(event) {
  if (!massPlacementDrag || !buildInteraction || buildInteraction.mode !== 'place') return;
  const current = gridCoordinateFromPointer(event);
  const line = axisLockedLineCoordinates(
    massPlacementDrag.anchor,
    current,
    buildInteraction.candidate,
    massPlacementDrag.axis,
  );
  massPlacementDrag.axis = line.axis;
  const stagedCandidates = [];
  massPlacementDrag.previews = line.coordinates.map((coordinate) => {
    const candidate = placementFromRecord(
      buildInteraction.record,
      coordinate.x,
      coordinate.y,
      buildInteraction.candidate.direction,
    );
    const result = validateBuildCandidate(candidate, stagedCandidates);
    if (result.valid) stagedCandidates.push(candidate);
    return { candidate, ...result };
  });
  renderMassPlacementGhosts();
  const validCount = massPlacementDrag.previews.filter((preview) => preview.valid).length;
  const axisText = massPlacementDrag.axis ? `${massPlacementDrag.axis} axis locked` : 'drag to choose an axis';
  buildModeMessage(`${axisText} · ${validCount} valid placement${validCount === 1 ? '' : 's'} · release to place.`);
}

function startMassPlacementDrag(event) {
  if (!buildInteraction || buildInteraction.mode !== 'place' || event.button !== 0) return;
  event.preventDefault();
  const anchor = gridCoordinateFromPointer(event);
  massPlacementDrag = { pointerId: event.pointerId, anchor, axis: null, previews: [] };
  grid.setPointerCapture?.(event.pointerId);
  updateMassPlacementDrag(event);
}

function finishMassPlacementDrag(event) {
  if (!massPlacementDrag || event.pointerId !== massPlacementDrag.pointerId || !buildInteraction) return;
  updateMassPlacementDrag(event);
  grid.releasePointerCapture?.(event.pointerId);
  const previews = massPlacementDrag.previews;
  const validCandidates = previews.filter((preview) => preview.valid).map((preview) => preview.candidate);
  const lastCandidate = previews.at(-1)?.candidate ?? buildInteraction.candidate;
  massPlacementDrag = null;
  suppressGridClick = true;
  setTimeout(() => { suppressGridClick = false; }, 0);
  if (!validCandidates.length) {
    candidateAt(lastCandidate.x, lastCandidate.y);
    renderPlacementGhost();
    buildModeMessage('No valid spaces were available on that line.');
    return;
  }
  validCandidates.forEach(placeOnGrid);
  buildInteraction.candidate = placementFromRecord(
    buildInteraction.record,
    lastCandidate.x,
    lastCandidate.y,
    lastCandidate.direction,
  );
  buildInteraction.valid = false;
  buildInteraction.error = 'Move over the grid to choose another location.';
  validation = null;
  workflowStage = Math.min(Math.max(workflowStage, 2), 2);
  const label = lastCandidate.name ?? lastCandidate.conveyor;
  editNotice = `${validCandidates.length} ${label}${validCandidates.length === 1 ? '' : 's'} placed in a straight line; route validation is required.`;
  saveWorkspace();
  renderWorkflow();
  renderItemLibrary();
  renderGrid(Number(sizeSlider.value));
  buildModeMessage(`${validCandidates.length} placed. Hold left click and drag to place another straight line; Esc finishes.`);
}

function cancelMassPlacementDrag(event) {
  if (!massPlacementDrag || (event?.pointerId != null && event.pointerId !== massPlacementDrag.pointerId)) return;
  massPlacementDrag = null;
  renderPlacementGhost();
}

function updateBuildPreview(event) {
  if (massMoveInteraction) {
    updateMassMovePreview(event);
    return;
  }
  if (!buildInteraction) return;
  if (massPlacementDrag) {
    updateMassPlacementDrag(event);
    return;
  }
  const coordinate = gridCoordinateFromPointer(event);
  candidateAt(coordinate.x, coordinate.y);
  renderPlacementGhost();
  if (placementGhost) placementGhost.title = buildInteraction.error || `Place at ${columnName(coordinate.x)}${coordinate.y}`;
}

function commitBuildInteraction(event) {
  if (massMoveInteraction) {
    commitMassMove(event);
    return;
  }
  if (!buildInteraction) return;
  if (suppressGridClick) {
    suppressGridClick = false;
    return;
  }
  const clickCoordinate = gridCoordinateFromPointer(event);
  const keepCurrentMovePreview = buildInteraction.mode === 'move'
    && placementContainsCoordinate(buildInteraction.candidate, clickCoordinate);
  if (!keepCurrentMovePreview) updateBuildPreview(event);
  if (!buildInteraction.valid) {
    buildModeMessage(buildInteraction.error || 'That position is not valid.');
    return;
  }
  const candidate = buildInteraction.candidate;
  const label = candidate.name ?? candidate.conveyor;
  const interactionMode = buildInteraction.mode;
  if (buildInteraction.mode === 'move') {
    replaceMappedItem(candidate);
    buildInteraction = null;
    placementGhost = null;
    buildModeMessage(`${label} moved to ${columnName(candidate.x)}${candidate.y}.`, false);
  } else {
    placeOnGrid(candidate);
    buildInteraction.candidate = placementFromRecord(
      buildInteraction.record,
      candidate.x,
      candidate.y,
      candidate.direction,
    );
    candidateAt(candidate.x, candidate.y);
    buildModeMessage(`${label} placed at ${columnName(candidate.x)}${candidate.y}. Move and click to place another; Esc finishes.`);
  }
  validation = null;
  workflowStage = Math.min(Math.max(workflowStage, 2), 2);
  editNotice = interactionMode === 'move'
    ? `${label} moved and its coordinate map was updated; route validation is required.`
    : `${label} placed with ${candidate.width * candidate.height} occupied coordinate${candidate.width * candidate.height === 1 ? '' : 's'} mapped; route validation is required before using this as a benchmark.`;
  saveWorkspace();
  renderWorkflow();
  renderItemLibrary();
  renderGrid(Number(sizeSlider.value));
}

function validateCoordinateMap(items, size) {
  const occupied = new Map();

  items.forEach((item) => {
    const horizontal = item.direction === 'east' || item.direction === 'west';
    const portable = item.type === 'portable';
    const furnace = item.type === 'furnace';
    const expectedWidth = portable
      ? (horizontal ? item.itemWidth : item.itemLength)
      : (horizontal ? item.itemLength : item.itemWidth);
    const expectedHeight = portable
      ? (horizontal ? item.itemLength : item.itemWidth)
      : (horizontal ? item.itemWidth : item.itemLength);
    const expectedTransport = internalTransportProfile(item.name, item.itemWidth, item.type);
    const expectedConveyorWidth = expectedTransport?.across ?? 0;
    const expectedConveyorOffset = expectedTransport?.northOffset ?? 0;
    if (item.width !== expectedWidth || item.height !== expectedHeight) {
      throw new Error(
        `${item.name} has an invalid rotated footprint: `
        + `${item.width}×${item.height}; expected ${expectedWidth}×${expectedHeight}.`,
      );
    }
    if (item.conveyorWidth !== expectedConveyorWidth) {
      throw new Error(
        `${item.name} has an invalid conveyor width: `
        + `${item.conveyorWidth}; expected ${expectedConveyorWidth}.`,
      );
    }
    if ((item.conveyorOffset ?? 0) !== expectedConveyorOffset) {
      throw new Error(
        `${item.name} has an invalid conveyor offset: `
        + `${item.conveyorOffset}; expected ${expectedConveyorOffset}.`,
      );
    }

    if (furnace) {
      const zone = furnaceProcessingZoneGeometry(item);
      if (!zone
        || zone.x < item.x
        || zone.y < item.y
        || zone.x + zone.width > item.x + item.width
        || zone.y + zone.height > item.y + item.height) {
        throw new Error(`${item.name} has an invalid processing zone.`);
      }
    }

    if (item.x < 1 || item.y < 1 || item.x + item.width - 1 > size || item.y + item.height - 1 > size) {
      throw new Error(`${item.name} is outside the ${size}×${size} base.`);
    }

    for (let y = item.y; y < item.y + item.height; y += 1) {
      for (let x = item.x; x < item.x + item.width; x += 1) {
        const key = `${x},${y}`;
        if (occupied.has(key)) {
          const other = occupied.get(key);
          throw new Error(`${item.name} overlaps ${other.name} at ${key}.`);
        }
        occupied.set(key, item);
      }
    }
  });

  return occupied.size;
}

function validateRouteSegments(segments, items, size, { allowUncompressedQuarterConveyors = false } = {}) {
  const itemTiles = new Set();
  const routeTiles = new Set();
  const conveyorSizes = {
    'Quarter Conveyor': { width: 1, length: 1 },
    'Half Conveyor': { width: 2, length: 1 },
    'Normal Conveyor': { width: 2, length: 2 },
    'Supercharged Conveyor': { width: 2, length: 2 },
    'Centering Conveyor': { width: 2, length: 2 },
    'Ultracharged Conveyor': { width: 4, length: 2 },
    'Conveyor Wall': { width: 1, length: 2 },
  };

  items.forEach((item) => {
    for (let y = item.y; y < item.y + item.height; y += 1) {
      for (let x = item.x; x < item.x + item.width; x += 1) {
        itemTiles.add(`${x},${y}`);
      }
    }
  });

  segments.forEach((segment) => {
    const sizeRule = conveyorSizes[segment.conveyor];
    if (sizeRule && ['north', 'east', 'south', 'west'].includes(segment.direction)) {
      const horizontal = segment.direction === 'east' || segment.direction === 'west';
      const expectedWidth = horizontal ? sizeRule.length : sizeRule.width;
      const expectedHeight = horizontal ? sizeRule.width : sizeRule.length;
      if (segment.width !== expectedWidth || segment.height !== expectedHeight) {
        throw new Error(
          `${segment.name} has an impossible ${segment.conveyor} footprint: `
          + `${segment.width}×${segment.height}; expected ${expectedWidth}×${expectedHeight}.`,
        );
      }
    }
    if (
      segment.x < 1
      || segment.y < 1
      || segment.x + segment.width - 1 > size
      || segment.y + segment.height - 1 > size
    ) {
      throw new Error(`${segment.name} is outside the ${size}×${size} base.`);
    }

    for (let y = segment.y; y < segment.y + segment.height; y += 1) {
      for (let x = segment.x; x < segment.x + segment.width; x += 1) {
        const key = `${x},${y}`;
        if (itemTiles.has(key)) {
          throw new Error(`${segment.name} overlaps an item at ${key}.`);
        }
        if (routeTiles.has(key)) {
          throw new Error(`${segment.name} overlaps another conveyor at ${key}.`);
        }
        routeTiles.add(key);
      }
    }
  });

  if (!allowUncompressedQuarterConveyors) {
    const quarterAt = new Map(
      segments
        .filter((segment) => segment.conveyor === 'Quarter Conveyor')
        .map((segment) => [`${segment.x},${segment.y}`, segment]),
    );
    quarterAt.forEach((segment) => {
      const matchingNeighbor = segment.direction === 'east' || segment.direction === 'west'
        ? quarterAt.get(`${segment.x},${segment.y + 1}`)
        : quarterAt.get(`${segment.x + 1},${segment.y}`);
      const belongsToStraight2x2 = segment.direction === 'east' || segment.direction === 'west'
        ? [-1, 1].some((offset) => (
          quarterAt.get(`${segment.x + offset},${segment.y}`)?.direction === segment.direction
          && quarterAt.get(`${segment.x + offset},${segment.y + 1}`)?.direction === segment.direction
        ))
        : [-1, 1].some((offset) => (
          quarterAt.get(`${segment.x},${segment.y + offset}`)?.direction === segment.direction
          && quarterAt.get(`${segment.x + 1},${segment.y + offset}`)?.direction === segment.direction
        ));
      if (matchingNeighbor?.direction === segment.direction && !belongsToStraight2x2) {
        throw new Error(
          `Quarter Conveyor pair at ${segment.x},${segment.y} has the footprint `
          + 'of one Half Conveyor and must be replaced by it.',
        );
      }
    });
    quarterAt.forEach((segment) => {
      const block = [
        segment,
        quarterAt.get(`${segment.x + 1},${segment.y}`),
        quarterAt.get(`${segment.x},${segment.y + 1}`),
        quarterAt.get(`${segment.x + 1},${segment.y + 1}`),
      ];
      if (block.every((tile) => tile?.direction === segment.direction)) {
        throw new Error(
          `Straight 2x2 Quarter Conveyor block at ${segment.x},${segment.y} `
          + 'must be replaced by a Normal Conveyor or a faster full-size conveyor.',
        );
      }
    });

  }

  const halfAt = new Map(
    segments
      .filter((segment) => segment.conveyor === 'Half Conveyor')
      .map((segment) => [`${segment.x},${segment.y}`, segment]),
  );
  halfAt.forEach((segment) => {
    const matchingNeighbor = segment.direction === 'east' || segment.direction === 'west'
      ? halfAt.get(`${segment.x + 1},${segment.y}`)
      : halfAt.get(`${segment.x},${segment.y + 1}`);
    if (matchingNeighbor?.direction === segment.direction) {
      throw new Error(
        `Half Conveyor pair at ${segment.x},${segment.y} forms a straight 2x2 block `
        + 'and must be replaced by a Normal Conveyor or faster full-size conveyor.',
      );
    }
  });

  return routeTiles.size;
}

function previewRange(value) {
  const [startText, endText = startText] = String(value).split(':');
  const start = parseCoordinate(startText);
  const end = parseCoordinate(endText);
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x) + 1,
    height: Math.abs(end.y - start.y) + 1,
  };
}

function positionPreviewElement(element, rectangle) {
  element.style.left = `calc(${rectangle.x - 1} * var(--tile))`;
  element.style.top = `calc(${rectangle.y - 1} * var(--tile))`;
  element.style.width = `calc(${rectangle.width} * var(--tile))`;
  element.style.height = `calc(${rectangle.height} * var(--tile))`;
}

function previewItemClass(item) {
  if (item.section === 'furnace') return 'furnace';
  if (/dropper/i.test(item.name)) return 'dropper';
  if (/portable|spinner|glazer|derp blaster|dragon/i.test(item.name)) return 'portable';
  if (item.section === 'capgrader') return 'capgrader';
  return 'upgrader';
}

function previewPortableBeam(rectangle, facing, size) {
  let beam;
  if (facing === 'east') beam = { x: rectangle.x + rectangle.width, y: rectangle.y, width: 2, height: rectangle.height };
  if (facing === 'west') beam = { x: rectangle.x - 2, y: rectangle.y, width: 2, height: rectangle.height };
  if (facing === 'south') beam = { x: rectangle.x, y: rectangle.y + rectangle.height, width: rectangle.width, height: 2 };
  if (facing === 'north') beam = { x: rectangle.x, y: rectangle.y - 2, width: rectangle.width, height: 2 };
  if (!beam) return null;
  const x = Math.max(1, beam.x);
  const y = Math.max(1, beam.y);
  const right = Math.min(size, beam.x + beam.width - 1);
  const bottom = Math.min(size, beam.y + beam.height - 1);
  return right >= x && bottom >= y ? { x, y, width: right - x + 1, height: bottom - y + 1 } : null;
}

function renderPlanningPreview(size) {
  const map = planningPreview?.map;
  const legalPool = planningPreview?.legalPool;
  const validationPreview = planningPreview?.validation;
  const banner = stagePreviewSummary;
  banner.replaceChildren();
  banner.hidden = false;
  banner.className = 'stage-preview-summary';
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  banner.append(title, detail);

  if (!map) {
    title.textContent = workflowStage >= 1 ? 'Legal item pool ready' : 'Collecting player requirements';
    if (legalPool) {
      detail.textContent = `${legalPool.legalCount} legal · ${legalPool.rejectedCount} restricted`;
      const categories = document.createElement('div');
      categories.className = 'planning-preview-categories';
      Object.entries(legalPool.categories ?? {}).forEach(([name, count]) => {
        const chip = document.createElement('span');
        chip.textContent = `${name}: ${count}`;
        categories.append(chip);
      });
      banner.append(categories);
    } else detail.textContent = 'The usable item pool will appear here after Step 1.';
    legend.textContent = 'Step preview · no coordinates placed yet.';
    status.textContent = workflowStage >= 1 ? 'Legal item filtering complete · coordinate mapping is next' : 'Waiting for setup requirements';
    return;
  }

  const validated = workflowStage >= 3 && validationPreview?.valid;
  banner.classList.add(validated ? 'is-validated' : 'is-mapping');
  title.textContent = validated ? 'Route validation passed' : 'Coordinate mapping preview';
  detail.textContent = validated
    ? `${validationPreview.routes?.length ?? 0} dropper routes · ${(validationPreview.metrics?.routeTimeSeconds ?? 0).toFixed(3)}s longest route · ${Math.min(100, validationPreview.metrics?.projectedActiveOres ?? 0).toFixed(2)} estimated active ore${optimizationBaseline?.validated ? ` · Step 4 baseline ${abbreviatedRate(optimizationBaseline.metrics?.expectedCashPerMinute ?? 0)}, ${optimizationBaseline.metrics?.remainingTiles ?? 0} tiles free` : ''}${optimizationProgress ? ` · ${optimizationProgress.testedCandidates?.length ?? 0} candidate${optimizationProgress.testedCandidates?.length === 1 ? '' : 's'} tested` : ''}`
    : `${map.items?.length ?? 0} item footprints · ${map.conveyorRuns?.length ?? 0} conveyor runs · not rendered yet`;
  for (const run of map.conveyorRuns ?? []) {
    const rectangle = previewRange(run.cells);
    const element = document.createElement('div');
    element.className = `planning-preview-route${validated ? ' is-validated' : ''}`;
    element.title = `${run.type} · ${run.cells} · facing ${run.facing}`;
    element.textContent = ({ north: '↑', east: '→', south: '↓', west: '←' })[run.facing] ?? '';
    positionPreviewElement(element, rectangle);
    grid.append(element);
  }

  for (const item of map.items ?? []) {
    const rectangle = previewRange(`${item.topLeft}:${item.bottomRight}`);
    const element = document.createElement('div');
    element.className = `planning-preview-item ${previewItemClass(item)}${validated ? ' is-validated' : ''}`;
    element.title = `${item.order}. ${item.variant} ${item.name} · ${item.topLeft}:${item.bottomRight} · facing ${item.facing}`;
    const label = document.createElement('span');
    label.textContent = `${item.order}. ${shortLabel(item.name)}`;
    const arrow = document.createElement('b');
    arrow.textContent = ({ north: '↑', east: '→', south: '↓', west: '←' })[item.facing] ?? '';
    element.append(label, arrow);
    positionPreviewElement(element, rectangle);
    grid.append(element);
    if (previewItemClass(item) === 'portable') {
      const beamRectangle = previewPortableBeam(rectangle, item.facing, size);
      if (beamRectangle) {
        const beam = document.createElement('div');
        beam.className = `planning-preview-beam${validated ? ' is-validated' : ''}`;
        beam.title = `${item.name} upgrade beam · facing ${item.facing}`;
        positionPreviewElement(beam, beamRectangle);
        grid.append(beam);
      }
    }
  }

  if (validationPreview?.furnaceZone) {
    const zone = document.createElement('div');
    zone.className = 'planning-preview-furnace-zone';
    zone.title = 'Validated furnace processing zone';
    positionPreviewElement(zone, validationPreview.furnaceZone);
    grid.append(zone);
  }

  legend.innerHTML = `<span class="legend-key"><span class="legend-swatch planning"></span>Planning footprint</span><span class="legend-key"><span class="legend-swatch ${validated ? 'validated' : 'routing'}"></span>${validated ? 'Validated route' : 'Unvalidated route'}</span>`;
  status.textContent = validated
    ? `Step 3 complete · ${validationPreview.routes?.length ?? 0} routes validated · Step 4 will optimize cash/min, then free space, then route time`
    : `Step 2 mapping · ${map.items?.length ?? 0} items positioned provisionally`;
}

function renderGenerationReady(size) {
  stagePreviewSummary.hidden = false;
  stagePreviewSummary.className = 'stage-preview-summary';
  stagePreviewSummary.innerHTML = '<strong>Generation mode · Stage 1</strong><span>Ready to collect a new player profile and generate a setup.</span>';
  legend.textContent = 'Generation canvas · no setup has been generated yet.';
  status.textContent = `Generation mode · Stage 1 · ${size * size} tiles ready`;
}

function renderPlan(size) {
  grid.querySelectorAll('.plan-item, .plan-lane, .portable-beam, .planning-preview-item, .planning-preview-route, .planning-preview-beam, .planning-preview-furnace-zone').forEach((item) => item.remove());

  if (!activePlan) {
    if (plannerMode === 'generation' && workflowStage === 0) renderGenerationReady(size);
    else renderPlanningPreview(size);
    return;
  }

  if (plannerMode === 'build') {
    stagePreviewSummary.hidden = false;
    stagePreviewSummary.className = 'stage-preview-summary is-mapping';
    stagePreviewSummary.innerHTML = '<strong>Build mode · Stage 3</strong><span>Your manual layout is saved automatically. Ask Codex when you want to run Stages 3–5 and benchmark it.</span>';
  } else if (workflowStage < 5) {
    stagePreviewSummary.hidden = false;
    stagePreviewSummary.className = 'stage-preview-summary is-mapping';
    stagePreviewSummary.innerHTML = `<strong>${workflowStage >= 4 ? 'Optimization complete; final verification pending' : 'Optimization and grid preview in progress'}</strong><span>A validated layout is not final until optimization and final verification are both complete.</span>`;
  } else stagePreviewSummary.hidden = true;

  if (size < activePlan.minimumSize) {
    renderLiveOreTracker();
    legend.textContent = `${activePlan.title} needs at least ${activePlan.minimumSize} × ${activePlan.minimumSize}.`;
    return;
  }

  activePlan.items.forEach((item, index) => {
    item.id ??= `item-${item.order ?? index + 1}`;
    item.type ??= itemType(item.name);
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `plan-item ${item.type}${buildInteraction?.sourceId === item.id || massMoveInteraction?.originals.some((original) => original.id === item.id) ? ' is-moving-source' : ''}${massSelectedIds.has(item.id) ? ' is-box-selected' : ''}`;
    element.dataset.itemId = item.id;
    element.setAttribute('aria-label', `${item.name}, facing ${item.direction}. Click to edit, press M to move, C to copy, or Delete to remove.`);
    const direction = { north: '↑', east: '→', south: '↓', west: '←' }[item.direction] ?? '';
    if (item.type === 'furnace') {
      const processingZone = furnaceProcessingZoneGeometry(item);
      if (processingZone) {
        const zone = document.createElement('span');
        zone.className = 'furnace-processing-zone';
        zone.title = `${item.name} processing zone · ${coordinateRange(processingZone)}`;
        zone.style.left = `calc(${processingZone.x - item.x} * var(--tile))`;
        zone.style.top = `calc(${processingZone.y - item.y} * var(--tile))`;
        zone.style.width = `calc(${processingZone.width} * var(--tile))`;
        zone.style.height = `calc(${processingZone.height} * var(--tile))`;
        element.append(zone);
      }
    } else if (item.type !== 'portable' && item.type !== 'dropper') {
      const belt = document.createElement('span');
      belt.className = 'item-belt';
      const transport = itemTransportGeometry(item);
      if (transport) {
        belt.style.left = `calc(${transport.x - item.x} * var(--tile))`;
        belt.style.top = `calc(${transport.y - item.y} * var(--tile))`;
        belt.style.width = `calc(${transport.width} * var(--tile))`;
        belt.style.height = `calc(${transport.height} * var(--tile))`;
      }
      element.append(belt);
    }

    const label = document.createElement('span');
    label.className = 'plan-label';
    const compactFootprint = item.width * item.height <= 2;
    if (compactFootprint) label.classList.add('is-compact');
    label.textContent = compactFootprint ? String(item.order) : (item.label ?? shortLabel(item.name));
    element.append(label);
    if (direction) {
      const arrow = document.createElement('span');
      arrow.className = 'plan-direction';
      arrow.textContent = direction;
      arrow.setAttribute('aria-label', `Facing ${item.direction}`);
      element.append(arrow);
    }
    if (massSelectedIds.has(item.id)) {
      const badge = document.createElement('span');
      badge.className = 'mass-selection-number';
      badge.textContent = String([...massSelectedIds].indexOf(item.id) + 1);
      const facing = document.createElement('span');
      facing.className = 'mass-selection-facing';
      facing.textContent = `${direction} ${item.direction.slice(0, 1).toUpperCase()}`;
      facing.setAttribute('aria-label', `Now facing ${item.direction}`);
      element.append(badge, facing);
    }
    element.style.left = `calc(${item.x - 1} * var(--tile))`;
    element.style.top = `calc(${item.y - 1} * var(--tile))`;
    element.style.width = `calc(${item.width} * var(--tile))`;
    element.style.height = `calc(${item.height} * var(--tile))`;
    element.addEventListener('pointerenter', (event) => {
      setHoveredPlacement(item);
      showItemTooltip(item, event, element);
    });
    element.addEventListener('pointermove', (event) => placeTooltip(event, element));
    element.addEventListener('pointerleave', () => {
      clearHoveredPlacement(item);
      scheduleItemTooltipHide();
    });
    element.addEventListener('focus', () => {
      setHoveredPlacement(item);
      showItemTooltip(item, null, element);
    });
    element.addEventListener('blur', () => {
      clearHoveredPlacement(item);
      hideItemTooltip();
    });
    element.addEventListener('click', (event) => {
      if (suppressGridClick) {
        suppressGridClick = false;
        event.stopPropagation();
        return;
      }
      if (buildInteraction || massMoveInteraction) return;
      event.stopPropagation();
      openItemEditor(item);
    });

    const beam = portableBeamGeometry(item);
    if (beam) {
      const beamElement = document.createElement('div');
      beamElement.className = `portable-beam${massSelectedIds.has(item.id) ? ' is-box-selected' : ''}`;
      beamElement.title = `${item.name} two-tile upgrade beam`;
      beamElement.style.left = `calc(${beam.x - 1} * var(--tile))`;
      beamElement.style.top = `calc(${beam.y - 1} * var(--tile))`;
      beamElement.style.width = `calc(${beam.width} * var(--tile))`;
      beamElement.style.height = `calc(${beam.height} * var(--tile))`;
      grid.append(beamElement);
    }
    grid.append(element);
  });

  activePlan.lanes.forEach((lane) => {
    lane.id ??= `conveyor-${activePlan.lanes.indexOf(lane) + 1}`;
    const element = document.createElement('button');
    element.type = 'button';
    const conveyorClass = lane.conveyor.toLowerCase().replaceAll(' ', '-');
    const arrow = { north: '↑', east: '→', south: '↓', west: '←' }[lane.direction] ?? '';
    const abbreviation = conveyorAbbreviations[lane.conveyor] ?? lane.label;
    const directionClass = `direction-${lane.direction}`;
    element.className = `plan-lane ${conveyorClass} ${directionClass}${lane.wall ? ' has-wall' : ''}${buildInteraction?.sourceId === lane.id || massMoveInteraction?.originals.some((original) => original.id === lane.id) ? ' is-moving-source' : ''}${massSelectedIds.has(lane.id) ? ' is-box-selected' : ''}`;
    element.textContent = `${abbreviation}${arrow ? ` ${arrow}` : ''}`;
    if (massSelectedIds.has(lane.id)) {
      const badge = document.createElement('span');
      badge.className = 'mass-selection-number';
      badge.textContent = String([...massSelectedIds].indexOf(lane.id) + 1);
      const facing = document.createElement('span');
      facing.className = 'mass-selection-facing';
      facing.textContent = `${arrow} ${lane.direction.slice(0, 1).toUpperCase()}`;
      facing.setAttribute('aria-label', `Now facing ${lane.direction}`);
      element.append(badge, facing);
    }
    element.title = `${lane.conveyor} · facing ${lane.direction} · speed ${lane.speed}`;
    element.setAttribute(
      'aria-label',
      `${lane.conveyor}, facing ${lane.direction}, speed ${lane.speed}. Press M to move, C to copy, or Delete to remove while highlighted.`,
    );
    element.style.left = `calc(${lane.x - 1} * var(--tile))`;
    element.style.top = `calc(${lane.y - 1} * var(--tile))`;
    element.style.width = `calc(${lane.width} * var(--tile))`;
    element.style.height = `calc(${lane.height} * var(--tile))`;
    element.addEventListener('pointerenter', () => setHoveredPlacement(lane));
    element.addEventListener('pointerleave', () => clearHoveredPlacement(lane));
    element.addEventListener('focus', () => setHoveredPlacement(lane));
    element.addEventListener('blur', () => clearHoveredPlacement(lane));
    element.addEventListener('click', (event) => {
      if (suppressGridClick) {
        suppressGridClick = false;
        event.stopPropagation();
        return;
      }
      if (buildInteraction || massMoveInteraction) return;
      event.stopPropagation();
      openItemEditor(lane);
    });
    grid.append(element);
  });

  renderMassSelectionEmphasis();
  if (massMoveInteraction) renderMassMoveGhosts();

  const phantomOverlayCount = renderPhantomZoneOverlays();
  const visibleLegendItems = phantomOverlayCount
    ? [...legendItems, ['phantom-zone', 'PZ = possible Crimson phantom zone']]
    : legendItems;
  legend.innerHTML = visibleLegendItems.map(([type, label]) => `<span class="legend-key"><span class="legend-swatch ${type}"></span>${label}</span>`).join('');
  const reservedTiles = validateCoordinateMap(activePlan.items, size)
    + validateRouteSegments(activePlan.lanes ?? [], activePlan.items, size, {
      allowUncompressedQuarterConveyors: plannerMode === 'build',
    });
  const remainingTiles = Math.max(0, size * size - reservedTiles);
  tileCount.textContent = remainingTiles.toLocaleString();
  if (editNotice) {
    status.textContent = editNotice;
  } else if (size === activePlan.minimumSize && validation) {
    status.textContent = `${activePlan.title} · ${validation.remainingTiles} tiles remaining`;
  } else {
    status.textContent = `${activePlan.title} · ${remainingTiles} tiles remaining`;
  }
  renderLiveOreTracker();
}

clearPlanner();
plannerMode = loadPlannerMode();
applyPlannerModeUi();
if (plannerMode === 'build') {
  if (!loadSavedWorkspace()) resetWorkspaceForMode({ render: false });
} else if (generationSourceChanged()) {
  if (globalThis.TycoonActivePlan?.valid) loadGeneratedPlan(globalThis.TycoonActivePlan);
  else loadWorkflowProgress(globalThis.TycoonWorkflowState);
} else {
  resetWorkspaceForMode({ render: false });
}
loadViewPreferences();
sizeSlider.addEventListener('input', () => applyBaseSize(sizeSlider.value));
sizeOut.addEventListener('click', () => applyBaseSize(Number(sizeSlider.value) - Number(sizeSlider.step || 1)));
sizeIn.addEventListener('click', () => applyBaseSize(Number(sizeSlider.value) + Number(sizeSlider.step || 1)));
zoomSlider.addEventListener('input', () => applyGridZoom(zoomSlider.value));
zoomOut.addEventListener('click', () => applyGridZoom(Number(zoomSlider.value) - Number(zoomSlider.step)));
zoomIn.addEventListener('click', () => applyGridZoom(Number(zoomSlider.value) + Number(zoomSlider.step)));
itemEditor.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'close-editor') itemEditor.close();
  if (action === 'move-item') submitItemMove();
  if (action === 'rotate-left') rotateSelectedItem('left');
  if (action === 'rotate-right') rotateSelectedItem('right');
  if (action === 'remove-item') removeSelectedItem();
});
itemEditor.addEventListener('close', () => {
  selectedItemId = null;
  itemEditorError.hidden = true;
});
massSelectionDialog.addEventListener('click', (event) => {
  const action = event.target.closest('[data-mass-action]')?.dataset.massAction;
  if (!action) return;
  if (action === 'close') clearMassSelection();
  if (action === 'rotate') rotateMassSelection();
  if (action === 'move') startMassMove();
  if (action === 'delete') deleteMassSelection();
});
massSelectionDialog.addEventListener('close', () => {
  if (massMoveInteraction || !massSelectedIds.size) return;
  massSelectedIds.clear();
  renderGrid(Number(sizeSlider.value));
});
moveCoordinate.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitTypedItemMove();
  }
});
itemSearch.addEventListener('input', renderItemLibrary);
libraryFilterToggle.addEventListener('click', () => {
  const expanded = libraryFilterToggle.getAttribute('aria-expanded') === 'true';
  libraryFilterToggle.setAttribute('aria-expanded', String(!expanded));
  libraryFilterPanel.hidden = expanded;
});
[librarySort, libraryTierFilter, libraryVariantFilter].forEach((control) => {
  control.addEventListener('change', renderItemLibrary);
});
libraryFilterReset.addEventListener('click', () => {
  librarySort.value = 'tier-name';
  libraryTierFilter.value = 'all';
  libraryVariantFilter.value = 'all';
  renderItemLibrary();
});
liveDropperSelect.addEventListener('change', () => {
  selectedLiveDropperId = liveDropperSelect.value || null;
  saveWorkspace();
  renderLiveOreTracker();
});
libraryTabs.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('[data-category]')) return;
  restoreLibrarySearchFocus = document.activeElement === itemSearch;
});
libraryTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  if (button.dataset.category === libraryCategory) {
    restoreLibrarySearchFocus = false;
    return;
  }
  const shouldRestoreSearchFocus = restoreLibrarySearchFocus || document.activeElement === itemSearch;
  restoreLibrarySearchFocus = false;
  libraryCategory = button.dataset.category;
  itemSearch.value = '';
  libraryTierFilter.value = 'all';
  libraryVariantFilter.value = 'all';
  libraryTabs.querySelectorAll('[data-category]').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab === button));
  });
  renderItemLibrary();
  if (shouldRestoreSearchFocus) itemSearch.focus();
});
plannerModeToggle.addEventListener('click', (event) => {
  const button = event.target.closest('[data-planner-mode]');
  if (!button || button.dataset.plannerMode === plannerMode) return;
  setPlannerMode(button.dataset.plannerMode);
});
simulateBaseButton.addEventListener('click', runManualSimulation);
saveBaseButton.addEventListener('click', openSaveBaseMenu);
loadBasesButton.addEventListener('click', openLoadBaseMenu);
saveBaseForm.addEventListener('submit', submitSavedBase);
saveBaseDialog.addEventListener('click', (event) => {
  if (event.target.closest('[data-save-base-action="close"]')) saveBaseDialog.close();
});
saveBaseDialog.addEventListener('close', () => {
  pendingSaveSnapshot = null;
  saveBaseStatus.hidden = true;
});
loadBaseDialog.addEventListener('click', (event) => {
  const savedBaseButtonTarget = event.target.closest('[data-saved-base-id]');
  if (savedBaseButtonTarget) {
    selectedSavedBaseId = savedBaseButtonTarget.dataset.savedBaseId;
    renderSavedBaseList();
    return;
  }
  const action = event.target.closest('[data-load-base-action]')?.dataset.loadBaseAction;
  if (!action) return;
  if (action === 'close') loadBaseDialog.close();
  if (action === 'import-folder') savedLoadoutFolderInput.click();
  if (action === 'import-files') savedLoadoutFileInput.click();
  if (action === 'preview') renderSavedLoadoutPreview(selectedSavedLoadout());
  if (action === 'load') requestSavedBaseLoad(selectedSavedLoadout());
  if (action === 'delete') {
    const record = selectedSavedLoadout();
    if (!record) return;
    removeSavedLoadout(record.id);
    selectedSavedBaseId = null;
    loadBaseStatus.textContent = `Deleted “${record.name}” from the saved-base library.`;
    renderSavedBaseList();
  }
});
savedLoadoutFolderInput.addEventListener('change', async () => {
  await importSavedLoadoutFiles(savedLoadoutFolderInput.files ?? []);
  savedLoadoutFolderInput.value = '';
});
savedLoadoutFileInput.addEventListener('change', async () => {
  await importSavedLoadoutFiles(savedLoadoutFileInput.files ?? []);
  savedLoadoutFileInput.value = '';
});
confirmLoadBaseDialog.addEventListener('click', (event) => {
  const action = event.target.closest('[data-confirm-load-action]')?.dataset.confirmLoadAction;
  if (action === 'cancel') {
    pendingLoadBaseId = null;
    confirmLoadBaseDialog.close();
  }
  if (action === 'load') {
    const record = loadSavedLoadouts().find((candidate) => candidate.id === pendingLoadBaseId);
    if (record) loadSavedBaseIntoGrid(record);
    else confirmLoadBaseDialog.close();
  }
});
clearWorkspaceButton.addEventListener('click', () => {
  const modeLabel = plannerMode === 'build' ? 'Build Mode at Stage 3' : 'Generation Mode at Stage 1';
  if (!globalThis.confirm(`Clear the grid and restart ${modeLabel}?`)) return;
  resetWorkspaceForMode();
});
grid.addEventListener('pointerdown', startBoxSelectionDrag);
grid.addEventListener('pointerdown', startMassPlacementDrag);
grid.addEventListener('pointermove', updateBoxSelectionDrag);
grid.addEventListener('pointermove', updateBuildPreview);
grid.addEventListener('pointerup', finishBoxSelectionDrag);
grid.addEventListener('pointerup', finishMassPlacementDrag);
grid.addEventListener('pointercancel', cancelBoxSelectionDrag);
grid.addEventListener('pointercancel', cancelMassPlacementDrag);
grid.addEventListener('click', commitBuildInteraction);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && massMoveInteraction) {
    event.preventDefault();
    cancelMassMove();
    return;
  }
  if (massSelectionDialog.open && massSelectedIds.size && !event.repeat && !isTypingTarget(event.target)) {
    const key = event.key.toLowerCase();
    if (key === 'r') {
      event.preventDefault();
      rotateMassSelection();
      return;
    }
    if (key === 'm') {
      event.preventDefault();
      startMassMove();
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      deleteMassSelection();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      clearMassSelection();
      return;
    }
  }
  if ((event.key === 'Backspace' || event.key === 'Delete') && !event.repeat && !isTypingTarget(event.target)) {
    if (removeHoveredPlacement()) event.preventDefault();
    return;
  }
  if (event.key.toLowerCase() === 'c' && !event.repeat && !isTypingTarget(event.target)) {
    if (startCopyingHoveredPlacement()) event.preventDefault();
    return;
  }
  if (event.key.toLowerCase() === 'm' && !event.repeat && !isTypingTarget(event.target)) {
    if (startMovingHoveredPlacement()) event.preventDefault();
    return;
  }
  if (event.key.toLowerCase() === 'r' && !event.repeat && buildInteraction) {
    event.preventDefault();
    rotateActivePlacementClockwise();
    return;
  }
  if (event.key === 'Escape' && buildInteraction && !itemEditor.open) {
    event.preventDefault();
    cancelBuildInteraction();
  }
});
if (coordinateMap.length > 0 || routeSegments.length > 0) {
  const startupSize = Number(sizeSlider.value);
  const itemTileCount = validateCoordinateMap(coordinateMap, startupSize);
  const routeTileCount = validateRouteSegments(routeSegments, coordinateMap, startupSize, {
    allowUncompressedQuarterConveyors: plannerMode === 'build',
  });
  if (validation && itemTileCount + routeTileCount !== validation.reservedTiles) {
    throw new Error(`Reserved tile count is ${itemTileCount + routeTileCount}, expected ${validation.reservedTiles}.`);
  }
}
renderWorkflow();
renderItemLibrary();
applyGridZoom(zoomSlider.value);
renderGrid(Number(sizeSlider.value));
