import { findItem } from './database.mjs';
import { appliedEffectsForItem, applyDeterministicItem, itemRequirements } from './models.mjs';
import { buildLegalPool } from './profile.mjs';
import { internalTransportProfile, internalTransportRect } from './internal-transport.mjs';
import { itemKey, normalize, parseRange } from './utils.mjs';
import { validatePlan } from './validate.mjs';
import { isFastTurnBlocked } from './routing.mjs';
import { exceedsItemUseLimit, firstOreSizeViolation, itemUseLimit, maximumAcceptedOreSize } from './item-constraints.mjs';
import { crimsonPhantomZoneEstimate, isCrimsonPillars } from './crimson.mjs';
import { connectTeleporterPairs, teleporterJumps } from './teleporters.mjs';

const conveyorDefinitions = {
  'Quarter Conveyor': { width: 1, length: 1, speed: 12 },
  'Half Conveyor': { width: 2, length: 1, speed: 12 },
  'Normal Conveyor': { width: 2, length: 2, speed: 12 },
  'Supercharged Conveyor': { width: 2, length: 2, speed: 18 },
  'Centering Conveyor': { width: 2, length: 2, speed: 12, centers: true },
  'Ultracharged Conveyor': { width: 4, length: 2, speed: 24 },
  'Conveyor Wall': { width: 1, length: 2, speed: null, wall: true },
  'Red Teleporter Sender': { width: 2, length: 2, speed: null, teleporterColor: 'red', teleporterRole: 'sender' },
  'Red Teleporter Receiver': { width: 4, length: 2, speed: 12, teleporterColor: 'red', teleporterRole: 'receiver' },
  'Blue Teleporter Sender': { width: 2, length: 2, speed: null, teleporterColor: 'blue', teleporterRole: 'sender' },
  'Blue Teleporter Receiver': { width: 4, length: 2, speed: 12, teleporterColor: 'blue', teleporterRole: 'receiver' },
};

const portablePattern = /Portable Upgrader|Portable Spinner|Ore Glazer|Derp Blaster|Dragon/i;
const key = ({ x, y }) => `${x},${y}`;
const cells = ({ x, y, width, height }) => {
  const result = [];
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) result.push({ x: column, y: row });
  }
  return result;
};

export function parseGridCoordinate(value) {
  const match = /^([A-Z]+)(\d+)$/i.exec(String(value).trim());
  if (!match) throw new Error(`Invalid grid coordinate: ${value}`);
  const x = [...match[1].toUpperCase()].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0);
  return { x, y: Number(match[2]) };
}

function parseGridRange(value) {
  const [first, second = first] = String(value).split(':');
  const start = parseGridCoordinate(first);
  const end = parseGridCoordinate(second);
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x) + 1,
    height: Math.abs(end.y - start.y) + 1,
  };
}

function columnName(number) {
  let value = number;
  let output = '';
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}

function gridRange(entry) {
  const first = `${columnName(entry.x)}${entry.y}`;
  const last = `${columnName(entry.x + entry.width - 1)}${entry.y + entry.height - 1}`;
  return first === last ? first : `${first}:${last}`;
}

export function coordinateMapFromPlan(plan, profileName = 'current-build') {
  return {
    stage: 4,
    status: 'optimization-candidate',
    accepted: false,
    plotSize: plan.profile.plotSize,
    profile: profileName,
    items: (plan.items ?? []).map((item) => ({
      order: item.order,
      name: item.name,
      variant: item.variant,
      topLeft: `${columnName(item.x)}${item.y}`,
      bottomRight: `${columnName(item.x + item.width - 1)}${item.y + item.height - 1}`,
      facing: item.direction,
      section: item.type === 'capgrader' ? 'capgrader' : item.type === 'furnace' ? 'furnace' : 'post-cap',
    })),
    conveyorRuns: (plan.conveyors ?? []).map((conveyor) => ({
      type: conveyor.conveyor,
      cells: gridRange(conveyor),
      facing: conveyor.direction,
      ...(conveyor.lane ? { lane: conveyor.lane } : {}),
    })),
  };
}

