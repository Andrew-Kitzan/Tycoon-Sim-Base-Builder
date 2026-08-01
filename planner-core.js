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
    createPlanner,
  });
}(globalThis));
