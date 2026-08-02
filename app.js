const grid = document.querySelector('#game-grid');
const columnLabels = document.querySelector('#column-labels');
const rowLabels = document.querySelector('#row-labels');
const sizeSlider = document.querySelector('#base-size');
const sizeLabel = document.querySelector('#size-label');
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
const moveCoordinate = document.querySelector('#move-coordinate');

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
}

// Coordinates are 1-based to match the labels shown to the player.
// Database sizes are WIDTH x LENGTH. Even-width items have a centered
// 2 x LENGTH conveyor; odd-width items have a centered 1 x LENGTH conveyor.
// East/west placements therefore use LENGTH on the grid's X axis, while
// north/south placements use LENGTH on the grid's Y axis.
function placeItem(order, name, x, y, itemWidth, itemLength, direction, type = null, details = {}) {
  const horizontal = direction === 'east' || direction === 'west';
  const resolvedType = itemType(name, type);
  const dropper = resolvedType === 'dropper';
  const portable = resolvedType === 'portable';
  const furnace = resolvedType === 'furnace';
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
    conveyorWidth: dropper || portable || furnace ? 0 : (itemWidth % 2 === 0 ? 2 : 1),
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
  const entries = Object.entries(stats ?? {});
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

  const entries = Object.entries(stats ?? {});
  if (entries.length === 0) {
    return '<section class="item-stat-section"><h3>Item stats</h3><p>No stats loaded.</p></section>';
  }

  const isOreTracking = ([label]) => /^Ore (value|size) (before|after)$/i.test(label);
  const isTiming = ([label]) => /^(Arrival time|Time across)/i.test(label);
  const isEffectTracking = ([label]) => /^(Effect|Next remover|Route to safety|Destruction timer|Safety margin)/i.test(label);
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

function itemDetailsHtml(item) {
  const processingZone = furnaceProcessingZoneGeometry(item);
  return `
    <strong>${escapeHtml(item.name)}</strong>
    <p>${escapeHtml(item.description ?? 'No description loaded for this item.')}</p>
    ${statsSectionsHtml(item.stats)}
    <dl class="item-meta">
      <dt>Database size</dt><dd>${item.itemWidth}×${item.itemLength}</dd>
      <dt>Grid footprint</dt><dd>${item.width}×${item.height}</dd>
      <dt>Top-left</dt><dd>${columnName(item.x)}${item.y}</dd>
      <dt>Facing</dt><dd>${escapeHtml(item.direction)}</dd>
      ${processingZone ? `
        <dt>Processing zone</dt><dd>${processingZone.width}×${processingZone.height} at ${coordinateRange(processingZone)}</dd>
        <dt>Zone placement</dt><dd>${escapeHtml(item.processingZonePlacement.replaceAll('-', ' '))}</dd>` : ''}
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

let activePlan = null;
let selectedItemId = null;
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
  editNotice = '';
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

function loadGeneratedPlan(plan) {
  clearPlanner();
  if (!plan?.valid) return false;
  sizeSlider.value = plan.profile.plotSize;
  coordinateMap.push(...plan.items.map((item, index) => ({
    ...item,
    order: item.order ?? index + 1,
    label: item.label ?? `${item.order ?? index + 1}. ${shortLabel(item.name)}`,
    stats: item.stats ?? {},
  })));
  routeSegments.push(...plan.conveyors);
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

const conveyorAbbreviations = {
  'Normal Conveyor': 'Con',
  'Supercharged Conveyor': 'Sup',
  'Ultracharged Conveyor': 'Ult',
  'Centering Conveyor': 'Cen',
  'Half Conveyor': 'Hal',
  'Quarter Conveyor': 'Qua',
};

function renderGrid(size) {
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
  const listedItems = activePlan?.items ?? coordinateMap;
  workflowSteps.replaceChildren(...workflow.map((label, index) => {
    const step = document.createElement('li');
    const isDone = index < workflowStage;
    const isCurrent = index === workflowStage && workflowStage < workflow.length;
    step.className = `workflow-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`;
    step.dataset.status = isDone ? 'complete' : isCurrent ? 'current' : 'pending';
    step.innerHTML = `<span>${isDone ? '✓ ' : ''}${label}</span><small>${isDone ? 'Complete' : isCurrent ? 'In progress' : 'Pending'}</small>`;
    return step;
  }));

  if (workflowStage >= 2 && listedItems.length) {
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

  if (workflowStage >= 2 && !listedItems.length && workflowProgress) {
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

  if (workflowStage < 2 || (workflowStage >= 2 && !listedItems.length && !workflowProgress)) coordinateSummary.hidden = true;
  if (workflowStage < 3 || !validation) validationSummary.hidden = true;

  if (workflowStage >= 3 && validation) {
    validationSummary.hidden = false;
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
      ${validation.throughputLimitedByOreCap ? ' · ore-cap limited' : ''}
      · <strong>Space:</strong> ${validation.reservedTiles} reserved / ${validation.remainingTiles} remaining
      <br><strong>Effect safety:</strong> Toxic ${validation.toxicExposureSeconds}s / 5s
      · Fire ${validation.fireExposureSeconds}s / 2s
      <br>${validation.checks.map((check) => `✓ ${check}`).join('<br>')}
      ${workflowStage >= 5 ? '<br>✓ Final calculation and render verification complete.' : ''}`;
  }
}

