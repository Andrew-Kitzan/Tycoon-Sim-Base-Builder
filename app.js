const grid = document.querySelector('#game-grid');
const columnLabels = document.querySelector('#column-labels');
const rowLabels = document.querySelector('#row-labels');
const sizeSlider = document.querySelector('#base-size');
const sizeLabel = document.querySelector('#size-label');
const tileCount = document.querySelector('#tile-count');
const status = document.querySelector('#status');
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
  '4. Grid render',
  '5. Final verification',
];
let workflowStage = 0;

// Coordinates are 1-based to match the labels shown to the player.
// Database sizes are WIDTH x LENGTH. Even-width items have a centered
// 2 x LENGTH conveyor; odd-width items have a centered 1 x LENGTH conveyor.
// East/west placements therefore use LENGTH on the grid's X axis, while
// north/south placements use LENGTH on the grid's Y axis.
function placeItem(order, name, x, y, itemWidth, itemLength, direction, type = null, details = {}) {
  const horizontal = direction === 'east' || direction === 'west';
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
    conveyorWidth: itemWidth % 2 === 0 ? 2 : 1,
    width: horizontal ? itemLength : itemWidth,
    height: horizontal ? itemWidth : itemLength,
    direction,
    type: itemType(name, type),
  };
}

const coordinateMap = [];
const routeSegments = [];

function calculateExpectedEconomy({
  cashPerOre,
  droppers,
  oreCap = 100,
  knownFurnaceEntriesPerMinute = null,
}) {
  const totalDropRate = droppers.reduce(
    (sum, dropper) => sum + dropper.oresPerSecond,
    0,
  );
  const projectedActiveOres = droppers.reduce(
    (sum, dropper) => sum + dropper.oresPerSecond
      * (dropper.averageRemovalTimeSeconds ?? dropper.routeTimeSeconds),
    0,
  );
  const weightedRouteTime = projectedActiveOres / totalDropRate;
  const oreCapThroughputScale = Math.min(1, oreCap / projectedActiveOres);
  const estimatedProcessedOresPerSecond = droppers.reduce(
    (sum, dropper) => sum + dropper.oresPerSecond
      * (dropper.processedFraction ?? 1),
    0,
  ) * oreCapThroughputScale;
  const estimatedEntriesPerMinute = knownFurnaceEntriesPerMinute
    ?? estimatedProcessedOresPerSecond * 60;

  return {
    projectedActiveOres,
    weightedRouteTime,
    oreCapThroughputScale,
    estimatedEntriesPerMinute,
    expectedCashPerMinute: cashPerOre * estimatedEntriesPerMinute,
    limitedByOreCap: projectedActiveOres > oreCap,
  };
}

let validation = null;

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

