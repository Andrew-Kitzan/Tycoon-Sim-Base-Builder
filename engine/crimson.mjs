import { internalTransportRect } from './internal-transport.mjs';

export const CRIMSON_PHANTOM_WINDOW_SECONDS = 15;
export const CRIMSON_PHANTOM_MINIMUM_DELAY_SECONDS = 1;
export const CRIMSON_PHANTOM_LIFETIME_SECONDS = 30;

export function isCrimsonPillars(item) {
  return item?.name === 'Crimson Pillars';
}

const cellKey = ({ x, y }) => `${x},${y}`;

function rectangleCells(rect) {
  const result = [];
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) result.push({ x, y });
  }
  return result;
}

export function isCrimsonWallLandingCell(crimson, cell, rules = {}) {
  if (!isCrimsonPillars(crimson) || !cell) return false;
  const path = internalTransportRect(crimson, rules);
  if (!path) return false;
  const crimsonCells = new Set(rectangleCells(crimson).map(cellKey));
  const pathCells = new Set(rectangleCells(path).map(cellKey));
  return crimsonCells.has(cellKey(cell)) && !pathCells.has(cellKey(cell));
}

export function crimsonPhantomZoneCorridor(
  components,
  sourceIndex,
  windowSeconds = CRIMSON_PHANTOM_WINDOW_SECONDS,
  minimumDelaySeconds = CRIMSON_PHANTOM_MINIMUM_DELAY_SECONDS,
) {
  const candidates = [];
  let elapsedSeconds = 0;
  const randomWindowSeconds = Math.max(0, windowSeconds - minimumDelaySeconds);
  for (let index = sourceIndex + 1; index < components.length && elapsedSeconds < windowSeconds; index += 1) {
    const component = components[index];
    const durationSeconds = Math.max(0, Number(component.seconds ?? 0));
    const componentStartSeconds = elapsedSeconds;
    const componentEndSeconds = elapsedSeconds + durationSeconds;
    const startSeconds = Math.max(minimumDelaySeconds, componentStartSeconds);
    const endSeconds = Math.min(windowSeconds, componentEndSeconds);
    const spawnProbability = randomWindowSeconds > 0 ? Math.max(0, endSeconds - startSeconds) / randomWindowSeconds : 0;
    if (component.path && spawnProbability > 0) candidates.push({
      componentId: component.id,
      name: component.name,
      direction: component.direction,
      path: { ...component.path },
      startSeconds,
      endSeconds,
      spawnProbability,
    });
    elapsedSeconds += durationSeconds;
  }
  return {
    minimumDelaySeconds,
    windowSeconds,
    routeSeconds: Math.min(windowSeconds, elapsedSeconds),
    spawnBeforeFurnaceProbability: candidates.reduce((total, candidate) => total + candidate.spawnProbability, 0),
    candidates,
  };
}

export function crimsonPhantomZoneEstimate(components, sourceIndex, options = {}) {
  const dropRate = Math.max(0, Number(options.dropRate ?? 0));
  const zoneLifetimeSeconds = Math.max(0, Number(options.zoneLifetimeSeconds ?? CRIMSON_PHANTOM_LIFETIME_SECONDS));
  const corridor = crimsonPhantomZoneCorridor(
    components,
    sourceIndex,
    Number(options.windowSeconds ?? CRIMSON_PHANTOM_WINDOW_SECONDS),
    Number(options.minimumDelaySeconds ?? CRIMSON_PHANTOM_MINIMUM_DELAY_SECONDS),
  );
  const expectedSpawnsPerSecond = dropRate * corridor.spawnBeforeFurnaceProbability;
  return {
    ...corridor,
    dropRate,
    zoneLifetimeSeconds,
    expectedSpawnsPerMinute: expectedSpawnsPerSecond * 60,
    expectedActiveZones: expectedSpawnsPerSecond * zoneLifetimeSeconds,
    candidates: corridor.candidates.map((candidate) => ({
      ...candidate,
      expectedSpawnsPerMinute: dropRate * candidate.spawnProbability * 60,
      expectedActiveZones: dropRate * candidate.spawnProbability * zoneLifetimeSeconds,
    })),
  };
}