function renderType(item) {
  if (portablePattern.test(item.name)) return 'portable';
  return item.type;
}

function rotatedSize(item, direction, type = renderType(item)) {
  const horizontal = direction === 'east' || direction === 'west';
  if (type === 'portable') return horizontal
    ? { width: item.size.width, height: item.size.length }
    : { width: item.size.length, height: item.size.width };
  return horizontal
    ? { width: item.size.length, height: item.size.width }
    : { width: item.size.width, height: item.size.length };
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

function furnaceZone(item, rules) {
  const definition = rules.furnaceOverrides[item.name] ?? rules.defaultFurnaceZone;
  const across = definition.across;
  const depth = definition.depth;
  if (definition.placement === 'front-corner') {
    if (item.direction === 'south') return { x: item.x, y: item.y + item.height - depth, width: across, height: depth };
    if (item.direction === 'west') return { x: item.x, y: item.y, width: depth, height: across };
    if (item.direction === 'north') return { x: item.x + item.width - across, y: item.y, width: across, height: depth };
    return { x: item.x + item.width - depth, y: item.y + item.height - across, width: depth, height: across };
  }
  if (item.direction === 'west') return { x: item.x, y: item.y + (item.height - across) / 2, width: depth, height: across };
  if (item.direction === 'east') return { x: item.x + item.width - depth, y: item.y + (item.height - across) / 2, width: depth, height: across };
  if (item.direction === 'north') return { x: item.x + (item.width - across) / 2, y: item.y, width: across, height: depth };
  return { x: item.x + (item.width - across) / 2, y: item.y + item.height - depth, width: across, height: depth };
}

function normalizeItems(map, database, rules) {
  return map.items.map((saved, index) => {
    const definition = findItem(database, saved.name, saved.variant);
    if (!definition) throw new Error(`${saved.variant} ${saved.name} is missing from the database.`);
    const topLeft = parseGridCoordinate(saved.topLeft);
    const bottomRight = parseGridCoordinate(saved.bottomRight);
    const type = renderType(definition);
    const size = rotatedSize(definition, saved.facing, type);
    const transport = ['dropper', 'portable', 'furnace'].includes(type)
      ? null
      : internalTransportProfile(definition, rules);
    return {
      id: `item-${index + 1}`,
      order: saved.order ?? index + 1,
      name: definition.name,
      variant: definition.variant,
      type,
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x + 1,
      height: bottomRight.y - topLeft.y + 1,
      expectedWidth: size.width,
      expectedHeight: size.height,
      itemWidth: definition.size.width,
      itemLength: definition.size.length,
      conveyorWidth: transport?.across ?? 0,
      conveyorOffset: transport?.northOffset ?? 0,
      direction: saved.facing,
      beam: saved.beam,
      section: saved.section,
      definition,
    };
  });
}

function normalizeConveyors(map) {
  const output = [];
  for (const run of map.conveyorRuns) {
    const definition = conveyorDefinitions[run.type];
    if (!definition) throw new Error(`Unknown conveyor type: ${run.type}`);
    const range = parseGridRange(run.cells);
    const horizontal = run.facing === 'east' || run.facing === 'west';
    const unit = horizontal
      ? { width: definition.length, height: definition.width }
      : { width: definition.width, height: definition.length };
    if (run.type === 'Quarter Conveyor') {
      for (const cell of cells(range)) output.push({
        id: `conveyor-${output.length + 1}`,
        name: `${run.type} ${output.length + 1}`,
        conveyor: run.type,
        x: cell.x,
        y: cell.y,
        width: 1,
        height: 1,
        direction: run.facing,
        speed: definition.speed,
        travelLength: 1,
        lane: run.lane,
        teleporterColor: definition.teleporterColor,
        teleporterRole: definition.teleporterRole,
      });
      continue;
    }
    if (range.width % unit.width || range.height % unit.height) {
      throw new Error(`${run.type} run ${run.cells} cannot be divided into ${unit.width}x${unit.height} units.`);
    }
    for (let y = range.y; y < range.y + range.height; y += unit.height) {
      for (let x = range.x; x < range.x + range.width; x += unit.width) output.push({
        id: `conveyor-${output.length + 1}`,
        name: `${run.type} ${output.length + 1}`,
        conveyor: run.type,
        x,
        y,
        width: unit.width,
        height: unit.height,
        direction: run.facing,
        speed: definition.speed,
        travelLength: definition.length,
        centers: definition.centers ?? false,
        wall: definition.wall ?? false,
        nonTransport: definition.wall ?? false,
        lane: run.lane,
        teleporterColor: definition.teleporterColor,
        teleporterRole: definition.teleporterRole,
      });
    }
  }
  return output;
}

function exitTargets(component) {
  const ownCells = cells(component.path);
  if (component.direction === 'east') {
    const edge = Math.max(...ownCells.map((cell) => cell.x));
    return ownCells.filter((cell) => cell.x === edge).map((cell) => ({ x: cell.x + 1, y: cell.y }));
  }
  if (component.direction === 'west') {
    const edge = Math.min(...ownCells.map((cell) => cell.x));
    return ownCells.filter((cell) => cell.x === edge).map((cell) => ({ x: cell.x - 1, y: cell.y }));
  }
  if (component.direction === 'south') {
    const edge = Math.max(...ownCells.map((cell) => cell.y));
    return ownCells.filter((cell) => cell.y === edge).map((cell) => ({ x: cell.x, y: cell.y + 1 }));
  }
  const edge = Math.min(...ownCells.map((cell) => cell.y));
  return ownCells.filter((cell) => cell.y === edge).map((cell) => ({ x: cell.x, y: cell.y - 1 }));
}

function routeComponents(items, conveyors, rules) {
  const result = conveyors.filter((conveyor) => !conveyor.wall && !conveyor.nonTransport).map((conveyor) => ({
    id: conveyor.id,
    kind: 'conveyor',
    name: conveyor.conveyor,
    direction: conveyor.direction,
    speed: conveyor.speed,
    seconds: conveyor.speed > 0 ? conveyor.travelLength * 3 / conveyor.speed : 0,
    centers: conveyor.centers,
    lane: conveyor.lane,
    teleporterColor: conveyor.teleporterColor,
    teleporterRole: conveyor.teleporterRole,
    path: { x: conveyor.x, y: conveyor.y, width: conveyor.width, height: conveyor.height },
  }));
  for (const item of items) {
    const path = internalTransportRect(item, rules);
    if (!path) continue;
    result.push({
      id: item.id,
      kind: 'item',
      name: item.name,
      variant: item.variant,
      direction: item.direction,
      speed: Number(item.definition.conveyorSpeed),
      seconds: item.itemLength * 3 / Number(item.definition.conveyorSpeed),
      centers: false,
      path,
      item,
    });
  }
  return result;
}

function componentGraph(components) {
  const byCell = new Map();
  for (const component of components) {
    for (const cell of cells(component.path)) {
      const entries = byCell.get(key(cell)) ?? [];
      entries.push(component);
      byCell.set(key(cell), entries);
    }
  }
  const physicalGraph = new Map();
  for (const component of components) {
    const next = new Set(exitTargets(component).flatMap((target) => byCell.get(key(target)) ?? []).filter((entry) => entry.id !== component.id));
    physicalGraph.set(component.id, [...next]);
  }
  const linked = connectTeleporterPairs(components, physicalGraph);
  return { graph: linked.graph, byCell, teleporterDiagnostics: linked.diagnostics };
}

function findDirectedPath(starts, graph, zone) {
  const goalKeys = new Set(cells(zone).map(key));
  const queue = starts.map((component) => ({ component, path: [component] }));
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current.component.id)) continue;
    visited.add(current.component.id);
    if (exitTargets(current.component).some((cell) => goalKeys.has(key(cell)))
      || cells(current.component.path).some((cell) => goalKeys.has(key(cell)))) return current.path;
    for (const next of graph.get(current.component.id) ?? []) queue.push({ component: next, path: [...current.path, next] });
  }
  return null;
}

