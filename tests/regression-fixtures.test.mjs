import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadDatabase, loadRules, findItem } from '../engine/database.mjs';
import { applyDeterministicItem } from '../engine/models.mjs';
import { evaluateEffectSafety } from '../engine/effects.mjs';
import { isFastTurnBlocked, routeFailureKind, routeFalloffCells } from '../engine/routing.mjs';
import { exceedsItemUseLimit, exceedsOreSizeLimit, firstOreSizeViolation, itemUseLimit, maximumAcceptedOreSize } from '../engine/item-constraints.mjs';
import { crimsonPhantomZoneEstimate, isCrimsonWallLandingCell } from '../engine/crimson.mjs';
import { connectTeleporterPairs } from '../engine/teleporters.mjs';
import { parseWorksheetXml } from '../engine/xlsx-reader.mjs';
import { internalTransportProfile, internalTransportRect } from '../engine/internal-transport.mjs';
import { portableUpgradeCells, portableZoneEntryIndices } from '../engine/coordinate-map.mjs';
import { validatePlan } from '../engine/validate.mjs';
import { furnaceMultiplierForOre } from '../engine/furnaces.mjs';
import { expectedRouteOccupancySeconds, itemDestructionChance } from '../engine/destruction.mjs';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'tests', 'fixtures', 'regressions');
const files = (await fs.readdir(directory)).filter((name) => name.endsWith('.json')).sort();
const fixtures = await Promise.all(files.map(async (name) => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))));
const [database, rules] = await Promise.all([loadDatabase(root), loadRules(root)]);