function itemDetailsHtml(item) {
  return `
    <strong>${escapeHtml(item.name)}</strong>
    <p>${escapeHtml(item.description ?? 'No description loaded for this item.')}</p>
    <dl>
      <dt>Stats</dt><dd>${escapeHtml(formatStats(item.stats))}</dd>
      <dt>Database size</dt><dd>${item.itemWidth}×${item.itemLength}</dd>
      <dt>Grid footprint</dt><dd>${item.width}×${item.height}</dd>
      <dt>Top-left</dt><dd>${columnName(item.x)}${item.y}</dd>
      <dt>Facing</dt><dd>${escapeHtml(item.direction)}</dd>
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
  return {
    ...item,
    x,
    y,
    direction,
    width: horizontal ? item.itemLength : item.itemWidth,
    height: horizontal ? item.itemWidth : item.itemLength,
  };
}

let activePlan = null;
let selectedItemId = null;
let editNotice = '';

const legendItems = [
  ['dropper', 'Droppers'], ['capgrader', 'Capgraders'], ['upgrader', 'Upgraders'],
  ['portable', 'Portables'], ['furnace', 'Furnace'], ['routing', 'Blue = external conveyor'],
];

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
    step.className = `workflow-step${index < workflowStage ? ' is-done' : ''}${index === workflowStage ? ' is-current' : ''}`;
    step.textContent = index < workflowStage ? `✓ ${label}` : label;
    return step;
  }));

  if (workflowStage >= 2) {
    coordinateSummary.hidden = false;
    coordinateSummary.innerHTML = `
      <table>
        <thead><tr><th>Order</th><th>Item</th><th>Top-left</th><th>Database W×L</th><th>Path width</th><th>Grid footprint</th><th>Facing</th></tr></thead>
        <tbody>${listedItems.map((item) => `
          <tr>
            <td>${item.order}</td>
            <td>${item.name}</td>
            <td>(${item.x}, ${item.y})</td>
            <td>${item.itemWidth}×${item.itemLength}</td>
            <td>${item.conveyorWidth}</td>
            <td>${item.width}×${item.height}</td>
            <td>${item.direction}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  if (workflowStage < 2) coordinateSummary.hidden = true;
  if (workflowStage < 3 || !validation) validationSummary.hidden = true;

  if (workflowStage >= 3 && validation) {
    validationSummary.hidden = false;
    validationSummary.innerHTML = `
      <strong>Route validated:</strong> ${validation.routeTimeSeconds}s ×
      ${validation.dropperCount * validation.dropRatePerSecond} ores/sec ≈
      ${validation.uncappedEstimatedOres} projected ·
      ${validation.estimatedOres} active (${validation.oreCap}-ore cap).
      <br><strong>Per dropper:</strong> A ${validation.dropperRouteTimes.A}s
      · B ${validation.dropperRouteTimes.B}s
      · C ${validation.dropperRouteTimes.C}s
      · D ${validation.dropperRouteTimes.D}s
      <br><strong>Final ore:</strong> $${validation.finalOreValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      · <strong>Furnace rate:</strong> ${validation.estimatedFurnaceOresPerMinute.toLocaleString()} ores/min
      <br><strong>Expected income:</strong> $${validation.expectedCashPerMinute.toLocaleString(undefined, { maximumFractionDigits: 2 })}/min
      ${validation.throughputLimitedByOreCap ? ' · ore-cap limited' : ''}
      · <strong>Space:</strong> ${validation.reservedTiles} reserved / ${validation.remainingTiles} remaining
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
    const expectedWidth = horizontal ? item.itemLength : item.itemWidth;
    const expectedHeight = horizontal ? item.itemWidth : item.itemLength;
    const expectedConveyorWidth = item.itemWidth % 2 === 0 ? 2 : 1;
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

    if (item.x < 1 || item.y < 1 || item.x + item.width - 1 > size || item.y + item.height - 1 > size) {
      throw new Error(`${item.name} is outside the ${size}×${size} base.`);
    }

    for (let y = item.y; y < item.y + item.height; y += 1) {
      for (let x = item.x; x < item.x + item.width; x += 1) {
        const key = `${x},${y}`;
        if (occupied.has(key)) {
          throw new Error(`${item.name} overlaps ${occupied.get(key)} at ${key}.`);
        }
        occupied.set(key, item.name);
      }
    }
  });

  return occupied.size;
}

function validateRouteSegments(segments, items, size) {
  const itemTiles = new Set();
  const routeTiles = new Set();

  items.forEach((item) => {
    for (let y = item.y; y < item.y + item.height; y += 1) {
      for (let x = item.x; x < item.x + item.width; x += 1) {
        itemTiles.add(`${x},${y}`);
      }
    }
  });

  segments.forEach((segment) => {
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

  return routeTiles.size;
}

function renderPlan(size) {
  grid.querySelectorAll('.plan-item').forEach((item) => item.remove());

  if (!activePlan) {
    legend.textContent = 'No verified layout loaded yet.';
    status.textContent = `Planning canvas · ${size * size} tiles available`;
    return;
  }

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

    const label = document.createElement('span');
    label.className = 'plan-label';
    label.textContent = item.label ?? shortLabel(item.name);
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
    grid.append(element);
  });

  activePlan.lanes.forEach((lane) => {
    const element = document.createElement('div');
    element.className = `plan-lane${lane.wall ? ' has-wall' : ''}`;
    element.textContent = lane.label;
    element.style.left = `calc(${lane.x - 1} * var(--tile))`;
    element.style.top = `calc(${lane.y - 1} * var(--tile))`;
    element.style.width = `calc(${lane.width} * var(--tile))`;
    element.style.height = `calc(${lane.height} * var(--tile))`;
    grid.append(element);
  });

  legend.innerHTML = legendItems.map(([type, label]) => `<span class="legend-key"><span class="legend-swatch ${type}"></span>${label}</span>`).join('');
  const reservedTiles = activePlan.items.reduce(
    (total, item) => total + item.width * item.height,
    0,
  ) + (activePlan.lanes ?? []).reduce(
    (total, lane) => total + lane.width * lane.height,
    0,
  );
  const remainingTiles = Math.max(0, size * size - reservedTiles);
  tileCount.textContent = remainingTiles.toLocaleString();
  if (editNotice) {
    status.textContent = editNotice;
  } else if (size === 20 && validation) {
    status.textContent = `${activePlan.title} · ${validation.remainingTiles} tiles remaining`;
  } else {
    status.textContent = `${activePlan.title} · ${remainingTiles} tiles remaining`;
  }
}

sizeSlider.addEventListener('input', () => renderGrid(Number(sizeSlider.value)));
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
  const itemTileCount = validateCoordinateMap(coordinateMap, 20);
  const routeTileCount = validateRouteSegments(routeSegments, coordinateMap, 20);
  if (validation && itemTileCount + routeTileCount !== validation.reservedTiles) {
    throw new Error(`Reserved tile count is ${itemTileCount + routeTileCount}, expected ${validation.reservedTiles}.`);
  }
}
renderWorkflow();
renderGrid(Number(sizeSlider.value));