function portableBeamCells(item, rules) {
  const length = item.name === 'Portable Spinner' ? rules.portableSpinnerBeamRadius : rules.defaultPortableBeamLength;
  const result = [];
  for (const footprintCell of cells(item)) {
    for (let distance = 1; distance <= length; distance += 1) {
      if (item.direction === 'east') result.push({ x: item.x + item.width - 1 + distance, y: footprintCell.y });
      if (item.direction === 'west') result.push({ x: item.x - distance, y: footprintCell.y });
      if (item.direction === 'south') result.push({ x: footprintCell.x, y: item.y + item.height - 1 + distance });
      if (item.direction === 'north') result.push({ x: footprintCell.x, y: item.y - distance });
    }
  }
  return [...new Map(result.map((cell) => [key(cell), cell])).values()];
}

function firstPortableBeamCells(item) {
  const result = [];
  for (const footprintCell of cells(item)) {
    if (item.direction === 'east') result.push({ x: item.x + item.width, y: footprintCell.y });
    if (item.direction === 'west') result.push({ x: item.x - 1, y: footprintCell.y });
    if (item.direction === 'south') result.push({ x: footprintCell.x, y: item.y + item.height });
    if (item.direction === 'north') result.push({ x: footprintCell.x, y: item.y - 1 });
  }
  return [...new Map(result.map((cell) => [key(cell), cell])).values()];
}

