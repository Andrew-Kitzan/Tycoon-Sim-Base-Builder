import { diagnostic, normalize } from './utils.mjs';

const DIRECTIONS = ['north', 'east', 'south', 'west'];
const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' };

function gridSize(item, direction) {
  const horizontal = direction === 'east' || direction === 'west';
  if (isPortable(item)) return horizontal
    ? { width: item.size.width, height: item.size.length }
    : { width: item.size.length, height: item.size.width };
  return horizontal
    ? { width: item.size.length, height: item.size.width }
    : { width: item.size.width, height: item.size.length };
}

function isPortable(item) {
  return /Portable Upgrader|Portable Spinner|Ore Glazer|Derp Blaster|Dragon/i.test(item.name);
}

function across(item) {
  return item.size.width % 2 === 0 ? 2 : 1;
}

function rectCells(rect) {
  const cells = [];
  for (let y = rect.y; y < rect.y + rect.height; y += 1) for (let x = rect.x; x < rect.x + rect.width; x += 1) cells.push({ x, y });
  return cells;
}

function key(cell) { return `${cell.x},${cell.y}`; }

function internalPorts(placed) {
  const pathWidth = across(placed.item);
  const horizontal = placed.direction === 'east' || placed.direction === 'west';
  if (horizontal) {
    const y = placed.y + (placed.height - pathWidth) / 2;
    const entryX = placed.direction === 'east' ? placed.x : placed.x + placed.width - 1;
    const exitX = placed.direction === 'east' ? placed.x + placed.width - 1 : placed.x;
    return {
      entry: Array.from({ length: pathWidth }, (_, offset) => ({ x: entryX, y: y + offset })),
      exit: Array.from({ length: pathWidth }, (_, offset) => ({ x: exitX, y: y + offset })),
    };
  }
  const x = placed.x + (placed.width - pathWidth) / 2;
  const entryY = placed.direction === 'south' ? placed.y : placed.y + placed.height - 1;
  const exitY = placed.direction === 'south' ? placed.y + placed.height - 1 : placed.y;
  return {
    entry: Array.from({ length: pathWidth }, (_, offset) => ({ x: x + offset, y: entryY })),
    exit: Array.from({ length: pathWidth }, (_, offset) => ({ x: x + offset, y: exitY })),
  };
}

function dropCells(placed) {
  const ports = internalPorts(placed);
  return ports.exit.map((cell) => {
    if (placed.direction === 'east') return { x: cell.x + 1, y: cell.y };
    if (placed.direction === 'west') return { x: cell.x - 1, y: cell.y };
    if (placed.direction === 'south') return { x: cell.x, y: cell.y + 1 };
    return { x: cell.x, y: cell.y - 1 };
  });
}

function furnaceZone(placed, rules) {
  const override = rules.furnaceOverrides[placed.item.name] ?? rules.defaultFurnaceZone;
  const { across: zoneAcross, depth, placement } = override;
  if (placement === 'front-corner') {
    if (placed.direction === 'south') return { x: placed.x, y: placed.y + placed.height - depth, width: zoneAcross, height: depth };
    if (placed.direction === 'west') return { x: placed.x, y: placed.y, width: depth, height: zoneAcross };
    if (placed.direction === 'north') return { x: placed.x + placed.width - zoneAcross, y: placed.y, width: zoneAcross, height: depth };
    return { x: placed.x + placed.width - depth, y: placed.y + placed.height - zoneAcross, width: depth, height: zoneAcross };
  }
  if (placed.direction === 'west') return { x: placed.x, y: placed.y + (placed.height - zoneAcross) / 2, width: depth, height: zoneAcross };
  if (placed.direction === 'east') return { x: placed.x + placed.width - depth, y: placed.y + (placed.height - zoneAcross) / 2, width: depth, height: zoneAcross };
  if (placed.direction === 'north') return { x: placed.x + (placed.width - zoneAcross) / 2, y: placed.y, width: zoneAcross, height: depth };
  return { x: placed.x + (placed.width - zoneAcross) / 2, y: placed.y + placed.height - depth, width: zoneAcross, height: depth };
}

function neighbors(cell, plotSize) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy }))
    .filter((next) => next.x >= 1 && next.y >= 1 && next.x <= plotSize && next.y <= plotSize);
}