for (const fixture of fixtures) {
  assert.match(fixture.id, /^[a-z0-9-]+$/);
  assert(fixture.observed && fixture.expected && fixture.kind && fixture.input && fixture.assert);
  if (fixture.id === 'acid-plant-effect-free') {
    const acid = findItem(database, 'Acid Plant', 'Base');
    for (const effect of fixture.input.blockedEffects) {
      const before = { value: 100, survival: 1, replication: 1, oreSize: 1, effects: [effect], timeSeconds: 0, area: 0 };
      const after = applyDeterministicItem(acid, before, 1, {}, rules);
      assert.equal(after.activated, fixture.assert.activated);
      assert.equal(after.value, before.value);
    }
  } else if (fixture.id === 'portable-after-cap') {
    assert.equal(rules.portableRequirements.phase, 'post-cap');
    assert(rules.validationCodes[fixture.assert.diagnostic]);
  } else if (fixture.id === 'portable-spinner-radius-zone') {
    let reference;
    for (const direction of fixture.input.directions) {
      const item = { ...fixture.input.item, direction };
      const cells = portableUpgradeCells(item, { ...rules, portableSpinnerBeamRadius: fixture.input.radius });
      const keys = cells
        .sort((left, right) => left.y - right.y || left.x - right.x)
        .map((cell) => `${cell.x},${cell.y}`);
      assert.equal(keys.length, fixture.assert.cellCount);
      assert.deepEqual(keys, fixture.assert.cells);
      const footprintKeys = new Set();
      for (let y = item.y; y < item.y + item.height; y += 1) {
        for (let x = item.x; x < item.x + item.width; x += 1) footprintKeys.add(`${x},${y}`);
      }
      assert.equal(keys.some((key) => footprintKeys.has(key)), !fixture.assert.excludesFootprint);
      if (!reference) reference = keys;
      else assert.deepEqual(keys, reference, 'Portable Spinner radius must not rotate with facing');
    }
  } else if (fixture.id === 'portable-centered-beam-width') {
    for (const testCase of fixture.input.cases) {
      const cells = portableUpgradeCells(testCase.item, {
        ...rules,
        defaultPortableBeamLength: fixture.input.beamLength,
        defaultPortableBeamWidth: fixture.input.beamWidth,
      });
      const keys = cells
        .sort((left, right) => left.y - right.y || left.x - right.x)
        .map((cell) => `${cell.x},${cell.y}`);
      assert.equal(keys.length, testCase.cellCount);
      assert.deepEqual(keys, testCase.cells);
    }
  } else if (fixture.id === 'portable-zone-reentry') {
    const entries = portableZoneEntryIndices(fixture.input.path, fixture.input.zoneCells);
    assert.deepEqual(entries, fixture.assert.entryIndices);
    assert.equal(entries.length, fixture.assert.uses);
  } else if (fixture.id === 'crimson-dropper-wall-landing') {
    assert.equal(isCrimsonWallLandingCell(fixture.input.crimson, fixture.input.wallCell, rules), fixture.assert.wallRedirects);
    assert.equal(isCrimsonWallLandingCell(fixture.input.crimson, fixture.input.conveyorCell, rules), fixture.assert.conveyorIsNotWall);
    assert.equal(isCrimsonWallLandingCell(fixture.input.crimson, fixture.input.outsideCell, rules), fixture.assert.outsideDoesNotRedirect);
    const plan = {
      version: 1,
      profile: { plotSize: 12 },
      items: [fixture.input.dropper, fixture.input.crimson, fixture.input.furnace],
      conveyors: [],
      route: [],
      furnaceZone: { x: 4, y: 7, width: 2, height: 2 },
      diagnostics: [],
    };
    assert.equal(validatePlan(plan, rules).valid, fixture.assert.strictRouteValid);
    const overlapping = { ...plan, items: [{ ...fixture.input.dropper, x: 6 }, fixture.input.crimson, fixture.input.furnace] };
    assert.equal(validatePlan(overlapping, rules).diagnostics.some((entry) => entry.code === 'COLLISION'), fixture.assert.overlapRejected);
  } else if (fixture.id === 'formatted-xlsx-memory') {
    const xml = `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Value</t></is></c></row><row r="${fixture.input.formattedRow}"><c r="Z${fixture.input.formattedRow}" s="9"/></row></sheetData></worksheet>`;
    const values = parseWorksheetXml(xml);
    assert.equal(values.length, fixture.assert.meaningfulRows);
    assert.equal(values[0][0], 'Value');
  } else if (fixture.id === 'wind-up-stats-drop-speed') {
    for (const variant of fixture.input.variants) {
      const item = findItem(database, fixture.input.item, variant);
      assert.equal(item.dropSpeed, fixture.assert.dropSpeed);
      assert.equal(item.statsForNerdsRow, fixture.assert.statsForNerdsRows[variant]);
    }
  } else if (fixture.id === 'shiny-8-ball-multiplier') {
    const item = findItem(database, fixture.input.item, fixture.input.variant);
    assert.equal(item.mainStat, fixture.assert.mainStat);
  } else if (fixture.id === 'krakatoa-effect-multiplier') {
    const furnace = findItem(database, fixture.input.item, fixture.input.variant);
    assert.equal(rules.krakatoaFireWindowSeconds, fixture.input.fireWindowSeconds);
    for (const testCase of fixture.input.cases) {
      const result = furnaceMultiplierForOre(furnace, {
        activeEffects: testCase.effects,
        fireAppliedSecondsAgo: testCase.fireAge ?? Number.POSITIVE_INFINITY,
        fireWindowSeconds: fixture.input.fireWindowSeconds,
      });
      assert.deepEqual(result, { multiplier: testCase.multiplier, condition: testCase.condition });
    }
  } else if (fixture.id === 'scanner-hit-chances') {
    for (const [name, chance] of Object.entries(fixture.input.scanners)) {
      const item = findItem(database, name, 'Base');
      assert(item, `${name} must exist in the database`);
      assert.equal(rules.scannerHitChances[name], chance);
      const before = { value: fixture.input.startingValue, survival: 1, replication: 1, oreSize: 1, effects: [], timeSeconds: 0, area: 0 };
      const after = applyDeterministicItem(item, before, 1, {}, rules);
      assert.equal(after.value, before.value * (1 + chance * (item.mainStat - 1)));
    }
  } else if (fixture.id === 'blocked-fast-turn') {
    assert.equal(isFastTurnBlocked(fixture.input.before, fixture.input.after, []), fixture.assert.unblocked);
    assert.equal(isFastTurnBlocked(fixture.input.before, fixture.input.after, [fixture.input.wall]), fixture.assert.wallBlocked);
    assert.equal(isFastTurnBlocked(fixture.input.before, fixture.input.after, [fixture.input.portable]), fixture.assert.portableBlocked);
  } else if (fixture.id === 'route-falloff-zone') {
    assert.deepEqual(routeFalloffCells(fixture.input.path, null, fixture.input.plotSize), fixture.assert.falloffCells);
    assert.deepEqual(routeFalloffCells(fixture.input.boundaryPath, null, fixture.input.plotSize), fixture.assert.boundaryCells);
    const occupied = new Set(fixture.input.occupiedExitCells.map(({ x, y }) => `${x},${y}`));
    assert.deepEqual(
      routeFalloffCells(fixture.input.path, null, fixture.input.plotSize, ({ x, y }) => occupied.has(`${x},${y}`)),
      fixture.assert.connectedTransportIsNotFalloff,
    );
  } else if (fixture.id === 'route-gap-detail') {
    const common = { hasStart: true, pathIds: fixture.input.pathIds, plotSize: fixture.input.plotSize };
    assert.equal(routeFailureKind({ ...common, hasStart: false }), fixture.assert.unconnected);
    assert.equal(routeFailureKind({ ...common, nextIds: fixture.input.loopNextIds }), fixture.assert.loop);
    assert.equal(routeFailureKind({ ...common, nextIds: fixture.input.blockedNextIds }), fixture.assert.directionBlocked);
    assert.equal(routeFailureKind({ ...common, exitCells: fixture.input.gapExitCells }), fixture.assert.gap);
    assert.equal(routeFailureKind({ ...common, exitCells: fixture.input.boundaryExitCells }), fixture.assert.boundary);
  } else if (fixture.id === 'ore-replicator-portable') {
    const replicator = findItem(database, fixture.input.item, fixture.input.variant);
    assert.equal(replicator.conveyorSpeed, fixture.assert.databaseConveyorSpeed);
    for (const relativePath of fixture.assert.requiredPatternFiles) {
      const source = await fs.readFile(path.join(root, relativePath), 'utf8');
      assert.match(source, /Ore Replicator/);
    }
  } else if (fixture.id === 'incremental-use-multipliers') {
    for (const [variant, multipliers] of Object.entries(fixture.input.variants)) {
      const item = findItem(database, fixture.input.item, variant);
      assert(item, `${variant} ${fixture.input.item} must exist in the database`);
      assert.equal(Number(item.limitedUses), fixture.assert.useLimit);
      assert.deepEqual(rules.incrementalMultipliers[variant], multipliers);
      for (const [index, multiplier] of multipliers.entries()) {
        const before = { value: fixture.input.startingValue, survival: 1, replication: 1, oreSize: 1, effects: [], timeSeconds: 0, area: 0 };
        const after = applyDeterministicItem(item, before, index + 1, {}, rules);
        assert.equal(after.appliedMultiplier, multiplier);
        assert.equal(after.value, before.value * multiplier);
      }
    }
    const appSource = await fs.readFile(path.join(root, 'app.js'), 'utf8');
    for (const column of fixture.assert.hoverColumns) assert(appSource.includes(column), `Incremental hover must include ${column}`);
  } else if (fixture.id === 'asymmetric-internal-conveyors') {
    for (const [name, expected] of Object.entries(fixture.input.items)) {
      const definition = findItem(database, name, 'Base');
      const profile = internalTransportProfile(definition, rules);
      assert.equal(profile.across, expected.across);
      assert.equal(profile.northOffset, expected.northOffset);
      for (const direction of fixture.input.directions) {
        const horizontal = direction === 'east' || direction === 'west';
        const placed = {
          ...fixture.input.origin,
          name,
          type: 'upgrader',
          itemWidth: definition.size.width,
          itemLength: definition.size.length,
          width: horizontal ? definition.size.length : definition.size.width,
          height: horizontal ? definition.size.width : definition.size.length,
          direction,
        };
        const rect = internalTransportRect(placed, rules);
        assert.equal(horizontal ? rect.height : rect.width, expected.across);
        const actualOffset = horizontal ? rect.y - placed.y : rect.x - placed.x;
        const rotatedOffset = direction === 'south' || direction === 'west'
          ? definition.size.width - expected.northOffset - expected.across
          : expected.northOffset;
        assert.equal(actualOffset, rotatedOffset);
      }
    }
  } else if (fixture.id === 'rng-output-and-ore-destruction') {
    const before = { value: fixture.input.startingValue, survival: 1, replication: 1, oreSize: 1, effects: [], timeSeconds: 0, area: 0 };
    const lambda = findItem(database, 'Lambda Upgrader', 'Base');
    const lambdaAfter = applyDeterministicItem(lambda, before, fixture.input.lambdaUse, {}, rules);
    assert.equal(lambdaAfter.outcomeModel?.kind, fixture.assert.lambdaModel);
    assert.equal(lambdaAfter.itemSurvival, fixture.assert.lambdaItemSurvival);
    assert.equal(lambdaAfter.destructionChance, fixture.assert.lambdaDestructionChance);
    assert.equal(lambdaAfter.outcomeModel.outcomes.length, fixture.assert.lambdaOutcomeCount);
    const laterLambdaAfter = applyDeterministicItem(lambda, before, fixture.input.laterLambdaUse, {}, rules);
    const repeatDestruction = laterLambdaAfter.outcomeModel.outcomes.find((outcome) => /repeat-use/i.test(outcome.label));
    assert.equal(1 - repeatDestruction.probability, fixture.assert.laterLambdaIntrinsicSurvival);
    assert.equal(laterLambdaAfter.itemSurvival, fixture.assert.laterLambdaItemSurvival);
    assert.equal(laterLambdaAfter.destructionChance, fixture.assert.laterLambdaDestructionChance);
    const tiki = findItem(database, 'Tiki Evaluator', fixture.input.tikiVariant);
    const tikiAfter = applyDeterministicItem(tiki, before, 1, {}, rules);
    assert.equal(tikiAfter.outcomeModel?.kind, fixture.assert.tikiModel);
    assert.equal(tikiAfter.itemSurvival, fixture.assert.tikiItemSurvival);
    assert.equal(tikiAfter.destructionChance, fixture.assert.tikiDestructionChance);
    assert.equal(tikiAfter.value, fixture.assert.tikiExpectedSurvivorValue);
    assert.equal(tikiAfter.outcomeModel.outcomes.length, fixture.assert.tikiOutcomeCount);
  } else if (fixture.id === 'dragon-second-use-destruction') {
    const dragon = findItem(database, fixture.input.item, fixture.input.variant);
    const before = { value: fixture.input.startingValue, survival: 1, replication: 1, oreSize: 1, effects: [], timeSeconds: 0, area: 0 };
    const firstUse = applyDeterministicItem(dragon, before, 1, {}, rules);
    const secondUse = applyDeterministicItem(dragon, before, 2, {}, rules);
    assert.equal(firstUse.itemSurvival, fixture.assert.firstUseSurvival);
    assert.equal(secondUse.itemSurvival, fixture.assert.secondUseSurvival);
    assert.equal(secondUse.destructionChance, fixture.assert.secondUseDestruction);
    assert.equal(secondUse.outcomeModel?.kind, fixture.assert.outcomeModel);
    assert.equal(secondUse.outcomeModel.outcomes.length, fixture.assert.outcomeCount);
    assert.equal(secondUse.value, fixture.assert.secondUseValue);
  } else if (fixture.id === 'minefield-destruction-occupancy') {
    const minefield = findItem(database, fixture.input.item, fixture.input.variant);
    const before = { value: fixture.input.startingValue, survival: 1, replication: 1, oreSize: 1, effects: [], timeSeconds: 0, area: 0 };
    const after = applyDeterministicItem(minefield, before, 1, {}, rules);
    assert.equal(itemDestructionChance(minefield), fixture.assert.destructionChance);
    assert(Math.abs(after.destructionChance - fixture.assert.destructionChance) < 1e-12);
    assert.equal(after.survival, fixture.assert.survival);
    assert.equal(after.value, fixture.assert.survivorValue);
    assert.equal(expectedRouteOccupancySeconds({
      routeTimeSeconds: fixture.input.routeTimeSeconds,
      stages: [{
        arrivalSeconds: fixture.input.destructionTimeSeconds,
        survivalAfter: after.survival,
        replicationAfter: after.replication,
      }],
      finalSurvival: after.survival,
      finalReplication: after.replication,
    }), fixture.assert.occupancySeconds);
  } else if (fixture.id === 'manual-effect-timer-route') {
    const source = findItem(database, fixture.input.effectSource, 'Base');
    const remover = findItem(database, fixture.input.remover, 'Base');
    const dropper = findItem(database, 'Iron Dropper', 'Base');
    const safe = evaluateEffectSafety({
      dropper,
      chain: [{ item: source }, { item: { ...remover, size: { ...remover.size, length: 0 } } }],
      layout: { connections: [{ fromSequence: 1, toSequence: 2, seconds: fixture.input.safeExposureSeconds }] },
      rules,
    }).effects[0];
    const unsafe = evaluateEffectSafety({
      dropper,
      chain: [{ item: source }],
      layout: { connections: [{ fromSequence: 1, toSequence: 2, seconds: fixture.input.unsafeExposureSeconds }] },
      rules,
    }).effects[0];
    assert.equal(safe.timerSeconds, fixture.assert.timerSeconds);
    assert.equal(safe.safe, fixture.assert.safeBeforeTimer);
    assert.equal(safe.removedBy, fixture.assert.safeDestination);
    assert.equal(unsafe.safe, !fixture.assert.destroyedAtTimer);
    assert.equal(unsafe.removedBy, fixture.assert.unsafeDestination);
  } else if (fixture.id === 'collider-effect-reset') {
    const collider = findItem(database, fixture.input.item, 'Base');
    const dropper = findItem(database, 'Iron Dropper', 'Base');
    const result = evaluateEffectSafety({
      dropper,
      chain: [
        { item: collider },
        { item: { ...collider, size: { ...collider.size, length: 0 } } },
      ],
      layout: { connections: [
        { fromSequence: 1, toSequence: 2, seconds: fixture.input.secondsToNextCollider },
        { fromSequence: 2, toSequence: 3, seconds: fixture.input.secondsFromNextColliderToFurnace },
      ] },
      rules,
    });
    assert.equal(result.effects.length, fixture.assert.effectApplications);
    assert.equal(result.effects[0].removedBy, fixture.assert.firstSafetyPoint);
    assert.equal(result.effects[1].removedBy, fixture.assert.secondSafetyPoint);
    assert.equal(result.effects[0].safe, fixture.assert.firstSafe);
    assert.equal(result.effects[1].safe, fixture.assert.secondSafe);
  } else if (fixture.id === 'stats-placeholder-descriptions') {
    const forbidden = new RegExp(fixture.assert.forbiddenPattern, 'i');
    for (const name of fixture.input.items) {
      const matches = database.records.filter((record) => record.name === name);
      assert(matches.length > 0, `${name} must exist in the database`);
      for (const item of matches) {
        assert.equal(forbidden.test(item.description ?? item.effects ?? ''), false, `${item.key} still has the placeholder description`);
        assert((item.description ?? item.effects ?? '').length >= fixture.assert.minimumDescriptionLength, `${item.key} needs a concrete mechanic description`);
      }
    }
  } else if (fixture.id === 'use-limit-warning') {
    const item = findItem(database, fixture.input.item, fixture.input.variant);
    assert.equal(itemUseLimit(item), fixture.assert.limit);
    assert.equal(exceedsItemUseLimit(item, fixture.input.uses), fixture.assert.violates);
  } else if (fixture.id === 'ore-size-restriction-warning') {
    const item = findItem(database, fixture.input.item, fixture.input.variant);
    assert.equal(maximumAcceptedOreSize(item), fixture.assert.maximumAccepted);
    assert.equal(exceedsOreSizeLimit(item, fixture.input.incomingOreSize), fixture.assert.violates);
  } else if (fixture.id === 'ore-size-first-block-only') {
    const item = findItem(database, fixture.input.item, fixture.input.variant);
    const stages = Array.from({ length: fixture.input.repeatedItems }, (_, index) => ({
      item: { id: `item-${index + 1}`, definition: item },
      beforeOreSize: fixture.input.incomingOreSize,
    }));
    const first = firstOreSizeViolation(stages);
    assert.equal(stages.indexOf(first), fixture.assert.firstViolationIndex);
    assert.equal(first ? 1 : 0, fixture.assert.maximumDiagnosticsPerDropper);
  } else if (fixture.id === 'crimson-phantom-zone-corridor') {
    const item = findItem(database, fixture.input.item, fixture.input.variant);
    const before = { value: fixture.input.startingValue, survival: 1, replication: 1, oreSize: 1, effects: [], timeSeconds: 0, area: 0 };
    const after = applyDeterministicItem(item, before, 1, {}, rules);
    assert.equal(after.value, fixture.assert.directValue);
    assert.equal(after.outcomeModel?.kind, 'crimson-mark');
    const corridor = crimsonPhantomZoneEstimate(fixture.input.components, 0, {
      dropRate: fixture.input.dropRate,
      minimumDelaySeconds: fixture.input.minimumDelaySeconds,
      windowSeconds: fixture.input.windowSeconds,
      zoneLifetimeSeconds: fixture.input.zoneLifetimeSeconds,
    });
    assert.deepEqual(corridor.candidates.map((candidate) => candidate.componentId), fixture.assert.candidateIds);
    assert.equal(corridor.candidates.at(-1).endSeconds, fixture.assert.lastCandidateEndSeconds);
    assert.deepEqual(corridor.candidates.map((candidate) => candidate.spawnProbability), fixture.assert.candidateSpawnProbabilities);
    assert.equal(corridor.spawnBeforeFurnaceProbability, fixture.assert.spawnBeforeFurnaceProbability);
    assert.equal(corridor.expectedSpawnsPerMinute, fixture.assert.expectedSpawnsPerMinute);
    assert.equal(corridor.expectedActiveZones, fixture.assert.expectedActiveZones);
  } else if (fixture.id === 'teleporter-route-to-furnace') {
    const components = fixture.input.components;
    const byId = new Map(components.map((component) => [component.id, component]));
    const physicalGraph = new Map(Object.entries(fixture.input.physicalEdges).map(([id, targets]) => (
      [id, targets.map((target) => byId.get(target))]
    )));
    const linked = connectTeleporterPairs(components, physicalGraph);
    assert.deepEqual(linked.graph.get('red-sender').map((component) => component.id), fixture.assert.senderTargets);
    assert.deepEqual(linked.graph.get('red-receiver').map((component) => component.id), fixture.assert.receiverTargets);
    assert.equal(linked.diagnostics.length, fixture.assert.diagnosticCount);
  } else throw new Error(`Regression fixture has no executor: ${fixture.id}`);
}

console.log(`Validated ${fixtures.length} structured regression fixtures.`);
