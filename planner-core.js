(function initializePlannerCore(global) {
  'use strict';

  const DIRECTIONS = ['north', 'east', 'south', 'west'];
  const CONVEYORS = {
    'Quarter Conveyor': { width: 1, length: 1, speed: 12 },
    'Half Conveyor': { width: 2, length: 1, speed: 12 },
    'Normal Conveyor': { width: 2, length: 2, speed: 12 },
    'Supercharged Conveyor': { width: 2, length: 2, speed: 18 },
    'Centering Conveyor': { width: 2, length: 2, speed: 12, centersOre: true },
    'Ultracharged Conveyor': { width: 4, length: 2, speed: 24 },
  };
  const EFFECT_DEFINITIONS = {
    Fire: { timerSeconds: 2, sourceTimerSeconds: { "Dragon's Breath": 3 }, appliedBy: ['Ore Flamethrower', "Dragon's Breath", 'Fire Crystal Dropper', 'Pineapple Dropper'], removedBy: ['Oasis Cleanser', "Leviathans' Wrath", 'Ore Wash'] },
    Nuclear: { timerSeconds: 3, appliedBy: ['Nuclear Upgrader', 'Meltdown Dropper'], immuneDroppers: ['Uranium Dropper', 'Meltdown Dropper'], removedBy: ['Ore Wash'] },
    Toxic: { timerSeconds: 5, appliedBy: ['Acid Plant'], immuneDroppers: ['Uranium Dropper'], removedBy: ['Ore Wash'] },
    Overcharged: { timerSeconds: 3, appliedBy: ['Chartreuse Collider'], removedBy: [] },
    Derp: { appliedBy: ['Derp Blaster', 'Godly Stone Dropper'], removedBy: [] },
    Sparkles: { appliedBy: ['Cupcake-inator', 'Godly Stone Dropper'], removedBy: [] },
    Rainbow: { appliedBy: ['Prismatic Upgrader'], removedBy: [] },
    Electrified: { appliedBy: ['Scarabyte Dropper', 'Electric Overdrive', 'Robot Apocalypse'], removedBy: [] },
    Frost: { appliedBy: ['Shark Dropper', "Leviathans' Wrath"], removedBy: [] },
    Neon: { appliedBy: ['Fire Crystal Dropper', 'Netrozite Dropper', 'Slushie Dropper', 'Kunzite Dropper', 'Meltdown Dropper', 'Sugarbomb Dropper', 'Martian Tech', 'Electric Overdrive'], removedBy: ['Ore Glazer'] },
  };
  const EFFECT_CLEARERS = ['Chartreuse Collider'];
  const CRIMSON_PHANTOM_WINDOW_SECONDS = 15;

  function assertDirection(direction) {
    if (!DIRECTIONS.includes(direction)) throw new Error(`Invalid direction: ${direction}`);
  }

  function parseSize(value) {
    const match = String(value ?? '').trim().match(/^(\d+)\s*[x\u00d7]\s*(\d+)$/i);
    if (!match) return null;
    return { width: Number(match[1]), length: Number(match[2]) };
  }

  function rotatedFootprint(width, length, direction) {
    assertDirection(direction);
    const horizontal = direction === 'east' || direction === 'west';
    return horizontal
      ? { width: length, height: width }
      : { width, height: length };
  }

  function cellsInRect(rect) {
    const cells = [];
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      for (let x = rect.x; x < rect.x + rect.width; x += 1) cells.push({ x, y });
    }
    return cells;
  }

  function turnOutsideCells(before, after) {
    if (!before || !after || before.direction === after.direction) return [];
    const beforeRect = before.path ?? before;
    const afterRect = after.path ?? after;
    const beforeCells = cellsInRect(beforeRect);
    const afterKeys = new Set(cellsInRect(afterRect).map((cell) => `${cell.x},${cell.y}`));
    let exits;
    if (before.direction === 'east') {
      const edge = Math.max(...beforeCells.map((cell) => cell.x));
      exits = beforeCells.filter((cell) => cell.x === edge).map((cell) => ({ x: cell.x + 1, y: cell.y }));
    } else if (before.direction === 'west') {
      const edge = Math.min(...beforeCells.map((cell) => cell.x));
      exits = beforeCells.filter((cell) => cell.x === edge).map((cell) => ({ x: cell.x - 1, y: cell.y }));
    } else if (before.direction === 'south') {
      const edge = Math.max(...beforeCells.map((cell) => cell.y));
      exits = beforeCells.filter((cell) => cell.y === edge).map((cell) => ({ x: cell.x, y: cell.y + 1 }));
    } else {
      const edge = Math.min(...beforeCells.map((cell) => cell.y));
      exits = beforeCells.filter((cell) => cell.y === edge).map((cell) => ({ x: cell.x, y: cell.y - 1 }));
    }
    const junction = exits.filter((cell) => afterKeys.has(`${cell.x},${cell.y}`));
    if (before.direction === 'east') return junction.map((cell) => ({ x: afterRect.x + afterRect.width, y: cell.y }));
    if (before.direction === 'west') return junction.map((cell) => ({ x: afterRect.x - 1, y: cell.y }));
    if (before.direction === 'south') return junction.map((cell) => ({ x: cell.x, y: afterRect.y + afterRect.height }));
    return junction.map((cell) => ({ x: cell.x, y: afterRect.y - 1 }));
  }

  function isFastTurnBlocked(before, after, blockers = []) {
    const outside = turnOutsideCells(before, after);
    if (!outside.length) return false;
    const blocked = new Set(blockers.flatMap((entry) => cellsInRect(entry.path ?? entry)).map((cell) => `${cell.x},${cell.y}`));
    return outside.every((cell) => blocked.has(`${cell.x},${cell.y}`));
  }

  function centeredTransportGeometry(item) {
    if (['dropper', 'portable', 'furnace'].includes(item.type)) return null;
    const horizontal = item.direction === 'east' || item.direction === 'west';
    const across = item.itemWidth % 2 === 0 ? 2 : 1;
    return horizontal
      ? {
        x: item.x,
        y: item.y + (item.height - across) / 2,
        width: item.width,
        height: across,
      }
      : {
        x: item.x + (item.width - across) / 2,
        y: item.y,
        width: across,
        height: item.height,
      };
  }

  function furnaceProcessingZone(item) {
    if (!item || item.type !== 'furnace') return null;
    const across = item.processingZoneAcross ?? 2;
    const depth = item.processingZoneDepth ?? (item.name.includes('Krakatoa') ? 1 : 2);
    const corner = item.processingZonePlacement === 'front-corner';
    if (corner) {
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

  function frontCells(item, outside = false) {
    const across = item.itemWidth % 2 === 0 ? 2 : 1;
    const horizontal = item.direction === 'east' || item.direction === 'west';
    const cells = [];
    if (horizontal) {
      const x = item.direction === 'east'
        ? item.x + item.width - (outside ? 0 : 1)
        : item.x - (outside ? 1 : 0);
      const y = item.y + (item.height - across) / 2;
      for (let offset = 0; offset < across; offset += 1) cells.push({ x, y: y + offset });
    } else {
      const y = item.direction === 'south'
        ? item.y + item.height - (outside ? 0 : 1)
        : item.y - (outside ? 1 : 0);
      const x = item.x + (item.width - across) / 2;
      for (let offset = 0; offset < across; offset += 1) cells.push({ x: x + offset, y });
    }
    return cells;
  }

  function createItem(definition, placement) {
    const direction = placement.direction ?? 'east';
    assertDirection(direction);
    const size = definition.size ?? { width: definition.width, length: definition.length };
    if (!size?.width || !size?.length) throw new Error(`${definition.name} has no valid database size.`);
    const footprint = rotatedFootprint(size.width, size.length, direction);
    const item = {
      id: placement.id ?? `${definition.name}:${placement.x},${placement.y}`,
      name: definition.name,
      variant: definition.variant ?? 'Base',
      type: definition.type,
      itemWidth: size.width,
      itemLength: size.length,
      x: placement.x,
      y: placement.y,
      direction,
      ...footprint,
      stats: { ...(definition.stats ?? {}), ...(placement.stats ?? {}) },
    };

    item.internalTransport = centeredTransportGeometry(item);
    item.dropPoint = item.type === 'dropper'
      ? { lane: 'center', cells: frontCells(item, true) }
      : null;
    if (item.type === 'furnace') {
      item.processingZoneAcross = definition.processingZoneAcross ?? 2;
      item.processingZoneDepth = definition.processingZoneDepth ?? (item.name.includes('Krakatoa') ? 1 : 2);
      item.processingZonePlacement = definition.processingZonePlacement
        ?? (/Proficient Furnace|Toxic Wasteland/.test(item.name) ? 'front-corner' : 'front-center');
      item.processingZone = furnaceProcessingZone(item);
    }
    item.conveyorWidth = item.internalTransport
      ? (item.itemWidth % 2 === 0 ? 2 : 1)
      : 0;
    return item;
  }

  function createConveyor(type, x, y, direction, overrides = {}) {
    assertDirection(direction);
    const definition = CONVEYORS[type];
    if (!definition) throw new Error(`Unknown conveyor: ${type}`);
    const footprint = rotatedFootprint(definition.width, definition.length, direction);
    return {
      id: overrides.id ?? `${type}:${x},${y}`,
      name: overrides.name ?? type,
      conveyor: type,
      x,
      y,
      direction,
      speed: overrides.speed ?? definition.speed,
      ...footprint,
    };
  }

  function positionKey(x, y) {
    return `${x},${y}`;
  }

  function compressConveyors(segments, options = {}) {
    const fullType = options.fullType ?? 'Supercharged Conveyor';
    const working = segments.map((segment) => ({ ...segment }));
    const consumed = new Set();
    const output = [];
    const quarters = new Map();
    const halves = new Map();
    working.forEach((segment, index) => {
      const target = segment.conveyor === 'Quarter Conveyor' ? quarters
        : (segment.conveyor === 'Half Conveyor' ? halves : null);
      if (target) target.set(positionKey(segment.x, segment.y), { segment, index });
    });

    function takeStraight2x2(map, conveyorName) {
      map.forEach(({ segment, index }) => {
        if (consumed.has(index)) return;
        const horizontal = segment.direction === 'east' || segment.direction === 'west';
        const candidates = horizontal
          ? [[segment.x + 1, segment.y]]
          : [[segment.x, segment.y + 1]];
        for (const [neighborX, neighborY] of candidates) {
          const neighbor = map.get(positionKey(neighborX, neighborY));
          if (!neighbor || consumed.has(neighbor.index) || neighbor.segment.direction !== segment.direction) continue;
          consumed.add(index);
          consumed.add(neighbor.index);
          output.push(createConveyor(fullType, segment.x, segment.y, segment.direction, {
            name: `${conveyorName} compressed to ${fullType}`,
          }));
          break;
        }
      });
    }

    // Compress the largest exact shape first. A 2x2 block of equally directed
    // quarters is a full conveyor, not two independent half conveyors.
    quarters.forEach(({ segment }) => {
      const x = segment.x;
      const y = segment.y;
      const block = [
        quarters.get(positionKey(x, y)),
        quarters.get(positionKey(x + 1, y)),
        quarters.get(positionKey(x, y + 1)),
        quarters.get(positionKey(x + 1, y + 1)),
      ];
      if (!block.every((entry) => entry && !consumed.has(entry.index)
        && entry.segment.direction === segment.direction)) return;
      block.forEach((entry) => consumed.add(entry.index));
      output.push(createConveyor(fullType, x, y, segment.direction, {
        name: `Quarter block compressed to ${fullType}`,
      }));
    });

    takeStraight2x2(halves, 'Half pair');

    quarters.forEach(({ segment, index }) => {
      if (consumed.has(index)) return;
      const horizontal = segment.direction === 'east' || segment.direction === 'west';
      const neighbor = horizontal
        ? quarters.get(positionKey(segment.x, segment.y + 1))
        : quarters.get(positionKey(segment.x + 1, segment.y));
      if (!neighbor || consumed.has(neighbor.index) || neighbor.segment.direction !== segment.direction) return;
      consumed.add(index);
      consumed.add(neighbor.index);
      output.push(createConveyor('Half Conveyor', segment.x, segment.y, segment.direction, {
        name: 'Quarter pair compressed to Half Conveyor',
      }));
    });

    working.forEach((segment, index) => {
      if (!consumed.has(index)) output.push(segment);
    });
    return output;
  }

  function transportPorts(step) {
    const rect = step.internalTransport ?? step;
    if (!rect || !step.direction) return null;
    const cells = cellsInRect(rect);
    const byDirection = {
      east: {
        entry: cells.filter((cell) => cell.x === rect.x),
        exit: cells.filter((cell) => cell.x === rect.x + rect.width - 1),
      },
      west: {
        entry: cells.filter((cell) => cell.x === rect.x + rect.width - 1),
        exit: cells.filter((cell) => cell.x === rect.x),
      },
      south: {
        entry: cells.filter((cell) => cell.y === rect.y),
        exit: cells.filter((cell) => cell.y === rect.y + rect.height - 1),
      },
      north: {
        entry: cells.filter((cell) => cell.y === rect.y + rect.height - 1),
        exit: cells.filter((cell) => cell.y === rect.y),
      },
    };
    return byDirection[step.direction];
  }

  function cellsTouch(a, b) {
    return a.some((left) => b.some((right) => (
      Math.abs(left.x - right.x) + Math.abs(left.y - right.y) <= 1
    )));
  }

  function validatePlacements(items, plotSize) {
    const occupied = new Map();
    const errors = [];
    items.forEach((item) => {
      cellsInRect(item).forEach((cell) => {
        if (cell.x < 1 || cell.y < 1 || cell.x > plotSize || cell.y > plotSize) {
          errors.push(`${item.name} extends outside the ${plotSize}x${plotSize} plot.`);
          return;
        }
        const key = positionKey(cell.x, cell.y);
        const prior = occupied.get(key);
        if (prior) errors.push(`${item.name} overlaps ${prior} at ${key}.`);
        else occupied.set(key, item.name);
      });
    });
    return { valid: errors.length === 0, errors, occupiedTiles: occupied.size };
  }

  function simulateOreRoute(orderedSteps, initial = {}) {
    const errors = [];
    let elapsedSeconds = 0;
    let lane = initial.lane ?? 'center';
    let priorExit = initial.dropCells ?? null;
    orderedSteps.forEach((step, index) => {
      const ports = transportPorts(step);
      if (!ports) {
        errors.push(`${step.name ?? `Step ${index + 1}`} has no transport geometry.`);
        return;
      }
      if (priorExit && !cellsTouch(priorExit, ports.entry)) {
        errors.push(`${step.name ?? `Step ${index + 1}`} is not connected to the prior step.`);
      }
      if (step.requiresLane && step.requiresLane !== lane) {
        errors.push(`${step.name ?? `Step ${index + 1}`} requires ${step.requiresLane} ore; current lane is ${lane}.`);
      }
      if (step.centersOre || step.conveyor === 'Centering Conveyor') lane = 'center';
      if (step.outputLane) lane = step.outputLane;
      const speed = Number(step.speed ?? step.stats?.['Conveyor speed']);
      const length = step.itemLength ?? (step.direction === 'east' || step.direction === 'west'
        ? step.width : step.height);
      if (speed > 0) elapsedSeconds += length * 3 / speed;
      priorExit = ports.exit;
    });
    if (!initial.dropCells?.length) errors.unshift('The route has no exact dropper landing cells.');
    if (!initial.furnaceZone) errors.push('The route has no furnace processing zone.');
    else if (!priorExit || !cellsTouch(priorExit, cellsInRect(initial.furnaceZone))) {
      errors.push('The final route segment does not reach the furnace processing zone.');
    }
    return { valid: errors.length === 0, errors, elapsedSeconds, finalLane: lane };
  }

  function resolveDatabaseItem(database, name, variant = 'Base') {
    const key = `${name}::${variant}`.toLowerCase();
    const conflicts = (database?.conflicts ?? []).filter((conflict) => conflict.item === key || conflict.key === key);
    if (conflicts.length) {
      const fields = conflicts.map((conflict) => conflict.field).join(', ');
      throw new Error(`${name} (${variant}) has cross-sheet conflicts: ${fields}.`);
    }
    const candidates = (database?.records ?? []).filter((record) => record.key === key);
    if (!candidates.length) throw new Error(`${name} (${variant}) is missing from the normalized database.`);
    const preferred = candidates.find((record) => ['Droppers', 'Upgraders', 'Furnaces'].includes(record.sheet))
      ?? candidates.find((record) => record.sheet === 'Capgrader')
      ?? candidates[0];
    return { ...preferred };
  }

  function calculateExpectedEconomy({ cashPerOre, oreCap = 100, droppers }) {
    const modeled = droppers.map((dropper) => {
      if (!dropper.outcomes?.length) return dropper;
      return {
        ...dropper,
        averageRemovalTimeSeconds: dropper.outcomes.reduce(
          (sum, outcome) => sum + outcome.probability * outcome.removalTimeSeconds,
          0,
        ),
        processedFraction: dropper.outcomes.reduce(
          (sum, outcome) => sum + (outcome.processed ? outcome.probability : 0),
          0,
        ),
      };
    });
    const projectedActiveOres = modeled.reduce(
      (sum, dropper) => sum + dropper.oresPerSecond
        * (dropper.averageRemovalTimeSeconds ?? dropper.routeTimeSeconds),
      0,
    );
    const throughputScale = projectedActiveOres > 0 ? Math.min(1, oreCap / projectedActiveOres) : 1;
    const processedPerSecond = modeled.reduce(
      (sum, dropper) => sum + dropper.oresPerSecond * (dropper.processedFraction ?? 1),
      0,
    ) * throughputScale;
    return {
      projectedActiveOres,
      cappedActiveOres: Math.min(oreCap, projectedActiveOres),
      throughputScale,
      furnaceEntriesPerMinute: processedPerSecond * 60,
      expectedCashPerMinute: processedPerSecond * 60 * cashPerOre,
      expectedCashPerSecond: processedPerSecond * cashPerOre,
      limitedByOreCap: projectedActiveOres > oreCap,
    };
  }

  function itemUseLimit(definition) {
    if (definition?.limitedUses == null || /unlimited|n\/a/i.test(String(definition.limitedUses))) return Infinity;
    const parsed = Number.parseInt(String(definition.limitedUses), 10);
    return Number.isFinite(parsed) ? parsed : Infinity;
  }

  function exceedsItemUseLimit(definition, useNumber) {
    const limit = itemUseLimit(definition);
    return !/scanner/i.test(definition?.name ?? '') && Number.isFinite(limit) && useNumber > limit;
  }

  function maximumAcceptedOreSize(definition) {
    const confirmed = (definition?.oreSizeRestriction?.acceptable ?? [])
      .map(Number)
      .filter(Number.isFinite);
    return confirmed.length ? Math.max(...confirmed) : null;
  }

  function exceedsOreSizeLimit(definition, oreSize) {
    const maximum = maximumAcceptedOreSize(definition);
    return maximum != null && Number(oreSize) > maximum + 1e-9;
  }

  function crimsonPhantomZoneCorridor(components, sourceIndex, windowSeconds = CRIMSON_PHANTOM_WINDOW_SECONDS, minimumDelaySeconds = 1) {
    const candidates = [];
    let elapsedSeconds = 0;
    const randomWindowSeconds = Math.max(0, windowSeconds - minimumDelaySeconds);
    for (let index = sourceIndex + 1; index < components.length && elapsedSeconds < windowSeconds; index += 1) {
      const component = components[index];
      const durationSeconds = Math.max(0, Number(component.seconds ?? 0));
      const startSeconds = Math.max(minimumDelaySeconds, elapsedSeconds);
      const endSeconds = Math.min(windowSeconds, elapsedSeconds + durationSeconds);
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

  function crimsonPhantomZoneEstimate(components, sourceIndex, dropRate, zoneLifetimeSeconds = 30) {
    const corridor = crimsonPhantomZoneCorridor(components, sourceIndex);
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

  function connectTeleporterPairs(components, physicalGraph) {
    const normalized = (value) => String(value ?? '').trim().toLowerCase();
    const receiversByColor = new Map();
    for (const component of components) {
      if (normalized(component.teleporterRole) !== 'receiver') continue;
      const color = normalized(component.teleporterColor);
      const receivers = receiversByColor.get(color) ?? [];
      receivers.push(component);
      receiversByColor.set(color, receivers);
    }
    const graph = new Map();
    const diagnostics = [];
    for (const component of components) {
      const role = normalized(component.teleporterRole);
      const physicalNext = (physicalGraph.get(component.id) ?? [])
        .filter((next) => normalized(next.teleporterRole) !== 'receiver');
      if (role !== 'sender') {
        graph.set(component.id, physicalNext);
        continue;
      }
      const color = normalized(component.teleporterColor);
      const receivers = receiversByColor.get(color) ?? [];
      graph.set(component.id, receivers);
      if (!receivers.length) diagnostics.push({
        code: 'TELEPORTER_PAIR',
        componentId: component.id,
        message: `${component.name} has no ${color || 'matching'} receiver.`,
      });
    }
    return { graph, diagnostics };
  }

  function routeTeleporterJumps(path) {
    const normalized = (value) => String(value ?? '').trim().toLowerCase();
    const jumps = [];
    for (let index = 0; index < path.length - 1; index += 1) {
      const sender = path[index];
      const receiver = path[index + 1];
      if (normalized(sender.teleporterRole) === 'sender'
        && normalized(receiver.teleporterRole) === 'receiver'
        && normalized(sender.teleporterColor) === normalized(receiver.teleporterColor)) jumps.push({
        color: normalized(sender.teleporterColor),
        senderId: sender.id,
        receiverId: receiver.id,
      });
    }
    return jumps;
  }

  function simulateManualBase({ items = [], conveyors = [], database, plotSize, oreCap = 100 }) {
    const diagnostics = [];
    const records = database?.records ?? [];
    const recordFor = (item) => {
      const variant = item.stats?.Variant ?? item.variant ?? 'Base';
      const key = `${item.name}::${variant}`.toLowerCase();
      const candidates = records.filter((record) => record.key === key);
      return candidates.find((record) => ['Droppers', 'Upgraders', 'Furnaces'].includes(record.sheet))
        ?? candidates.find((record) => record.sheet === 'Capgrader')
        ?? candidates[0]
        ?? null;
    };
    const normalizedItems = items.map((item) => ({ ...item, definition: recordFor(item) }));
    for (const item of normalizedItems) {
      if (!item.definition) diagnostics.push({ code: 'DATABASE_MISSING', message: `${item.name} is missing from the normalized database.` });
    }
    const droppers = normalizedItems.filter((item) => item.type === 'dropper');
    const furnace = normalizedItems.find((item) => item.type === 'furnace');
    const portables = normalizedItems.filter((item) => item.type === 'portable');
    if (!droppers.length) diagnostics.push({ code: 'NO_DROPPERS', message: 'The base has no droppers to simulate.' });
    if (!furnace) diagnostics.push({ code: 'FURNACE_MISSED', message: 'The base has no furnace.' });
    const physical = validatePlacements([...items, ...conveyors], Number(plotSize));
    diagnostics.push(...physical.errors.map((message) => ({ code: 'PHYSICAL', message })));

    const key = (cell) => `${cell.x},${cell.y}`;
    const exitTargets = (component) => {
      const own = cellsInRect(component.path);
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
    };
    const components = conveyors.filter((entry) => !entry.wall && !entry.nonTransport).map((entry) => {
      const definition = CONVEYORS[entry.conveyor];
      const travelLength = entry.itemLength ?? definition?.length ?? (['east', 'west'].includes(entry.direction) ? entry.width : entry.height);
      const speed = Number(entry.speed ?? definition?.speed);
      return {
        id: entry.id,
        kind: 'conveyor',
        name: entry.conveyor,
        direction: entry.direction,
        speed,
        seconds: speed > 0 ? travelLength * 3 / speed : 0,
        teleporterColor: entry.teleporterColor,
        teleporterRole: entry.teleporterRole,
        path: entry,
      };
    });
    for (const item of normalizedItems) {
      const path = centeredTransportGeometry(item);
      if (!path) continue;
      const speed = Number(item.definition?.conveyorSpeed);
      if (!(speed > 0)) diagnostics.push({ code: 'DATABASE_MISSING', message: `${item.name} has no conveyor speed for route timing.` });
      components.push({
        id: item.id,
        kind: 'item',
        name: item.name,
        direction: item.direction,
        speed,
        seconds: speed > 0 ? item.itemLength * 3 / speed : 0,
        path,
        item,
      });
    }
    const byCell = new Map();
    for (const component of components) {
      for (const cell of cellsInRect(component.path)) {
        const entries = byCell.get(key(cell)) ?? [];
        entries.push(component);
        byCell.set(key(cell), entries);
      }
    }
    const physicalGraph = new Map();
    for (const component of components) {
      physicalGraph.set(component.id, [...new Set(exitTargets(component)
        .flatMap((cell) => byCell.get(key(cell)) ?? [])
        .filter((next) => next.id !== component.id))]);
    }
    const teleporterGraph = connectTeleporterPairs(components, physicalGraph);
    const graph = teleporterGraph.graph;
    diagnostics.push(...teleporterGraph.diagnostics);
    const furnaceZone = furnaceProcessingZone(furnace);
    const goalKeys = new Set(furnaceZone ? cellsInRect(furnaceZone).map(key) : []);
    const findPath = (starts) => {
      const queue = starts.map((component) => ({ component, path: [component] }));
      const visited = new Set();
      while (queue.length) {
        const current = queue.shift();
        if (visited.has(current.component.id)) continue;
        visited.add(current.component.id);
        if (exitTargets(current.component).some((cell) => goalKeys.has(key(cell)))
          || cellsInRect(current.component.path).some((cell) => goalKeys.has(key(cell)))) return current.path;
        for (const next of graph.get(current.component.id) ?? []) queue.push({ component: next, path: [...current.path, next] });
      }
      return null;
    };
    const portableBeamCells = (item) => {
      const length = /Portable Spinner/i.test(item.name) ? 1 : Number(item.beamLength ?? 2);
      const output = [];
      for (const footprint of cellsInRect(item)) {
        for (let distance = 1; distance <= length; distance += 1) {
          if (item.direction === 'east') output.push({ x: item.x + item.width - 1 + distance, y: footprint.y });
          if (item.direction === 'west') output.push({ x: item.x - distance, y: footprint.y });
          if (item.direction === 'south') output.push({ x: footprint.x, y: item.y + item.height - 1 + distance });
          if (item.direction === 'north') output.push({ x: footprint.x, y: item.y - distance });
        }
      }
      return new Set(output.map(key));
    };
    const parseRange = (value) => {
      if (!value || /^n\/a$/i.test(String(value).trim())) return null;
      const powers = { '': 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12, qd: 1e15, qn: 1e18, sx: 1e21, sp: 1e24, oc: 1e27, no: 1e30 };
      const money = (entry) => {
        const match = String(entry).trim().replaceAll(',', '').match(/^\$?([\d.]+)\s*(K|M|B|T|Qd|Qn|Sx|Sp|Oc|No)?$/i);
        return match ? Number(match[1]) * powers[String(match[2] ?? '').toLowerCase()] : null;
      };
      const [minimum, maximum] = String(value).replace(/[â€“â€”]/g, '-').split('-').map(money);
      return Number.isFinite(minimum) && Number.isFinite(maximum) ? { minimum, maximum } : null;
    };
    const effectsAppliedBy = (name) => Object.entries(EFFECT_DEFINITIONS)
      .filter(([, effect]) => effect.appliedBy?.includes(name))
      .map(([effect]) => effect);
    const effectsRemovedBy = (name) => Object.entries(EFFECT_DEFINITIONS)
      .filter(([, effect]) => effect.removedBy?.includes(name))
      .map(([effect]) => effect);
    const applyItem = (definition, state, useNumber = 1) => {
      if (!definition) return state;
      const type = String(definition.mainStatType ?? '').toLowerCase();
      const before = state.value;
      let value = before;
      let survival = state.survival;
      let replication = state.replication;
      let oreSize = state.oreSize;
      let outcomeModel = null;
      const effectsBefore = [...(state.effects ?? [])];
      const requiresNoEffects = definition.name === 'Acid Plant';
      const activated = !requiresNoEffects || effectsBefore.every((effect) => effect === 'Neon');
      if (!activated) {
        value = before;
      } else if (definition.name === 'Crimson Pillars') {
        value = before;
        outcomeModel = { kind: 'crimson-mark', expectedSurvivorValue: before, outcomes: [] };
      } else if (definition.name === 'Lambda Upgrader') {
        const shinyScale = /shiny/i.test(definition.variant) ? 1.1 : 1;
        const intrinsic = useNumber <= 1 ? 1 : 1.5 / useNumber;
        value = (before * 3.2 * shinyScale + (before + 1000 * shinyScale) + 1 + before * 6 * shinyScale + 13 * before * 2.2 * shinyScale) / 17;
        survival *= intrinsic * (17 / 19);
        outcomeModel = {
          kind: 'lambda',
          expectedSurvivorValue: value,
          outcomes: [
            { label: 'Destroyed by repeat-use roll', probability: 1 - intrinsic, destroyed: true },
            { label: 'Explosion', probability: intrinsic / 19, destroyed: true },
            { label: 'Fling', probability: intrinsic / 19, destroyed: true },
            { label: `${Number((3.2 * shinyScale).toFixed(2))}x`, probability: intrinsic / 19, value: before * 3.2 * shinyScale },
            { label: `+${1000 * shinyScale}`, probability: intrinsic / 19, value: before + 1000 * shinyScale },
            { label: 'Set to 1', probability: intrinsic / 19, value: 1 },
            { label: `${Number((6 * shinyScale).toFixed(2))}x + Sparkles`, probability: intrinsic / 19, value: before * 6 * shinyScale },
            { label: `${Number((2.2 * shinyScale).toFixed(2))}x`, probability: intrinsic * 13 / 19, value: before * 2.2 * shinyScale },
          ].filter((outcome) => outcome.probability > 0),
        };
      } else if (definition.name === 'Tiki Evaluator') {
        const additiveByVariant = { Base: 30000, Shiny: 33000, Mythic: 37500, 'Shiny Mythic': 45000 };
        const multipliedValue = before * Number(definition.mainStat ?? 1);
        const additiveValue = before + (additiveByVariant[definition.variant] ?? 30000);
        value = (multipliedValue + additiveValue) / 2;
        survival *= 2 / 3;
        outcomeModel = {
          kind: 'tiki-phase',
          expectedSurvivorValue: value,
          outcomes: [
            { label: 'Red phase: destroyed', probability: 1 / 3, destroyed: true },
            { label: `Green phase: ${definition.mainStat}x`, probability: 1 / 3, value: multipliedValue },
            { label: `Yellow phase: +${additiveByVariant[definition.variant] ?? 30000}`, probability: 1 / 3, value: additiveValue },
          ],
        };
      } else if (definition.name === 'Runic Array') {
        value = before * Number(definition.mainStat ?? 1) * 3 ** (state.timeSeconds / 120);
      } else if (type.includes('additive')) value = before + Number(definition.mainStat ?? 0);
      else if (Number.isFinite(definition.mainStat)) value = before * definition.mainStat;
      const scannerHitChances = { 'Star Scanner': .3, 'Azure Scanner': .9, 'Ancient Scanner': .5 };
      const scannerHitChance = scannerHitChances[definition.name] ?? (/scanner/i.test(definition.name) ? .25 : null);
      if (activated && scannerHitChance != null && Number.isFinite(definition.mainStat)) {
        value = before * (1 + scannerHitChance * (definition.mainStat - 1));
        outcomeModel = {
          kind: 'scanner',
          expectedSurvivorValue: value,
          outcomes: [
            { label: `Hit: ${definition.mainStat}x`, probability: scannerHitChance, value: before * definition.mainStat },
            { label: 'Miss: unchanged', probability: 1 - scannerHitChance, value: before },
          ],
        };
      }
      if (definition.name === 'Ore Expander') oreSize *= 1.55;
      if (definition.name === 'Ore Shrinker') oreSize *= .85;
      const effects = new Set(effectsBefore);
      let removedEffects;
      if (EFFECT_CLEARERS.includes(definition.name) || /collider/i.test(definition.name)) {
        removedEffects = [...effects];
        effects.clear();
      } else {
        removedEffects = effectsRemovedBy(definition.name).filter((effect) => effects.delete(effect));
      }
      const appliedEffects = [];
      if (activated && !effects.has('Overcharged')) {
        for (const effect of effectsAppliedBy(definition.name)) {
          if (!effects.has(effect)) appliedEffects.push(effect);
          effects.add(effect);
        }
      }
      const fireFrostDestroyed = effects.has('Fire') && effects.has('Frost');
      const washerOverchargeDestroyed = /Ore Wash/i.test(definition.name) && effectsBefore.includes('Overcharged');
      if (fireFrostDestroyed || washerOverchargeDestroyed) survival = 0;
      const itemSurvival = state.survival > 0 ? survival / state.survival : 0;
      if (outcomeModel) outcomeModel.expectedValuePerInput = value * itemSurvival;
      return {
        ...state,
        value,
        survival,
        replication,
        oreSize,
        itemSurvival,
        destructionChance: 1 - itemSurvival,
        outcomeModel,
        effects: [...effects],
        effectsBefore,
        appliedEffects,
        removedEffects,
        activated,
        interactionDestruction: fireFrostDestroyed ? 'Fire and Frost interaction' : (washerOverchargeDestroyed ? 'Ore Wash on Overcharged ore' : null),
      };
    };

    const routes = [];
    const turnBlockers = [...conveyors.filter((entry) => entry.wall || entry.nonTransport), ...portables];
    for (const dropper of droppers) {
      const starts = [...new Set(frontCells(dropper, true).flatMap((cell) => byCell.get(key(cell)) ?? []))];
      const path = furnaceZone ? findPath(starts) : null;
      if (!path) {
        diagnostics.push({ code: 'ROUTE_GAP', dropperId: dropper.id, message: `${dropper.name} #${dropper.order} at (${dropper.x}, ${dropper.y}) cannot reach the furnace.` });
        routes.push({
          dropperId: dropper.id,
          dropperOrder: dropper.order,
          dropper: dropper.name,
          startingValue: Number(dropper.definition?.mainStat ?? 0),
          oresPerSecond: Number(dropper.definition?.dropSpeed ?? 0),
          oreSize: Number(dropper.definition?.oreSize ?? 1),
          reachedFurnace: false,
          seconds: null,
          valueBeforeFurnace: null,
          cashPerOre: null,
          stages: [],
        });
        continue;
      }
      const definition = dropper.definition;
      let state = {
        value: Number(definition?.mainStat ?? 0),
        survival: 1,
        replication: 1,
        oreSize: Number(definition?.oreSize ?? 1),
        timeSeconds: 0,
        effects: effectsAppliedBy(definition?.name),
      };
      const useCounts = new Map();
      let oreSizeDiagnosticIssued = false;
      const stages = [];
      const portableHits = portables.map((portable) => {
        const beam = portableBeamCells(portable);
        const index = path.findIndex((component) => cellsInRect(component.path).some((cell) => beam.has(key(cell))));
        return { portable, index };
      }).filter((entry) => entry.index >= 0);
      for (let index = 1; index < path.length; index += 1) {
        if (path[index - 1].direction !== path[index].direction
          && path[index - 1].speed > 16.8
          && !isFastTurnBlocked(path[index - 1], path[index], turnBlockers)) diagnostics.push({
          code: 'TURN_SPEED',
          dropperId: dropper.id,
          itemId: path[index].item?.id ?? path[index].id,
          message: `${dropper.name} #${dropper.order} enters the turn at ${path[index].name} (${path[index].path.x}, ${path[index].path.y}) at speed ${path[index - 1].speed}, above the safe speed 16.8.`,
        });
      }
      for (let index = 0; index < path.length; index += 1) {
        const component = path[index];
        state.timeSeconds += component.seconds;
        if (component.kind === 'item') {
          const itemDefinition = component.item.definition;
          const range = parseRange(itemDefinition?.range);
          if (range && (state.value < range.minimum || state.value > range.maximum)) diagnostics.push({
            code: 'CAP_RANGE',
            dropperId: dropper.id,
            itemId: component.item.id,
            message: `${dropper.name} #${dropper.order} enters ${component.name} #${component.item.order} at (${component.item.x}, ${component.item.y}) with $${state.value.toFixed(2)}, outside $${range.minimum}-$${range.maximum}.`,
          });
          const useKey = String(itemDefinition?.name ?? itemDefinition?.key ?? '').toLowerCase();
          const uses = (useCounts.get(useKey) ?? 0) + 1;
          useCounts.set(useKey, uses);
          const before = { ...state };
          const useLimit = itemUseLimit(itemDefinition);
          if (exceedsItemUseLimit(itemDefinition, uses) && uses === useLimit + 1) diagnostics.push({
            code: 'USE_LIMIT',
            dropperId: dropper.id,
            itemId: component.item.id,
            message: `${dropper.name} #${dropper.order} reaches ${itemDefinition.variant ?? 'Base'} ${component.item.name} #${component.item.order} for use ${uses}, exceeding its limit of ${useLimit} use${useLimit === 1 ? '' : 's'} per ore.`,
          });
          const oreSizeLimit = maximumAcceptedOreSize(itemDefinition);
          if (!oreSizeDiagnosticIssued && exceedsOreSizeLimit(itemDefinition, before.oreSize)) {
            oreSizeDiagnosticIssued = true;
            diagnostics.push({
              code: 'ORE_SIZE',
              dropperId: dropper.id,
              itemId: component.item.id,
              message: `${dropper.name} #${dropper.order} enters ${itemDefinition.variant ?? 'Base'} ${component.item.name} #${component.item.order} at ore size ${before.oreSize.toFixed(3)}, above its maximum confirmed acceptable size ${oreSizeLimit}.`,
            });
          }
          state = applyItem(itemDefinition, state, uses);
          stages.push({
            itemId: component.item.id,
            itemOrder: component.item.order,
            item: component.item.name,
            componentIndex: index,
            portable: false,
            beforeValue: before.value,
            afterValue: state.value,
            beforeOreSize: before.oreSize,
            afterOreSize: state.oreSize,
            survivalBefore: before.survival,
            survivalAfter: state.survival,
            replicationBefore: before.replication,
            replicationAfter: state.replication,
            itemSurvival: state.itemSurvival,
            destructionChance: state.destructionChance,
            outcomeModel: state.outcomeModel,
            effectsBefore: state.effectsBefore,
            effectsAfter: state.effects,
            appliedEffects: state.appliedEffects,
            removedEffects: state.removedEffects,
            activated: state.activated,
            interactionDestruction: state.interactionDestruction,
            crossingSeconds: component.seconds,
            arrivalSeconds: state.timeSeconds,
            range,
            useNumber: uses,
            useLimit,
            oreSizeLimit,
          });
        }
        for (const { portable } of portableHits.filter((entry) => entry.index === index)) {
          const useKey = String(portable.definition?.name ?? portable.definition?.key ?? '').toLowerCase();
          const uses = (useCounts.get(useKey) ?? 0) + 1;
          useCounts.set(useKey, uses);
          const before = { ...state };
          const useLimit = itemUseLimit(portable.definition);
          if (exceedsItemUseLimit(portable.definition, uses) && uses === useLimit + 1) diagnostics.push({
            code: 'USE_LIMIT',
            dropperId: dropper.id,
            itemId: portable.id,
            message: `${dropper.name} #${dropper.order} reaches ${portable.definition?.variant ?? 'Base'} ${portable.name} #${portable.order} for use ${uses}, exceeding its limit of ${useLimit} use${useLimit === 1 ? '' : 's'} per ore.`,
          });
          const oreSizeLimit = maximumAcceptedOreSize(portable.definition);
          if (!oreSizeDiagnosticIssued && exceedsOreSizeLimit(portable.definition, before.oreSize)) {
            oreSizeDiagnosticIssued = true;
            diagnostics.push({
              code: 'ORE_SIZE',
              dropperId: dropper.id,
              itemId: portable.id,
              message: `${dropper.name} #${dropper.order} enters ${portable.definition?.variant ?? 'Base'} ${portable.name} #${portable.order} at ore size ${before.oreSize.toFixed(3)}, above its maximum confirmed acceptable size ${oreSizeLimit}.`,
            });
          }
          state = applyItem(portable.definition, state, uses);
          stages.push({
            itemId: portable.id,
            itemOrder: portable.order,
            item: portable.name,
            componentIndex: index,
            portable: true,
            beforeValue: before.value,
            afterValue: state.value,
            beforeOreSize: before.oreSize,
            afterOreSize: state.oreSize,
            survivalBefore: before.survival,
            survivalAfter: state.survival,
            replicationBefore: before.replication,
            replicationAfter: state.replication,
            itemSurvival: state.itemSurvival,
            destructionChance: state.destructionChance,
            outcomeModel: state.outcomeModel,
            effectsBefore: state.effectsBefore,
            effectsAfter: state.effects,
            appliedEffects: state.appliedEffects,
            removedEffects: state.removedEffects,
            activated: state.activated,
            interactionDestruction: state.interactionDestruction,
            crossingSeconds: 0,
            arrivalSeconds: state.timeSeconds,
            range: null,
            useNumber: uses,
            useLimit,
            oreSizeLimit,
          });
        }
      }
      const destructiveEffects = Object.entries(EFFECT_DEFINITIONS)
        .filter(([, effect]) => Number.isFinite(effect.timerSeconds))
        .map(([effect]) => effect);
      const effectSources = [
        ...effectsAppliedBy(definition?.name)
          .filter((effect) => destructiveEffects.includes(effect))
          .map((effect) => ({ effect, appliedBy: definition?.name, sourceTime: 0, sourceStage: null })),
        ...stages.flatMap((stage) => (stage.appliedEffects ?? [])
          .filter((effect) => destructiveEffects.includes(effect))
          .map((effect) => ({ effect, appliedBy: stage.item, sourceTime: stage.arrivalSeconds, sourceStage: stage }))),
      ];
      const effectSafety = effectSources.map((source) => {
        const effectDefinition = EFFECT_DEFINITIONS[source.effect];
        const dropperEffectText = String(definition?.effects ?? '');
        const textDeclaresImmunity = new RegExp(`(?:not|won't|will not)\\s+(?:be destroyed|die)[^\\n]*${source.effect}|${source.effect}[^\\n]*(?:not|won't|will not)\\s+(?:destroy|kill|die)`, 'i').test(dropperEffectText);
        const immune = (effectDefinition.immuneDroppers?.includes(definition?.name) ?? false) || textDeclaresImmunity;
        const remover = stages
          .filter((stage) => stage !== source.sourceStage
            && stage.arrivalSeconds >= source.sourceTime
            && (stage.removedEffects ?? []).includes(source.effect))
          .sort((left, right) => left.arrivalSeconds - right.arrivalSeconds)[0] ?? null;
        const destinationTime = remover?.arrivalSeconds ?? state.timeSeconds;
        const exposureSeconds = immune ? 0 : Math.max(0, destinationTime - source.sourceTime);
        const timerSeconds = effectDefinition.sourceTimerSeconds?.[source.appliedBy] ?? effectDefinition.timerSeconds;
        const result = {
          effect: source.effect,
          appliedBy: source.appliedBy,
          appliedAtSeconds: source.sourceTime,
          removedBy: immune ? `${definition?.name} immunity` : (remover?.item ?? 'Furnace'),
          removerItemId: remover?.itemId ?? furnace?.id ?? null,
          exposureSeconds,
          timerSeconds,
          marginSeconds: timerSeconds - exposureSeconds,
          safe: immune || exposureSeconds < timerSeconds,
          immune,
          deadlineSeconds: source.sourceTime + timerSeconds,
          sourceItemId: source.sourceStage?.itemId ?? dropper.id,
          destroyedOriginalFraction: 0,
          destroyedOresPerMinute: 0,
        };
        if (source.sourceStage) {
          const existing = source.sourceStage.effectSafety ?? [];
          source.sourceStage.effectSafety = [...existing, result];
        }
        return result;
      });
      const firstUnsafeEffect = effectSafety
        .filter((effect) => !effect.safe)
        .sort((left, right) => left.deadlineSeconds - right.deadlineSeconds)[0] ?? null;
      if (firstUnsafeEffect && state.survival > 0) {
        const survivalAtDeadline = stages
          .filter((stage) => stage.arrivalSeconds <= firstUnsafeEffect.deadlineSeconds)
          .sort((left, right) => right.arrivalSeconds - left.arrivalSeconds)[0]?.survivalAfter ?? 1;
        firstUnsafeEffect.destroyedOriginalFraction = survivalAtDeadline;
        state.survival = 0;
        diagnostics.push({
          code: 'EFFECT_TIMER',
          dropperId: dropper.id,
          itemId: firstUnsafeEffect.sourceItemId,
          message: `${dropper.name} #${dropper.order}'s ${firstUnsafeEffect.effect} effect from ${firstUnsafeEffect.appliedBy} reaches ${firstUnsafeEffect.removedBy} in ${firstUnsafeEffect.exposureSeconds.toFixed(3)}s; its ${firstUnsafeEffect.timerSeconds.toFixed(3)}s timer destroys the ore first.`,
        });
      }
      const furnaceMultiplier = Number(furnace?.definition?.mainStat ?? 0);
      const dropRate = Number(definition?.dropSpeed ?? 0);
      const phantomZones = stages.filter((stage) => stage.item === 'Crimson Pillars' && !stage.portable).map((stage) => {
        const sourceItem = normalizedItems.find((item) => item.id === stage.itemId);
        const effectiveDropRate = dropRate * Number(stage.survivalAfter ?? 1);
        const estimate = crimsonPhantomZoneEstimate(path, stage.componentIndex, effectiveDropRate);
        return {
          sourceItemId: stage.itemId,
          sourceItemOrder: stage.itemOrder,
          variant: sourceItem?.definition?.variant ?? sourceItem?.variant ?? 'Base',
          multiplier: Number(sourceItem?.definition?.mainStat ?? 1),
          sourceDropRate: dropRate,
          dropIntervalSeconds: dropRate > 0 ? 1 / dropRate : null,
          ...estimate,
        };
      });
      routes.push({
        dropperId: dropper.id,
        dropperOrder: dropper.order,
        dropper: `${definition?.variant ?? 'Base'} ${dropper.name}`,
        startingValue: Number(definition?.mainStat ?? 0),
        reachedFurnace: true,
        seconds: state.timeSeconds,
        valueBeforeFurnace: state.value,
        cashPerOre: state.value * furnaceMultiplier,
        oresPerSecond: Number(definition?.dropSpeed ?? 0),
        survival: state.survival,
        replication: state.replication,
        oreSize: state.oreSize,
        componentCount: path.length,
        effectSafety,
        phantomZones,
        teleporterJumps: routeTeleporterJumps(path),
        stages,
      });
    }
    const successful = routes.filter((route) => route.reachedFurnace);
    const projectedActiveOres = successful.reduce((sum, route) => sum + route.oresPerSecond * route.seconds, 0);
    const throughputScale = projectedActiveOres > 0 ? Math.min(1, oreCap / projectedActiveOres) : 1;
    const sourceOresPerMinute = successful.reduce((sum, route) => sum + route.oresPerSecond * throughputScale * 60, 0);
    const destroyedOresPerMinute = successful.reduce((sum, route) => (
      sum + route.oresPerSecond * (1 - route.survival) * throughputScale * 60
    ), 0);
    for (const route of successful) {
      const routeSourceOresPerMinute = route.oresPerSecond * throughputScale * 60;
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
      route.sourceOresPerMinute = routeSourceOresPerMinute;
      route.destroyedOresPerMinute = routeSourceOresPerMinute * (1 - route.survival);
      route.stages.forEach((stage) => {
        stage.destroyedOresPerMinute = routeSourceOresPerMinute
          * Math.max(0, stage.survivalBefore - stage.survivalAfter)
          * stage.replicationBefore;
      });
      (route.effectSafety ?? []).forEach((effect) => {
        if (!(effect.destroyedOriginalFraction > 0)) return;
        const replicationAtDeadline = route.stages
          .filter((stage) => stage.arrivalSeconds <= effect.deadlineSeconds)
          .sort((left, right) => right.arrivalSeconds - left.arrivalSeconds)[0]?.replicationAfter ?? 1;
        effect.destroyedOresPerMinute = routeSourceOresPerMinute
          * effect.destroyedOriginalFraction
          * replicationAtDeadline;
      });
    }
    const furnaceEntriesPerMinute = successful.reduce((sum, route) => (
      sum + route.oresPerSecond * route.survival * route.replication * throughputScale * 60
    ), 0);
    const expectedCashPerMinute = successful.reduce((sum, route) => (
      sum + route.oresPerSecond * route.survival * route.replication * throughputScale * route.cashPerOre * 60
    ), 0);
    const reservedTiles = items.reduce((sum, item) => sum + item.width * item.height, 0)
      + conveyors.reduce((sum, item) => sum + item.width * item.height, 0);
    const blockingCodes = new Set(['DATABASE_MISSING', 'NO_DROPPERS', 'FURNACE_MISSED', 'TELEPORTER_PAIR', 'PHYSICAL', 'ROUTE_GAP', 'CAP_RANGE', 'USE_LIMIT', 'ORE_SIZE', 'TURN_SPEED', 'EFFECT_TIMER']);
    return {
      valid: successful.length === droppers.length && !diagnostics.some((entry) => blockingCodes.has(entry.code)),
      diagnostics,
      routes,
      metrics: {
        routeTimeSeconds: successful.length ? Math.max(...successful.map((route) => route.seconds)) : 0,
        averageRouteTimeSeconds: successful.length ? successful.reduce((sum, route) => sum + route.seconds, 0) / successful.length : 0,
        projectedActiveOres,
        cappedActiveOres: Math.min(oreCap, projectedActiveOres),
        oreCap,
        throughputScale,
        furnaceEntriesPerMinute,
        sourceOresPerMinute,
        destroyedOresPerMinute,
        survivalToFurnace: sourceOresPerMinute > 0 ? 1 - destroyedOresPerMinute / sourceOresPerMinute : 1,
        expectedCashPerMinute,
        expectedCashPerSecond: expectedCashPerMinute / 60,
        limitedByOreCap: projectedActiveOres > oreCap,
        reservedTiles,
        remainingTiles: Math.max(0, Number(plotSize) ** 2 - reservedTiles),
      },
    };
  }

  function compareDatabaseRecords(records, fields = [
    'size', 'mainStat', 'range', 'limitedUses', 'conveyorSpeed', 'dropSpeed', 'oreSize',
  ]) {
    const groups = new Map();
    records.forEach((record) => {
      const key = `${record.name}::${record.variant}`.toLowerCase();
      const group = groups.get(key) ?? [];
      group.push(record);
      groups.set(key, group);
    });
    const conflicts = [];
    groups.forEach((group, key) => {
      if (group.length < 2) return;
      fields.forEach((field) => {
        const values = new Map();
        group.forEach((record) => {
          const raw = record[field];
          if (raw == null || raw === '' || raw === 'N/A') return;
          const normalized = typeof raw === 'object' ? JSON.stringify(raw) : String(raw).trim().toLowerCase();
          const sources = values.get(normalized) ?? [];
          sources.push(record.sheet);
          values.set(normalized, sources);
        });
        if (values.size > 1) {
          conflicts.push({ key, field, values: [...values].map(([value, sheets]) => ({ value, sheets })) });
        }
      });
    });
    return conflicts;
  }

  function createPlanner(plotSize) {
    const state = { plotSize, items: [], conveyors: [], route: [], validation: null };
    return {
      state,
      clear() {
        state.items.length = 0;
        state.conveyors.length = 0;
        state.route.length = 0;
        state.validation = null;
      },
      addItem(definition, placement) {
        const item = createItem(definition, placement);
        state.items.push(item);
        return item;
      },
      addDatabaseItem(database, name, variant, placement) {
        return this.addItem(resolveDatabaseItem(database, name, variant), placement);
      },
      addConveyor(type, x, y, direction, overrides) {
        const conveyor = createConveyor(type, x, y, direction, overrides);
        state.conveyors.push(conveyor);
        return conveyor;
      },
      compress(options) {
        state.conveyors = compressConveyors(state.conveyors, options);
        return state.conveyors;
      },
      simulate(dropper, furnace, route = state.route) {
        state.validation = simulateOreRoute(route, {
          dropCells: dropper.dropPoint?.cells,
          furnaceZone: furnace?.processingZone ?? furnaceProcessingZone(furnace),
          lane: 'center',
        });
        return state.validation;
      },
    };
  }

  global.TycoonPlanner = Object.freeze({
    CONVEYORS,
    parseSize,
    rotatedFootprint,
    createItem,
    createConveyor,
    centeredTransportGeometry,
    furnaceProcessingZone,
    compressConveyors,
    transportPorts,
    simulateOreRoute,
    validatePlacements,
    compareDatabaseRecords,
    resolveDatabaseItem,
    calculateExpectedEconomy,
    itemUseLimit,
    exceedsItemUseLimit,
    maximumAcceptedOreSize,
    exceedsOreSizeLimit,
    crimsonPhantomZoneCorridor,
    crimsonPhantomZoneEstimate,
    isFastTurnBlocked,
    simulateManualBase,
    createPlanner,
  });
}(globalThis));