function aStar(starts, goals, blocked, plotSize) {
  const goalKeys = new Set(goals.map(key));
  const queue = starts.map((cell) => ({ cell, cost: 0, score: 0 }));
  const cameFrom = new Map();
  const costs = new Map(starts.map((cell) => [key(cell), 0]));
  const heuristic = (cell) => Math.min(...goals.map((goal) => Math.abs(cell.x - goal.x) + Math.abs(cell.y - goal.y)));
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift();
    const currentKey = key(current.cell);
    if (goalKeys.has(currentKey)) {
      const path = [current.cell];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        const prior = cameFrom.get(cursor);
        path.push(prior.cell);
        cursor = prior.key;
      }
      return path.reverse();
    }
    for (const next of neighbors(current.cell, plotSize)) {
      const nextKey = key(next);
      if (blocked.has(nextKey) && !goalKeys.has(nextKey)) continue;
      const turnPenalty = current.previousDirection && current.previousDirection !== `${next.x - current.cell.x},${next.y - current.cell.y}` ? 0.2 : 0;
      const nextCost = current.cost + 1 + turnPenalty;
      if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, nextCost);
      cameFrom.set(nextKey, { key: currentKey, cell: current.cell });
      const direction = `${next.x - current.cell.x},${next.y - current.cell.y}`;
      queue.push({ cell: next, cost: nextCost, score: nextCost + heuristic(next), previousDirection: direction });
    }
  }
  return null;
}

function dominoCells(state) {
  return state.orientation === 'h'
    ? [{ x: state.x, y: state.y }, { x: state.x + 1, y: state.y }]
    : [{ x: state.x, y: state.y }, { x: state.x, y: state.y + 1 }];
}

function dominoState(cells) {
  if (cells.length !== 2) return null;
  const sorted = [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
  if (sorted[0].y === sorted[1].y && sorted[1].x === sorted[0].x + 1) return { x: sorted[0].x, y: sorted[0].y, orientation: 'h' };
  if (sorted[0].x === sorted[1].x && sorted[1].y === sorted[0].y + 1) return { x: sorted[0].x, y: sorted[0].y, orientation: 'v' };
  return null;
}

function adjacentGoalStates(goals) {
  const goalSet = new Set(goals.map(key));
  const states = [];
  for (const cell of goals) {
    if (goalSet.has(`${cell.x + 1},${cell.y}`)) states.push({ x: cell.x, y: cell.y, orientation: 'h' });
    if (goalSet.has(`${cell.x},${cell.y + 1}`)) states.push({ x: cell.x, y: cell.y, orientation: 'v' });
  }
  return states;
}

function aStarWide(starts, goals, blocked, plotSize) {
  const start = dominoState(starts);
  const goalStates = adjacentGoalStates(goals);
  if (!start || !goalStates.length) return null;
  const stateKey = (state) => `${state.x},${state.y},${state.orientation}`;
  const goalKeys = new Set(goalStates.map(stateKey));
  const clear = (state) => dominoCells(state).every((cell) => cell.x >= 1 && cell.y >= 1 && cell.x <= plotSize && cell.y <= plotSize && !blocked.has(key(cell)));
  const queue = [{ state: start, cost: 0, score: 0 }];
  const costs = new Map([[stateKey(start), 0]]);
  const cameFrom = new Map();
  const heuristic = (state) => Math.min(...goalStates.map((goal) => Math.abs(state.x - goal.x) + Math.abs(state.y - goal.y) + (state.orientation === goal.orientation ? 0 : 0.2)));
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift();
    const currentKey = stateKey(current.state);
    if (goalKeys.has(currentKey)) {
      const states = [current.state];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        const prior = cameFrom.get(cursor);
        states.push(prior.state);
        cursor = prior.key;
      }
      states.reverse();
      const cells = new Map();
      states.forEach((state, index) => {
        const next = states[index + 1];
        const dx = next ? next.x - state.x : state.x - (states[index - 1]?.x ?? state.x);
        const dy = next ? next.y - state.y : state.y - (states[index - 1]?.y ?? state.y);
        const flowDirection = Math.abs(dx) >= Math.abs(dy) && dx !== 0 ? (dx > 0 ? 'east' : 'west') : dy !== 0 ? (dy > 0 ? 'south' : 'north') : (state.orientation === 'v' ? 'east' : 'south');
        dominoCells(state).forEach((cell) => cells.set(key(cell), { ...cell, flowDirection }));
        if (next && next.orientation !== state.orientation) {
          const all = [...dominoCells(state), ...dominoCells(next)];
          const minX = Math.min(...all.map((cell) => cell.x));
          const minY = Math.min(...all.map((cell) => cell.y));
          for (let y = minY; y < minY + 2; y += 1) for (let x = minX; x < minX + 2; x += 1) cells.set(key({ x, y }), { x, y, flowDirection });
        }
      });
      return [...cells.values()];
    }
    const translations = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: current.state.x + dx, y: current.state.y + dy, orientation: current.state.orientation }));
    const rotations = current.state.orientation === 'h'
      ? [{ x: current.state.x, y: current.state.y, orientation: 'v' }, { x: current.state.x + 1, y: current.state.y, orientation: 'v' }, { x: current.state.x, y: current.state.y - 1, orientation: 'v' }, { x: current.state.x + 1, y: current.state.y - 1, orientation: 'v' }]
      : [{ x: current.state.x, y: current.state.y, orientation: 'h' }, { x: current.state.x, y: current.state.y + 1, orientation: 'h' }, { x: current.state.x - 1, y: current.state.y, orientation: 'h' }, { x: current.state.x - 1, y: current.state.y + 1, orientation: 'h' }];
    for (const next of [...translations, ...rotations]) {
      if (!clear(next)) continue;
      if (next.orientation !== current.state.orientation) {
        const all = [...dominoCells(current.state), ...dominoCells(next)];
        const minX = Math.min(...all.map((cell) => cell.x));
        const minY = Math.min(...all.map((cell) => cell.y));
        let sweptClear = true;
        for (let y = minY; y < minY + 2; y += 1) for (let x = minX; x < minX + 2; x += 1) if (blocked.has(key({ x, y }))) sweptClear = false;
        if (!sweptClear) continue;
      }
      const nextKey = stateKey(next);
      const nextCost = current.cost + (next.orientation === current.state.orientation ? 1 : 1.2);
      if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, nextCost);
      cameFrom.set(nextKey, { key: currentKey, state: current.state });
      queue.push({ state: next, cost: nextCost, score: nextCost + heuristic(next) });
    }
  }
  return null;
}

