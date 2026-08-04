const cells = (rect) => {
  const output = [];
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) output.push({ x, y });
  }
  return output;
};

const key = ({ x, y }) => `${x},${y}`;

function exitTargets(component) {
  const rect = component.path ?? component;
  const own = cells(rect);
  if (component.direction === 'east') {
    const edge = Math.max(...own.map((cell) => cell.x));
    return own.filter((cell) => cell.x === edge).map((cell) => ({ x: cell.x + 1, y: cell.y }));
  }
  if (component.direction === 'west') {
    const edge = Math.min(...own.map((cell) => cell.x));
    return own.filter((cell) => cell.x === edge).map((cell) => ({ x: cell.x - 1, y: cell.y }));
  }
  if (component.direction === 'south') {
    const edge = Math.max(...own.map((cell) => cell.y));
    return own.filter((cell) => cell.y === edge).map((cell) => ({ x: cell.x, y: cell.y + 1 }));
  }
  const edge = Math.min(...own.map((cell) => cell.y));
  return own.filter((cell) => cell.y === edge).map((cell) => ({ x: cell.x, y: cell.y - 1 }));
}

export function turnOutsideCells(before, after) {
  if (!before || !after || before.direction === after.direction) return [];
  const afterRect = after.path ?? after;
  const afterKeys = new Set(cells(afterRect).map(key));
  const junction = exitTargets(before).filter((cell) => afterKeys.has(key(cell)));
  if (!junction.length) return [];
  if (before.direction === 'east') {
    const x = afterRect.x + afterRect.width;
    return junction.map((cell) => ({ x, y: cell.y }));
  }
  if (before.direction === 'west') {
    return junction.map((cell) => ({ x: afterRect.x - 1, y: cell.y }));
  }
  if (before.direction === 'south') {
    const y = afterRect.y + afterRect.height;
    return junction.map((cell) => ({ x: cell.x, y }));
  }
  return junction.map((cell) => ({ x: cell.x, y: afterRect.y - 1 }));
}

export function isFastTurnBlocked(before, after, blockers = []) {
  const outside = turnOutsideCells(before, after);
  if (!outside.length) return false;
  const blockedCells = new Set(blockers.flatMap((blocker) => cells(blocker.path ?? blocker)).map(key));
  return outside.every((cell) => blockedCells.has(key(cell)));
}

export function routeFalloffCells(path = [], dropper = null, plotSize = Infinity, hasConnectedTransport = () => false) {
  const last = path.at(-1);
  let targets;
  if (last) {
    targets = exitTargets(last);
  } else if (dropper) {
    const across = dropper.itemWidth % 2 === 0 ? 2 : 1;
    if (dropper.direction === 'east' || dropper.direction === 'west') {
      const x = dropper.direction === 'east' ? dropper.x + dropper.width : dropper.x - 1;
      const y = dropper.y + (dropper.height - across) / 2;
      targets = Array.from({ length: across }, (_, offset) => ({ x, y: y + offset }));
    } else {
      const x = dropper.x + (dropper.width - across) / 2;
      const y = dropper.direction === 'south' ? dropper.y + dropper.height : dropper.y - 1;
      targets = Array.from({ length: across }, (_, offset) => ({ x: x + offset, y }));
    }
  } else {
    return [];
  }
  const visible = targets.filter(({ x, y }) => x >= 1 && y >= 1 && x <= plotSize && y <= plotSize);
  if (visible.length || !last) return visible.filter((cell) => !hasConnectedTransport(cell));
  return cells(last.path ?? last).filter(({ x, y }) => {
    if (last.direction === 'east') return x === last.path.x + last.path.width - 1;
    if (last.direction === 'west') return x === last.path.x;
    if (last.direction === 'south') return y === last.path.y + last.path.height - 1;
    return y === last.path.y;
  });
}

export function routeFailureKind({ hasStart, pathIds = [], nextIds = [], exitCells = [], plotSize = Infinity }) {
  if (!hasStart) return 'unconnected-output';
  if (nextIds.some((id) => pathIds.includes(id))) return 'loop';
  if (nextIds.length) return 'direction-blocked';
  if (exitCells.length && exitCells.every(({ x, y }) => x < 1 || y < 1 || x > plotSize || y > plotSize)) return 'plot-boundary';
  return 'gap';
}