function movePortableForward(item) {
  if (item.direction === 'east') return { ...item, x: item.x + 1 };
  if (item.direction === 'west') return { ...item, x: item.x - 1 };
  if (item.direction === 'south') return { ...item, y: item.y + 1 };
  return { ...item, y: item.y - 1 };
}

function routeValue(path, portables, dropper, profile, rules) {
  let state = { value: dropper.definition.mainStat, survival: 1, replication: 1, oreSize: dropper.definition.oreSize ?? 1, effects: appliedEffectsForItem(dropper.definition, rules), timeSeconds: 0, area: 0 };
  const stages = [];
  const useCounts = new Map();
  const nextUseNumber = (item) => {
    const useKey = normalize(item.name);
    const useNumber = (useCounts.get(useKey) ?? 0) + 1;
    useCounts.set(useKey, useNumber);
    return useNumber;
  };
  const finalCapIndex = path.reduce((last, component, index) => (
    component.kind === 'item' && (component.item.section === 'capgrader' || parseRange(component.item.definition.range)) ? index : last
  ), -1);
  const portableHits = portables
    .map((portable) => ({ portable, index: path.findIndex((component) => portableBeamCells(portable, rules).some((cell) => cells(component.path).some((routeCell) => key(routeCell) === key(cell)))) }))
    .filter((entry) => entry.index > finalCapIndex)
    .sort((left, right) => left.index - right.index || left.portable.order - right.portable.order);
  for (let index = 0; index < path.length; index += 1) {
    const component = path[index];
    if (component.kind === 'item') {
      const before = state.value;
      const beforeOreSize = state.oreSize;
      const beforeSurvival = state.survival;
      const range = parseRange(component.item.definition.range);
      const useNumber = nextUseNumber(component.item.definition);
      state = applyDeterministicItem(component.item.definition, state, useNumber, profile, rules);
      stages.push({ item: component.item, componentIndex: index, before, after: state.value, beforeOreSize, afterOreSize: state.oreSize, survivalBefore: beforeSurvival, survivalAfter: state.survival, range, useNumber, useLimit: itemUseLimit(component.item.definition) });
    } else state.timeSeconds += component.seconds;
    for (const { portable } of portableHits.filter((entry) => entry.index === index)) {
      const before = state.value;
      const beforeOreSize = state.oreSize;
      const useNumber = nextUseNumber(portable.definition);
      state = applyDeterministicItem(portable.definition, state, useNumber, profile, rules);
      stages.push({ item: portable, componentIndex: index, before, after: state.value, beforeOreSize, afterOreSize: state.oreSize, range: null, useNumber, useLimit: itemUseLimit(portable.definition) });
    }
  }
  return { ...state, stages };
}