function widenPath(path, starts, goals, blocked, plotSize) {
  const directedPath = path.map((cell, index) => ({ ...cell, flowDirection: pathDirection(cell, path[index + 1], pathDirection(path[index - 1] ?? cell, cell, 'east')) }));
  if (starts.length !== 2 || goals.length < 2) return { cells: directedPath, valid: true };
  const result = new Map(directedPath.map((cell) => [key(cell), cell]));
  const startKeys = new Set(starts.map(key));
  const goalKeys = new Set(goals.map(key));
  let previousCompanion = null;
  let valid = true;
  for (let index = 0; index < path.length; index += 1) {
    const current = path[index];
    const prior = path[index - 1];
    const next = path[index + 1];
    const horizontal = (next ? next.y === current.y : prior?.y === current.y);
    const candidates = horizontal
      ? [{ x: current.x, y: current.y - 1 }, { x: current.x, y: current.y + 1 }]
      : [{ x: current.x - 1, y: current.y }, { x: current.x + 1, y: current.y }];
    const legal = candidates.filter((cell) => cell.x >= 1 && cell.y >= 1 && cell.x <= plotSize && cell.y <= plotSize
      && (!blocked.has(key(cell)) || startKeys.has(key(cell)) || goalKeys.has(key(cell))));
    legal.sort((a, b) => {
      const score = (cell) => (startKeys.has(key(cell)) || goalKeys.has(key(cell)) ? 100 : 0)
        + (previousCompanion && Math.abs(cell.x - previousCompanion.x) + Math.abs(cell.y - previousCompanion.y) === 1 ? 10 : 0);
      return score(b) - score(a);
    });
    if (!legal.length) { valid = false; continue; }
    previousCompanion = legal[0];
    result.set(key(previousCompanion), { ...previousCompanion, flowDirection: directedPath[index].flowDirection });
    if (prior && next && (prior.x !== next.x && prior.y !== next.y)) {
      const cornerFill = { x: prior.x + next.x - current.x, y: prior.y + next.y - current.y };
      if (blocked.has(key(cornerFill)) && !startKeys.has(key(cornerFill)) && !goalKeys.has(key(cornerFill))) valid = false;
      else result.set(key(cornerFill), { ...cornerFill, flowDirection: directedPath[index].flowDirection });
    }
  }
  return { cells: [...result.values()], valid };
}

