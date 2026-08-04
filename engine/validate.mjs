import { diagnostic } from './utils.mjs';
import { internalTransportRect } from './internal-transport.mjs';

const HARD_CODES = new Set(['SCHEMA', 'OUT_OF_BOUNDS', 'COLLISION', 'ROUTE_GAP', 'FURNACE_MISSED', 'PORTABLE_UNREACHABLE', 'PORTABLE_BEFORE_CAP', 'ITEM_ILLEGAL', 'USE_LIMIT', 'ORE_SIZE', 'WRONG_LANE']);
const conveyorRules = {
  'Quarter Conveyor': { width: 1, length: 1 },
  'Half Conveyor': { width: 2, length: 1 },
  'Normal Conveyor': { width: 2, length: 2 },
  'Supercharged Conveyor': { width: 2, length: 2 },
  'Centering Conveyor': { width: 2, length: 2 },
  'Ultracharged Conveyor': { width: 4, length: 2 },
  'Conveyor Wall': { width: 1, length: 2, wall: true },
};

const cellKey = (x, y) => `${x},${y}`;
const rectCells = (rect) => {
  const cells = [];
  for (let y = rect.y; y < rect.y + rect.height; y += 1) for (let x = rect.x; x < rect.x + rect.width; x += 1) cells.push({ x, y });
  return cells;
};

function itemPathCells(item, rules) {
  const path = internalTransportRect(item, rules);
  return path ? rectCells(path) : [];
}

function dropFrontCells(item) {
  const across = item.itemWidth % 2 === 0 ? 2 : 1;
  if (item.direction === 'east' || item.direction === 'west') {
    const y = item.y + (item.height - across) / 2;
    const x = item.direction === 'east' ? item.x + item.width : item.x - 1;
    return Array.from({ length: across }, (_, offset) => ({ x, y: y + offset }));
  }
  const x = item.x + (item.width - across) / 2;
  const y = item.direction === 'south' ? item.y + item.height : item.y - 1;
  return Array.from({ length: across }, (_, offset) => ({ x: x + offset, y }));
}