function findSelectedItem() {
  return activePlan?.items.find((item) => item.id === selectedItemId) ?? null;
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
  itemTooltip.innerHTML = itemDetailsHtml(item);
  itemTooltip.hidden = false;
  placeTooltip(event, element);
}

function hideItemTooltip() {
  itemTooltip.hidden = true;
}

function openItemEditor(item) {
  selectedItemId = item.id;
  hideItemTooltip();
  itemEditorTitle.textContent = item.name;
  itemEditorDetails.innerHTML = itemDetailsHtml(item);
  moveCoordinate.value = `${columnName(item.x)}${item.y}`;
  itemEditorError.hidden = true;
  itemEditorError.textContent = '';
  itemEditor.showModal();
}

function replaceMappedItem(updatedItem) {
  const planIndex = activePlan.items.findIndex((item) => item.id === updatedItem.id);
  activePlan.items.splice(planIndex, 1, updatedItem);

  const mapIndex = coordinateMap.findIndex((item) => item.id === updatedItem.id);
  if (mapIndex !== -1 && coordinateMap !== activePlan.items) {
    coordinateMap.splice(mapIndex, 1, updatedItem);
  }
}

function validateItemEdit(updatedItem) {
  const candidates = activePlan.items.map((item) => (
    item.id === updatedItem.id ? updatedItem : item
  ));
  const size = Number(sizeSlider.value);
  validateCoordinateMap(candidates, size);
  validateRouteSegments(activePlan.lanes ?? routeSegments, candidates, size);
}

function refreshAfterEdit(message) {
  validation = null;
  workflowStage = Math.min(workflowStage, 2);
  editNotice = message;
  renderWorkflow();
  renderGrid(Number(sizeSlider.value));
}

function submitItemMove() {
  const item = findSelectedItem();
  if (!item) return;
  try {
    const coordinate = parseCoordinate(moveCoordinate.value);
    const updatedItem = updateItemGeometry(item, coordinate);
    validateItemEdit(updatedItem);
    replaceMappedItem(updatedItem);
    itemEditor.close();
    refreshAfterEdit(`${item.name} moved to ${columnName(coordinate.x)}${coordinate.y}; route validation is required.`);
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
    const updatedItem = updateItemGeometry(item, { direction });
    validateItemEdit(updatedItem);
    replaceMappedItem(updatedItem);
    itemEditor.close();
    refreshAfterEdit(`${item.name} rotated ${turn} to face ${direction}; route validation is required.`);
  } catch (error) {
    itemEditorError.textContent = error.message;
    itemEditorError.hidden = false;
  }
}