function pathDirection(current, next, fallback) {
  if (!next) return fallback;
  if (next.x > current.x) return 'east';
  if (next.x < current.x) return 'west';
  if (next.y > current.y) return 'south';
  return 'north';
}

function compressQuarterConveyors(conveyors) {
  const byCell = new Map(conveyors.map((conveyor) => [key(conveyor), conveyor]));
  const consumed = new Set();
  const output = [];
  const consumeBlock = (cells, conveyor, x, y, width, height) => {
    cells.forEach((cell) => consumed.add(key(cell)));
    output.push({ ...conveyor, x, y, width, height });
  };
  for (const conveyor of conveyors) {
    if (consumed.has(key(conveyor))) continue;
    const block = [
      conveyor,
      byCell.get(`${conveyor.x + 1},${conveyor.y}`),
      byCell.get(`${conveyor.x},${conveyor.y + 1}`),
      byCell.get(`${conveyor.x + 1},${conveyor.y + 1}`),
    ];
    if (block.every((cell) => cell && !consumed.has(key(cell)) && cell.direction === conveyor.direction)) {
      consumeBlock(block, { ...conveyor, conveyor: 'Supercharged Conveyor', speed: 18 }, conveyor.x, conveyor.y, 2, 2);
    }
  }
  for (const conveyor of conveyors) {
    if (consumed.has(key(conveyor))) continue;
    const horizontal = conveyor.direction === 'east' || conveyor.direction === 'west';
    const neighbor = byCell.get(horizontal ? `${conveyor.x},${conveyor.y + 1}` : `${conveyor.x + 1},${conveyor.y}`);
    if (neighbor && !consumed.has(key(neighbor)) && neighbor.direction === conveyor.direction) {
      consumeBlock([conveyor, neighbor], { ...conveyor, conveyor: 'Half Conveyor', speed: 12 }, conveyor.x, conveyor.y, horizontal ? 1 : 2, horizontal ? 2 : 1);
    }
  }
  for (const conveyor of conveyors) if (!consumed.has(key(conveyor))) output.push(conveyor);
  return output.map((conveyor, index) => ({ ...conveyor, id: `conveyor-${index + 1}`, name: `${conveyor.conveyor} ${index + 1}` }));
}

function groupRows(items, plotSize) {
  const rows = [];
  let row = [];
  let length = 0;
  for (const item of items) {
    const needed = item.size.length + (row.length ? 1 : 0);
    if (row.length && length + needed > plotSize - 2) {
      rows.push(row);
      row = [];
      length = 0;
    }
    row.push(item);
    length += item.size.length + (row.length > 1 ? 1 : 0);
  }
  if (row.length) rows.push(row);
  return rows;
}