function connectivityDiagnostics(plan, rules) {
  const traversable = new Set();
  plan.conveyors.filter((entry) => !entry.wall && entry.conveyor !== 'Conveyor Wall')
    .forEach((entry) => rectCells(entry).forEach(({ x, y }) => traversable.add(cellKey(x, y))));
  plan.items.forEach((entry) => itemPathCells(entry, rules).forEach(({ x, y }) => traversable.add(cellKey(x, y))));
  const starts = plan.items.filter((item) => item.type === 'dropper').flatMap(dropFrontCells).filter(({ x, y }) => traversable.has(cellKey(x, y)));
  const furnace = plan.items.find((item) => item.type === 'furnace');
  const goals = new Set(rectCells(plan.furnaceZone ?? furnace ?? {}).map(({ x, y }) => cellKey(x, y)));
  goals.forEach((goal) => traversable.add(goal));
  if (!starts.length) return [diagnostic('ROUTE_GAP', 'No dropper output connects to the route.')];
  if (!furnace || !goals.size) return [diagnostic('FURNACE_MISSED', 'The furnace processing zone is missing.')];
  const queue = [...starts];
  const visited = new Set(queue.map(({ x, y }) => cellKey(x, y)));
  while (queue.length) {
    const current = queue.shift();
    if (goals.has(cellKey(current.x, current.y))) return [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = cellKey(next.x, next.y);
      if (!traversable.has(key) || visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return [diagnostic('FURNACE_MISSED', 'The physical route does not reach the furnace processing zone.')];
}

export function validatePlan(plan, rules) {
  const diagnostics = [];
  if (plan.version !== 1 || !Array.isArray(plan.items) || !Array.isArray(plan.conveyors) || !Array.isArray(plan.route)) {
    return { valid: false, diagnostics: [diagnostic('SCHEMA', 'Plan version or required arrays are invalid.')] };
  }
  const plotSize = plan.profile?.plotSize;
  const itemCells = new Map();
  for (const item of plan.items) {
    const horizontal = item.direction === 'east' || item.direction === 'west';
    const expected = item.type === 'portable'
      ? (horizontal ? { width: item.itemWidth, height: item.itemLength } : { width: item.itemLength, height: item.itemWidth })
      : (horizontal ? { width: item.itemLength, height: item.itemWidth } : { width: item.itemWidth, height: item.itemLength });
    if (item.width !== expected.width || item.height !== expected.height) diagnostics.push(diagnostic('SCHEMA', `${item.name} has an invalid rotated footprint.`, { item: item.id, expected }));
    if (item.type === 'dropper' && item.conveyorWidth !== 0) diagnostics.push(diagnostic('SCHEMA', `${item.name} must not render an internal conveyor.`));
    for (const cell of rectCells(item)) {
      if (cell.x < 1 || cell.y < 1 || cell.x > plotSize || cell.y > plotSize) diagnostics.push(diagnostic('OUT_OF_BOUNDS', `${item.name} is outside the plot.`, { cell }));
      const key = cellKey(cell.x, cell.y);
      if (itemCells.has(key)) diagnostics.push(diagnostic('COLLISION', `${item.name} overlaps ${itemCells.get(key)}.`, { cell }));
      itemCells.set(key, item.name);
    }
  }
  const conveyorCells = new Map();
  for (const conveyor of plan.conveyors) {
    const rule = conveyorRules[conveyor.conveyor];
    if (!rule) diagnostics.push(diagnostic('SCHEMA', `Unknown conveyor type: ${conveyor.conveyor}.`));
    else {
      const horizontal = conveyor.direction === 'east' || conveyor.direction === 'west';
      const expected = horizontal ? { width: rule.length, height: rule.width } : { width: rule.width, height: rule.length };
      if (conveyor.width !== expected.width || conveyor.height !== expected.height) diagnostics.push(diagnostic('SCHEMA', `${conveyor.name} has an invalid footprint.`, { expected }));
    }
    for (const cell of rectCells(conveyor)) {
      const key = cellKey(cell.x, cell.y);
      if (cell.x < 1 || cell.y < 1 || cell.x > plotSize || cell.y > plotSize) diagnostics.push(diagnostic('OUT_OF_BOUNDS', `${conveyor.name} is outside the plot.`, { cell }));
      if (itemCells.has(key)) diagnostics.push(diagnostic('COLLISION', `${conveyor.name} overlaps ${itemCells.get(key)}.`, { cell }));
      if (conveyorCells.has(key)) diagnostics.push(diagnostic('COLLISION', `${conveyor.name} overlaps ${conveyorCells.get(key)}.`, { cell }));
      conveyorCells.set(key, conveyor.name);
    }
  }
  const quarterAt = new Map(plan.conveyors.filter((entry) => entry.conveyor === 'Quarter Conveyor').map((entry) => [cellKey(entry.x, entry.y), entry]));
  for (const conveyor of quarterAt.values()) {
    const horizontal = conveyor.direction === 'east' || conveyor.direction === 'west';
    const side = quarterAt.get(horizontal ? cellKey(conveyor.x, conveyor.y + 1) : cellKey(conveyor.x + 1, conveyor.y));
    const alongOffsets = [-1, 1];
    const partOfFull = alongOffsets.some((offset) => horizontal
      ? quarterAt.get(cellKey(conveyor.x + offset, conveyor.y))?.direction === conveyor.direction
        && quarterAt.get(cellKey(conveyor.x + offset, conveyor.y + 1))?.direction === conveyor.direction
      : quarterAt.get(cellKey(conveyor.x, conveyor.y + offset))?.direction === conveyor.direction
        && quarterAt.get(cellKey(conveyor.x + 1, conveyor.y + offset))?.direction === conveyor.direction);
    if (side?.direction === conveyor.direction && !partOfFull) diagnostics.push(diagnostic('SCHEMA', `Quarter pair at ${conveyor.x},${conveyor.y} must be a Half Conveyor.`));
    const block = [conveyor, quarterAt.get(cellKey(conveyor.x + 1, conveyor.y)), quarterAt.get(cellKey(conveyor.x, conveyor.y + 1)), quarterAt.get(cellKey(conveyor.x + 1, conveyor.y + 1))];
    if (block.every((entry) => entry?.direction === conveyor.direction)) diagnostics.push(diagnostic('SCHEMA', `Quarter block at ${conveyor.x},${conveyor.y} must be a full conveyor.`));
  }
  const halves = new Map(plan.conveyors.filter((entry) => entry.conveyor === 'Half Conveyor').map((entry) => [cellKey(entry.x, entry.y), entry]));
  for (const conveyor of halves.values()) {
    const horizontal = conveyor.direction === 'east' || conveyor.direction === 'west';
    const next = halves.get(horizontal ? cellKey(conveyor.x + 1, conveyor.y) : cellKey(conveyor.x, conveyor.y + 1));
    if (next?.direction === conveyor.direction) diagnostics.push(diagnostic('SCHEMA', `Half pair at ${conveyor.x},${conveyor.y} must be a full conveyor.`));
  }
  diagnostics.push(...connectivityDiagnostics(plan, rules));
  diagnostics.push(...(plan.diagnostics ?? []).filter((entry) => HARD_CODES.has(entry.code)));
  const unique = [...new Map(diagnostics.map((entry) => [`${entry.code}|${entry.message}|${JSON.stringify(entry.context ?? {})}`, entry])).values()];
  return { valid: !unique.some((entry) => HARD_CODES.has(entry.code)), diagnostics: unique };
}
