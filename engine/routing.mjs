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