export function autoLayout({ dropper, droppers = null, chain, furnace, plotSize, rules }) {
  const dropperItems = droppers?.length ? droppers : [dropper];
  const primaryDropper = dropperItems[0];
  const portableItems = chain.filter(isPortable);
  const logicalItems = [primaryDropper, ...chain.filter((item) => !isPortable(item)), furnace];
  const rows = groupRows(logicalItems, plotSize);
  const placed = [];
  let rowTop = 1;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const travelDirection = rowIndex % 2 === 0 ? 'east' : 'west';
    const rowHeight = Math.max(...row.map((item) => item.size.width));
    const laneOffset = Math.max(...row.map((item) => (item.size.width - across(item)) / 2));
    const centerLine = rowTop + laneOffset;
    let cursor = travelDirection === 'east' ? 2 : plotSize - 1;
    for (const item of row) {
      const isFurnace = item === furnace;
      const direction = isFurnace ? opposite[travelDirection] : travelDirection;
      const size = gridSize(item, direction);
      const x = travelDirection === 'east' ? cursor : cursor - size.width + 1;
      const y = centerLine - (item.size.width - across(item)) / 2;
      placed.push({ id: `item-${placed.length + 1}`, item, x, y, ...size, direction, type: item.type });
      cursor += travelDirection === 'east' ? size.width + 1 : -(size.width + 1);
    }
    // A centered two-wide lane needs a full 2x2 corner between packed rows.
    rowTop += rowHeight + 2;
  }

  const diagnostics = [];
  for (const item of placed) {
    if (item.x < 1 || item.y < 1 || item.x + item.width - 1 > plotSize || item.y + item.height - 1 > plotSize) diagnostics.push(diagnostic('OUT_OF_BOUNDS', `${item.item.name} does not fit.`, { item }));
  }
  const occupancy = new Map();
  for (const item of placed) for (const cell of rectCells(item)) {
    const cellKey = key(cell);
    if (occupancy.has(cellKey)) diagnostics.push(diagnostic('COLLISION', `${item.item.name} overlaps ${occupancy.get(cellKey)}.`, { cell }));
    occupancy.set(cellKey, item.item.name);
  }

  const conveyors = [];
  const route = [];
  const connections = [];
  let firstMergeTargets = [];
  for (let index = 0; index < placed.length - 1; index += 1) {
    const current = placed[index];
    const next = placed[index + 1];
    if (current.item.type !== 'dropper') route.push({ kind: 'item', id: current.id });
    const starts = current.item.type === 'dropper' ? dropCells(current) : internalPorts(current).exit;
    const target = next.item.type === 'furnace' ? rectCells(furnaceZone(next, rules)) : internalPorts(next).entry;
    const blocked = new Set(occupancy.keys());
    starts.forEach((cell) => blocked.delete(key(cell)));
    target.forEach((cell) => blocked.delete(key(cell)));
    const widePath = starts.length === 2 ? aStarWide(starts, target, blocked, plotSize) : null;
    const path = widePath ?? aStar(starts, target, blocked, plotSize);
    if (!path) {
      diagnostics.push(diagnostic('ROUTE_GAP', `No conveyor path from ${current.item.name} to ${next.item.name}.`, { from: current.id, to: next.id }));
      continue;
    }
    const routedCells = widePath ?? widenPath(path, starts, target, blocked, plotSize).cells;
    const externalCells = routedCells.filter((cell) => !occupancy.has(key(cell)));
    const laneWidth = starts.length === 2 && target.length >= 2 ? 2 : 1;
    const effectiveSpeed = laneWidth === 2 ? 16.8 : 12;
    connections.push({ from: current, to: next, seconds: externalCells.length * 3 / (laneWidth * effectiveSpeed) });
    if (index === 0) firstMergeTargets = externalCells.length ? externalCells : target;
    externalCells.forEach((cell, pathIndex) => {
      const direction = cell.flowDirection ?? pathDirection(cell, externalCells[pathIndex + 1], next.direction);
      const conveyor = { id: `conveyor-${conveyors.length + 1}`, name: `Quarter Conveyor ${conveyors.length + 1}`, conveyor: 'Quarter Conveyor', x: cell.x, y: cell.y, width: 1, height: 1, direction, speed: 12 };
      conveyors.push(conveyor);
      route.push({ kind: 'conveyor', id: conveyor.id });
    });
  }
  for (const extraDropper of dropperItems.slice(1)) {
    const existingConveyors = new Set(conveyors.map(key));
    const placements = [];
    for (const direction of DIRECTIONS) {
      const size = gridSize(extraDropper, direction);
      for (let y = 1; y <= plotSize - size.height + 1; y += 1) for (let x = 1; x <= plotSize - size.width + 1; x += 1) {
        const candidate = { id: `item-${placed.length + 1}`, item: extraDropper, x, y, ...size, direction, type: 'dropper' };
        const cells = rectCells(candidate);
        if (cells.some((cell) => occupancy.has(key(cell)) || existingConveyors.has(key(cell)))) continue;
        const drops = dropCells(candidate);
        if (drops.some((cell) => cell.x < 1 || cell.y < 1 || cell.x > plotSize || cell.y > plotSize)) continue;
        const distance = Math.min(...drops.flatMap((cell) => firstMergeTargets.map((goal) => Math.abs(cell.x - goal.x) + Math.abs(cell.y - goal.y))));
        placements.push({ candidate, drops, distance });
      }
    }
    placements.sort((a, b) => a.distance - b.distance);
    let merged = null;
    for (const option of placements) {
      const blocked = new Set([...occupancy.keys(), ...existingConveyors]);
      option.drops.forEach((cell) => blocked.delete(key(cell)));
      firstMergeTargets.forEach((cell) => blocked.delete(key(cell)));
      const widePath = option.drops.length === 2 ? aStarWide(option.drops, firstMergeTargets, blocked, plotSize) : null;
      const path = widePath ?? aStar(option.drops, firstMergeTargets, blocked, plotSize);
      if (!path) continue;
      const widened = widePath ? { cells: widePath, valid: true } : widenPath(path, option.drops, firstMergeTargets, blocked, plotSize);
      if (!widened.valid) continue;
      merged = { ...option, path: widened.cells };
      break;
    }
    if (!merged) {
      diagnostics.push(diagnostic('ROUTE_GAP', `No pre-upgrader merge fits for an additional ${extraDropper.name}.`));
      continue;
    }
    placed.push(merged.candidate);
    rectCells(merged.candidate).forEach((cell) => occupancy.set(key(cell), extraDropper.name));
    const externalMergeCells = merged.path.filter((cell) => !occupancy.has(key(cell)) && !existingConveyors.has(key(cell)));
    externalMergeCells.forEach((cell, index) => {
      const direction = cell.flowDirection ?? pathDirection(cell, externalMergeCells[index + 1], primaryDropper.direction);
      conveyors.push({ id: `conveyor-${conveyors.length + 1}`, name: `Quarter Conveyor ${conveyors.length + 1}`, conveyor: 'Quarter Conveyor', x: cell.x, y: cell.y, width: 1, height: 1, direction, speed: 12 });
    });
  }
  const furnacePlaced = placed.find((entry) => entry.item === furnace);
  const conveyorCells = new Set(conveyors.map(key));
  const portableDirections = ['south', 'north', 'east', 'west'];
  let portableCursor = 0;
  for (const item of portableItems) {
    let portable = null;
    for (let offset = portableCursor; offset < conveyors.length && !portable; offset += 1) {
      const target = conveyors[offset];
      for (const direction of portableDirections) {
        const size = gridSize(item, direction);
        const x = direction === 'south' || direction === 'north'
          ? target.x - Math.floor((size.width - 1) / 2)
          : direction === 'east' ? target.x - size.width : target.x + 1;
        const y = direction === 'east' || direction === 'west'
          ? target.y - Math.floor((size.height - 1) / 2)
          : direction === 'south' ? target.y - size.height : target.y + 1;
        const candidate = { id: `item-${placed.length + 1}`, item, x, y, ...size, direction, type: 'portable' };
        const cells = rectCells(candidate);
        if (cells.some((cell) => cell.x < 1 || cell.y < 1 || cell.x > plotSize || cell.y > plotSize)) continue;
        if (cells.some((cell) => occupancy.has(key(cell)) || conveyorCells.has(key(cell)))) continue;
        portable = candidate;
        cells.forEach((cell) => occupancy.set(key(cell), item.name));
        portableCursor = offset + 1;
        break;
      }
    }
    if (portable) placed.push(portable);
    else diagnostics.push(diagnostic('PORTABLE_UNREACHABLE', `${item.name} has no legal footprint beside the route.`, { item: item.key }));
  }
  const compressed = compressQuarterConveyors(conveyors);
  const sequenceQueues = new Map();
  [...dropperItems, ...chain, furnace].forEach((item, sequenceIndex) => {
    const queue = sequenceQueues.get(item) ?? [];
    queue.push(sequenceIndex);
    sequenceQueues.set(item, queue);
  });
  placed.forEach((entry) => { entry.sequenceIndex = sequenceQueues.get(entry.item).shift(); });
  const compiledConnections = connections.map((connection) => ({
    fromSequence: connection.from.sequenceIndex,
    toSequence: connection.to.sequenceIndex,
    seconds: connection.seconds,
  }));
  return {
    items: placed,
    conveyors: compressed,
    route: compressed.map((conveyor) => ({ kind: 'conveyor', id: conveyor.id })),
    connections: compiledConnections,
    diagnostics,
    furnaceZone: furnaceZone(furnacePlaced, rules),
    dropCells: placed.filter((entry) => entry.type === 'dropper').flatMap(dropCells),
  };
}

export function expandRoute(layout) {
  const items = new Map(layout.items.map((item) => [item.id, item]));
  const conveyors = new Map(layout.conveyors.map((item) => [item.id, item]));
  return layout.route.map((entry) => entry.kind === 'item' ? items.get(entry.id) : conveyors.get(entry.id));
}