function removeSelectedItem() {
  const item = findSelectedItem();
  if (!item) return;
  activePlan.items = activePlan.items.filter((candidate) => candidate.id !== item.id);
  if (coordinateMap !== activePlan.items) {
    const mapIndex = coordinateMap.findIndex((candidate) => candidate.id === item.id);
    if (mapIndex !== -1) coordinateMap.splice(mapIndex, 1);
  }
  activePlan.items.forEach((candidate, index) => { candidate.order = index + 1; });
  coordinateMap.forEach((candidate, index) => { candidate.order = index + 1; });
  itemEditor.close();
  selectedItemId = null;
  refreshAfterEdit(`${item.name} removed; route validation is required.`);
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
    const expectedConveyorWidth = portable || furnace || item.type === 'dropper' ? 0 : (item.itemWidth % 2 === 0 ? 2 : 1);
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

function validateRouteSegments(segments, items, size) {
  const itemTiles = new Set();
  const routeTiles = new Set();
  const conveyorSizes = {
    'Quarter Conveyor': { width: 1, length: 1 },
    'Half Conveyor': { width: 2, length: 1 },
    'Normal Conveyor': { width: 2, length: 2 },
    'Supercharged Conveyor': { width: 2, length: 2 },
    'Centering Conveyor': { width: 2, length: 2 },
    'Ultracharged Conveyor': { width: 4, length: 2 },
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

function renderPlan(size) {
  grid.querySelectorAll('.plan-item, .plan-lane, .portable-beam, .planning-preview-item, .planning-preview-route, .planning-preview-beam, .planning-preview-furnace-zone').forEach((item) => item.remove());

  if (!activePlan) {
    renderPlanningPreview(size);
    return;
  }

  if (workflowStage < 5) {
    stagePreviewSummary.hidden = false;
    stagePreviewSummary.className = 'stage-preview-summary is-mapping';
    stagePreviewSummary.innerHTML = `<strong>${workflowStage >= 4 ? 'Optimization complete; final verification pending' : 'Optimization and grid preview in progress'}</strong><span>A validated layout is not final until optimization and final verification are both complete.</span>`;
  } else stagePreviewSummary.hidden = true;

  if (size < activePlan.minimumSize) {
    legend.textContent = `${activePlan.title} needs at least ${activePlan.minimumSize} × ${activePlan.minimumSize}.`;
    return;
  }

  activePlan.items.forEach((item, index) => {
    item.id ??= `item-${item.order ?? index + 1}`;
    item.type ??= itemType(item.name);
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `plan-item ${item.type}`;
    element.dataset.itemId = item.id;
    element.setAttribute('aria-label', `${item.name}, facing ${item.direction}. Click to edit.`);
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
      if (item.direction === 'east' || item.direction === 'west') {
        belt.style.left = '0';
        belt.style.top = `calc(${(item.height - item.conveyorWidth) / 2} * var(--tile))`;
        belt.style.width = '100%';
        belt.style.height = `calc(${item.conveyorWidth} * var(--tile))`;
      } else {
        belt.style.top = '0';
        belt.style.left = `calc(${(item.width - item.conveyorWidth) / 2} * var(--tile))`;
        belt.style.height = '100%';
        belt.style.width = `calc(${item.conveyorWidth} * var(--tile))`;
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
    element.style.left = `calc(${item.x - 1} * var(--tile))`;
    element.style.top = `calc(${item.y - 1} * var(--tile))`;
    element.style.width = `calc(${item.width} * var(--tile))`;
    element.style.height = `calc(${item.height} * var(--tile))`;
    element.addEventListener('pointerenter', (event) => showItemTooltip(item, event, element));
    element.addEventListener('pointermove', (event) => placeTooltip(event, element));
    element.addEventListener('pointerleave', hideItemTooltip);
    element.addEventListener('focus', () => showItemTooltip(item, null, element));
    element.addEventListener('blur', hideItemTooltip);
    element.addEventListener('click', () => openItemEditor(item));

    const beam = portableBeamGeometry(item);
    if (beam) {
      const beamElement = document.createElement('div');
      beamElement.className = 'portable-beam';
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
    const element = document.createElement('div');
    const conveyorClass = lane.conveyor.toLowerCase().replaceAll(' ', '-');
    const arrow = { north: '↑', east: '→', south: '↓', west: '←' }[lane.direction] ?? '';
    const abbreviation = conveyorAbbreviations[lane.conveyor] ?? lane.label;
    const directionClass = `direction-${lane.direction}`;
    element.className = `plan-lane ${conveyorClass} ${directionClass}${lane.wall ? ' has-wall' : ''}`;
    element.textContent = `${abbreviation}${arrow ? ` ${arrow}` : ''}`;
    element.title = `${lane.conveyor} · facing ${lane.direction} · speed ${lane.speed}`;
    element.setAttribute(
      'aria-label',
      `${lane.conveyor}, facing ${lane.direction}, speed ${lane.speed}`,
    );
    element.style.left = `calc(${lane.x - 1} * var(--tile))`;
    element.style.top = `calc(${lane.y - 1} * var(--tile))`;
    element.style.width = `calc(${lane.width} * var(--tile))`;
    element.style.height = `calc(${lane.height} * var(--tile))`;
    grid.append(element);
  });

  legend.innerHTML = legendItems.map(([type, label]) => `<span class="legend-key"><span class="legend-swatch ${type}"></span>${label}</span>`).join('');
  const reservedTiles = validateCoordinateMap(activePlan.items, size)
    + validateRouteSegments(activePlan.lanes ?? [], activePlan.items, size);
  const remainingTiles = Math.max(0, size * size - reservedTiles);
  tileCount.textContent = remainingTiles.toLocaleString();
  if (editNotice) {
    status.textContent = editNotice;
  } else if (size === activePlan.minimumSize && validation) {
    status.textContent = `${activePlan.title} · ${validation.remainingTiles} tiles remaining`;
  } else {
    status.textContent = `${activePlan.title} · ${remainingTiles} tiles remaining`;
  }
}

clearPlanner();
if (globalThis.TycoonActivePlan?.valid) loadGeneratedPlan(globalThis.TycoonActivePlan);
else loadWorkflowProgress(globalThis.TycoonWorkflowState);
sizeSlider.addEventListener('input', () => renderGrid(Number(sizeSlider.value)));
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
moveCoordinate.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitItemMove();
  }
});
if (coordinateMap.length > 0 || routeSegments.length > 0) {
  const startupSize = Number(sizeSlider.value);
  const itemTileCount = validateCoordinateMap(coordinateMap, startupSize);
  const routeTileCount = validateRouteSegments(routeSegments, coordinateMap, startupSize);
  if (validation && itemTileCount + routeTileCount !== validation.reservedTiles) {
    throw new Error(`Reserved tile count is ${itemTileCount + routeTileCount}, expected ${validation.reservedTiles}.`);
  }
}
renderWorkflow();
applyGridZoom(zoomSlider.value);
renderGrid(Number(sizeSlider.value));