export function validateCoordinateMap({ map, database, rules, profile }) {
  const diagnostics = [];
  const items = normalizeItems(map, database, rules);
  const conveyors = normalizeConveyors(map);
  const legalPool = buildLegalPool(database, profile, rules);
  diagnostics.push(...legalPool.diagnostics);
  const legalKeys = new Set(legalPool.legal.map((item) => itemKey(item.name, item.variant)));
  for (const item of items) {
    if (!legalKeys.has(itemKey(item.name, item.variant))) diagnostics.push({ code: 'ITEM_ILLEGAL', message: `${item.variant} ${item.name} is not legal for this player profile.` });
  }
  for (const item of items) {
    if (item.width !== item.expectedWidth || item.height !== item.expectedHeight) diagnostics.push({ code: 'SCHEMA', message: `${item.variant} ${item.name} is ${item.width}x${item.height}; expected ${item.expectedWidth}x${item.expectedHeight}.` });
  }
  const furnace = items.find((item) => item.type === 'furnace');
  const zone = furnace ? furnaceZone(furnace, rules) : null;
  const plan = {
    version: 1,
    profile,
    items,
    conveyors,
    route: [],
    furnaceZone: zone,
    diagnostics: [],
  };
  const physical = validatePlan(plan, rules);
  diagnostics.push(...physical.diagnostics);

  const components = routeComponents(items, conveyors, rules);
  const { graph, byCell, teleporterDiagnostics } = componentGraph(components);
  diagnostics.push(...teleporterDiagnostics);
  const droppers = items.filter((item) => item.type === 'dropper');
  const portables = items.filter((item) => item.type === 'portable');
  const turnBlockers = [...conveyors.filter((entry) => entry.wall || entry.nonTransport), ...portables];
  const routes = [];
  const routePaths = [];
  for (const dropper of droppers) {
    const starts = [...new Set(dropFrontCells(dropper).flatMap((cell) => byCell.get(key(cell)) ?? []))];
    const path = zone ? findDirectedPath(starts, graph, zone) : null;
    if (!path) {
      diagnostics.push({ code: 'ROUTE_GAP', message: `${dropper.name} ${dropper.order} has no directed route to the furnace processing zone.` });
      continue;
    }
    const unsafeTurns = [];
    for (let index = 1; index < path.length; index += 1) {
      const before = path[index - 1];
      const after = path[index];
      if (before.direction !== after.direction
        && before.speed > rules.safeTurnSpeed
        && !isFastTurnBlocked(before, after, turnBlockers)) {
        unsafeTurns.push({ at: after.path, incomingSpeed: before.speed, from: before.name, to: after.name });
      }
    }
    if (unsafeTurns.length) diagnostics.push({ code: 'TURN_SPEED', message: `${dropper.name} ${dropper.order} reaches a turn above ${rules.safeTurnSpeed} speed.`, context: unsafeTurns });
    const routeItems = path.filter((component) => component.kind === 'item').map((component) => component.item);
    let lane = dropper.direction === path[0]?.direction ? 'center' : 'unknown';
    for (const component of path) {
      if (component.centers) lane = 'center';
      if (component.lane) lane = component.lane;
      if (component.kind !== 'item') continue;
      const requirements = itemRequirements(component.item.definition, rules);
      if (requirements.requiredLane && lane !== requirements.requiredLane) diagnostics.push({ code: 'WRONG_LANE', message: `${dropper.name} ${dropper.order} is not guaranteed in the ${requirements.requiredLane} lane before ${component.name} ${component.item.order}.` });
      if (requirements.outputLane) lane = requirements.outputLane;
    }
    const simulated = routeValue(path, portables, dropper, profile, rules);
    const firstOversizedStage = firstOreSizeViolation(simulated.stages);
    for (const stage of simulated.stages) {
      if (stage.range && (stage.before < stage.range.minimum || stage.before > stage.range.maximum)) diagnostics.push({
        code: 'CAP_RANGE',
        message: `${dropper.name} ${dropper.order} enters ${stage.item.name} at $${stage.before.toFixed(2)}, outside $${stage.range.minimum}-$${stage.range.maximum}.`,
      });
      if (exceedsItemUseLimit(stage.item.definition, stage.useNumber) && stage.useNumber === stage.useLimit + 1) diagnostics.push({
        code: 'USE_LIMIT',
        message: `${dropper.name} ${dropper.order} reaches ${stage.item.variant} ${stage.item.name} ${stage.item.order} for use ${stage.useNumber}, exceeding its limit of ${stage.useLimit} use${stage.useLimit === 1 ? '' : 's'} per ore.`,
      });
      if (stage === firstOversizedStage) {
        const maximum = maximumAcceptedOreSize(stage.item.definition);
        diagnostics.push({
          code: 'ORE_SIZE',
          message: `${dropper.name} ${dropper.order} enters ${stage.item.variant} ${stage.item.name} ${stage.item.order} at ore size ${stage.beforeOreSize.toFixed(3)}, above its maximum confirmed acceptable size ${maximum}.`,
        });
      }
    }
    const finalCapStage = simulated.stages.filter((stage) => stage.range).at(-1);
    const dropRate = Number(dropper.definition.dropSpeed ?? 0);
    const phantomZones = simulated.stages.filter((stage) => isCrimsonPillars(stage.item.definition)).map((stage) => {
      const estimate = crimsonPhantomZoneEstimate(
        path,
        stage.componentIndex,
        {
          dropRate: dropRate * Number(stage.survivalAfter ?? 1),
          minimumDelaySeconds: Number(rules.crimsonPillars?.minimumTriggerSeconds ?? 1),
          windowSeconds: Number(rules.crimsonPillars?.markWindowSeconds ?? 15),
          zoneLifetimeSeconds: Number(rules.crimsonPillars?.phantomZoneLifetimeSeconds ?? 30),
        },
      );
      return {
        sourceItemId: stage.item.id,
        sourceItemOrder: stage.item.order,
        variant: stage.item.variant,
        multiplier: Number(stage.item.definition.mainStat ?? 1),
        sourceDropRate: dropRate,
        dropIntervalSeconds: dropRate > 0 ? 1 / dropRate : null,
        ...estimate,
      };
    });
    routes.push({
      dropperOrder: dropper.order,
      dropper: `${dropper.variant} ${dropper.name}`,
      seconds: path.reduce((total, component) => total + component.seconds, 0),
      componentIds: path.map((component) => component.id),
      items: routeItems.map((item) => `${item.variant} ${item.name}`),
      unsafeTurns,
      teleporterJumps: teleporterJumps(path),
      phantomZones,
      valueBeforeFurnace: simulated.value,
      finalCapgrader: finalCapStage ? {
        name: finalCapStage.item.name,
        input: finalCapStage.before,
        cap: finalCapStage.range.maximum,
        ratio: finalCapStage.before / finalCapStage.range.maximum,
      } : null,
    });
    routePaths.push({ dropper, path });
  }

  const routeCellKeys = new Set(routePaths.flatMap(({ path }) => path.flatMap((component) => cells(component.path).map(key))));
  const occupiedItemCells = new Set(items.flatMap((item) => cells(item).map(key)));
  for (const portable of portables) {
    const beamHits = portableBeamCells(portable, rules).some((cell) => routeCellKeys.has(key(cell)));
    if (!beamHits) {
      diagnostics.push({ code: 'PORTABLE_UNREACHABLE', message: `${portable.variant} ${portable.name} ${portable.order} does not face or reach the ore route.` });
      continue;
    }
    const legalPostCapHit = routePaths.some(({ path }) => {
      const finalCapIndex = path.reduce((last, component, index) => (
        component.kind === 'item' && (component.item.section === 'capgrader' || parseRange(component.item.definition.range)) ? index : last
      ), -1);
      return path.some((component, index) => index > finalCapIndex
        && portableBeamCells(portable, rules).some((cell) => cells(component.path).some((routeCell) => key(routeCell) === key(cell))));
    });
    if (!legalPostCapHit) diagnostics.push({ code: 'PORTABLE_BEFORE_CAP', message: `${portable.variant} ${portable.name} ${portable.order} touches ore before the final capgrader.` });
    if (!firstPortableBeamCells(portable).some((cell) => routeCellKeys.has(key(cell)))) {
      const moved = movePortableForward(portable);
      const originalCells = new Set(cells(portable).map(key));
      const canMoveCloser = cells(moved).every((cell) => (
        cell.x >= 1 && cell.y >= 1 && cell.x <= map.plotSize && cell.y <= map.plotSize
        && (originalCells.has(key(cell)) || !occupiedItemCells.has(key(cell)))
      ));
      if (canMoveCloser) diagnostics.push({ code: 'PORTABLE_SPACING', message: `${portable.variant} ${portable.name} ${portable.order} is one tile farther from the route than necessary.` });
    }
  }
  const uniqueDiagnostics = [...new Map(diagnostics.map((entry) => [`${entry.code}|${entry.message}`, entry])).values()];
  const routeTimes = routes.map((route) => route.seconds);
  const oresPerSecond = droppers.reduce((total, dropper) => total + Number(dropper.definition.dropSpeed ?? 0), 0);
  const projectedActiveOres = routes.reduce((total, route) => {
    const dropper = droppers.find((entry) => entry.order === route.dropperOrder);
    return total + route.seconds * Number(dropper?.definition.dropSpeed ?? 0);
  }, 0);
  const throughputScale = Math.min(1, rules.oreCap / Math.max(1, projectedActiveOres));
  for (const route of routes) {
    for (const zone of route.phantomZones ?? []) {
      zone.throughputScale = throughputScale;
      zone.dropRate *= throughputScale;
      zone.dropIntervalSeconds = zone.dropRate > 0 ? 1 / zone.dropRate : null;
      zone.expectedSpawnsPerMinute = zone.dropRate * zone.spawnBeforeFurnaceProbability * 60;
      zone.expectedActiveZones = zone.dropRate * zone.spawnBeforeFurnaceProbability * zone.zoneLifetimeSeconds;
      zone.candidates.forEach((candidate) => {
        candidate.expectedSpawnsPerMinute = zone.dropRate * candidate.spawnProbability * 60;
        candidate.expectedActiveZones = zone.dropRate * candidate.spawnProbability * zone.zoneLifetimeSeconds;
      });
    }
  }
  const furnaceEntriesPerMinute = oresPerSecond * throughputScale * 60;
  const furnaceMultiplier = Number(furnace?.definition.mainStat ?? 0);
  const expectedCashPerMinute = routes.reduce((total, route) => {
    const dropper = droppers.find((entry) => entry.order === route.dropperOrder);
    return total + Number(dropper?.definition.dropSpeed ?? 0) * throughputScale * 60 * route.valueBeforeFurnace * furnaceMultiplier;
  }, 0);
  const reservedTiles = items.reduce((total, item) => total + item.width * item.height, 0)
    + conveyors.reduce((total, conveyor) => total + conveyor.width * conveyor.height, 0);
  const blockingCodes = new Set(['SCHEMA', 'OUT_OF_BOUNDS', 'COLLISION', 'ROUTE_GAP', 'FURNACE_MISSED', 'TELEPORTER_PAIR', 'PORTABLE_UNREACHABLE', 'PORTABLE_BEFORE_CAP', 'PORTABLE_SPACING', 'USE_LIMIT', 'ORE_SIZE', 'WRONG_LANE', 'TURN_SPEED', 'CAP_RANGE']);
  return {
    valid: routes.length === droppers.length && !uniqueDiagnostics.some((entry) => blockingCodes.has(entry.code)),
    diagnostics: uniqueDiagnostics,
    normalizedPlan: plan,
    routes,
    metrics: {
      routeTimeSeconds: routeTimes.length ? Math.max(...routeTimes) : 0,
      averageRouteTimeSeconds: routeTimes.length ? routeTimes.reduce((sum, value) => sum + value, 0) / routeTimes.length : 0,
      projectedActiveOres,
      cappedActiveOres: Math.min(rules.oreCap, projectedActiveOres),
      rawOresPerSecond: oresPerSecond,
      throughputScale,
      furnaceEntriesPerMinute,
      expectedCashPerMinute,
      reservedTiles,
      remainingTiles: Math.max(0, map.plotSize ** 2 - reservedTiles),
    },
    furnaceZone: zone,
    portableUsesPerOre: portables.length,
  };
}
