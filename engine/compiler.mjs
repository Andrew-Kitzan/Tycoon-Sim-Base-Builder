import path from 'node:path';
import { loadDatabase, loadRules, findItem } from './database.mjs';
import { buildLegalPool } from './profile.mjs';
import { optimizeCapgraders, optimizePostCap, chooseFurnace } from './optimizer.mjs';
import { autoLayout } from './layout.mjs';
import { analyticOreFlow, seededOreSimulation } from './simulation.mjs';
import { compactNumber, diagnostic, normalize } from './utils.mjs';
import { evaluateEffectSafety } from './effects.mjs';

function uniqueChainEntries(chain) { return chain.map((entry) => entry.item); }

function renderType(item) {
  if (/Portable Upgrader|Portable Spinner|Ore Glazer|Derp Blaster|Dragon/i.test(item.name)) return 'portable';
  return item.type;
}

function dropQuantity(record) {
  const match = String(record.effects ?? '').match(/drops?\s+(\d+)\s+ore/i);
  return match ? Number(match[1]) : 1;
}

function hasHardLayoutError(layout) {
  return layout.diagnostics.some((entry) => ['OUT_OF_BOUNDS', 'COLLISION', 'ROUTE_GAP', 'FURNACE_MISSED', 'PORTABLE_UNREACHABLE'].includes(entry.code));
}

function candidateScore(state, layout, furnace, quantity = 1) {
  const conveyorTime = layout.conveyors.reduce((sum, conveyor) => sum + conveyorTravelSeconds(conveyor), 0);
  return quantity * state.value * state.survival * (state.replication ?? 1) * furnace.mainStat / Math.max(1, state.timeSeconds + conveyorTime);
}

function conveyorTravelSeconds(conveyor) {
  const length = ['Normal Conveyor', 'Supercharged Conveyor', 'Centering Conveyor', 'Ultracharged Conveyor'].includes(conveyor.conveyor) ? 2 : 1;
  return length * 3 / Math.max(0.01, conveyor.speed);
}

function desiredDropperQuantity(profile, dropper, state, rules) {
  if (profile.dropper.quantity != null) return profile.dropper.quantity;
  const maxCopies = Number.isFinite(dropper.maxCopies) ? dropper.maxCopies : 6;
  const rate = Math.max(0.01, Number(dropper.dropSpeed ?? 0) * dropQuantity(dropper));
  const targetActive = profile.objective === 'low-ore-limit' ? 40 : 90;
  return Math.max(1, Math.min(6, maxCopies, Math.ceil(targetActive / (rate * Math.max(1, state.timeSeconds)))));
}

function simulationStages(chain) {
  let priorSurvival = 1;
  return chain.map((entry) => {
    const survival = entry.survival ?? priorSurvival;
    const destructionChance = priorSurvival > 0 ? Math.max(0, 1 - survival / priorSurvival) : 0;
    priorSurvival = survival;
    return {
      name: entry.item.name,
      multiplier: entry.before ? entry.after / entry.before : 1,
      destructionChance,
    };
  });
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0ms';
  if (seconds < 1) return `${Math.trunc(seconds * 1000)}ms`;
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.trunc((seconds - Math.floor(seconds)) * 1000);
  return `${minutes ? `${minutes}m ` : ''}${wholeSeconds}s${milliseconds ? ` ${milliseconds}ms` : ''}`;
}

function itemStats({ placed, type, entry, chainIndex, chain, quantity, layout, effectSafety, finalTime }) {
  const stats = { Variant: placed.item.variant, 'Main stat': placed.item.mainStat, Range: placed.item.range, Source: placed.item.source };
  if (entry) {
    stats['Ore value before'] = `$${compactNumber(entry.before)}`;
    stats['Ore value after'] = `$${compactNumber(entry.after)}`;
    if (entry.oreSizeBefore !== entry.oreSizeAfter || /Expander|Shrinker/i.test(placed.item.name)) {
      stats['Ore size before'] = Number(entry.oreSizeBefore).toFixed(3);
      stats['Ore size after'] = Number(entry.oreSizeAfter).toFixed(3);
    }
    const connectorTime = (layout.connections ?? [])
      .filter((connection) => connection.toSequence <= placed.sequenceIndex)
      .reduce((sum, connection) => sum + connection.seconds, 0);
    const arrival = (entry.timeBefore ?? 0) + connectorTime;
    stats['Arrival time from droppers'] = Array.from({ length: quantity }, (_, index) => `${String.fromCharCode(65 + index)}: ${formatDuration(arrival)}`).join(' · ');
    stats['Time across upgrader'] = formatDuration((entry.timeAfter ?? 0) - (entry.timeBefore ?? 0));
    if ((entry.survival ?? 1) < (entry.survivalBefore ?? 1)) {
      stats['Destruction at this upgrader'] = `${((1 - entry.survival / entry.survivalBefore) * 100).toFixed(2)}%`;
      stats['Total ore destruction by this point'] = `${((1 - entry.survival) * 100).toFixed(2)}%`;
    }
    if (placed.item.name === 'Lambda Upgrader') {
      const lambdaUse = chain.slice(0, chainIndex + 1).filter((candidate) => candidate.item.name === 'Lambda Upgrader').length;
      const shinyScale = /shiny/i.test(placed.item.variant) ? 1.1 : 1;
      stats['Expected ore value before Lambda'] = `$${compactNumber(entry.before)}`;
      stats['Good outcome · 2.2x'] = `$${compactNumber(entry.before * 2.2 * shinyScale)}`;
      stats['Good outcome · 3.2x'] = `$${compactNumber(entry.before * 3.2 * shinyScale)}`;
      stats['Good outcome · 6x + Sparkles'] = `$${compactNumber(entry.before * 6 * shinyScale)}`;
      stats['Lambda use'] = `${lambdaUse}`;
      stats['Intrinsic survival through this use'] = `${Math.min(100, (entry.survival / Math.max(0.000001, entry.survivalBefore)) / (17 / 19) * 100).toFixed(2)}%`;
      stats['Survival including Explosion/Fling'] = `${((entry.survival / Math.max(0.000001, entry.survivalBefore)) * 100).toFixed(2)}%`;
    }
  }
  const effects = effectSafety.effects.filter((effect) => effect.chainIndex === chainIndex);
  if (effects.length) {
    stats.Effect = effects.map((effect) => effect.effect).join(', ');
    stats['Next remover'] = effects.map((effect) => effect.removedBy).join(', ');
    stats['Route to safety'] = effects.map((effect) => formatDuration(effect.exposureSeconds)).join(', ');
    stats['Destruction timer'] = effects.map((effect) => formatDuration(effect.timerSeconds)).join(', ');
    stats['Safety margin'] = effects.map((effect) => formatDuration(Math.max(0, effect.marginSeconds))).join(', ');
  }
  if (type === 'furnace') stats['Arrival time from droppers'] = Array.from({ length: quantity }, (_, index) => `${String.fromCharCode(65 + index)}: ${formatDuration(finalTime + layout.connections.reduce((sum, connection) => sum + connection.seconds, 0))}`).join(' · ');
  return stats;
}

function includesRequiredItems(state, dropper, furnace, profile) {
  const used = new Set([dropper.name, furnace.name, ...state.chain.map((entry) => entry.item.name)].map(normalize));
  return (profile.requiredItems ?? []).every((name) => used.has(normalize(name)));
}

export async function compilePlan(profile, options = {}) {
  const root = options.root ?? path.resolve(import.meta.dirname, '..');
  const [database, rules] = await Promise.all([loadDatabase(root), loadRules(root)]);
  const pool = buildLegalPool(database, profile, rules);
  if (pool.diagnostics.length) return { version: 1, profile, diagnostics: pool.diagnostics, valid: false };
  const requestedDropper = findItem(database, profile.dropper.name, profile.dropper.variant);
  if (!requestedDropper) return { version: 1, profile, diagnostics: [diagnostic('ITEM_ILLEGAL', 'Requested dropper was not found.')], valid: false };
  const legalDropper = pool.legal.find((item) => item.key === requestedDropper.key);
  if (!legalDropper) {
    const rejection = pool.rejected.find((entry) => entry.record.key === requestedDropper.key);
    return { version: 1, profile, diagnostics: [diagnostic('ITEM_ILLEGAL', `Requested dropper is illegal: ${rejection?.reason ?? 'unknown reason'}.`)], valid: false };
  }
  if (profile.dropper.quantity != null && Number.isFinite(legalDropper.maxCopies) && profile.dropper.quantity > legalDropper.maxCopies) {
    return { version: 1, profile, diagnostics: [diagnostic('USE_LIMIT', `${legalDropper.name} is limited to ${legalDropper.maxCopies} physical copy/copies.`)], valid: false };
  }
  const initialValue = legalDropper.mainStat;
  const cap = optimizeCapgraders({ initialValue, initialOreSize: legalDropper.oreSize ?? 1, legalItems: pool.legal, profile, rules, maxSteps: options.capSteps, beamWidth: options.beamWidth });
  const furnace = chooseFurnace(pool.legal, cap.best, profile, rules);
  if (!furnace) return { version: 1, profile, diagnostics: [diagnostic('ITEM_ILLEGAL', 'No deterministic legal furnace is available.')], valid: false };
  let selected = null;
  // Couple item selection to physical fit: test several high-quality cap chains,
  // then retain the highest-value post-cap candidate that actually maps.
  for (const capState of [cap.best, ...cap.alternatives].slice(0, 24)) {
    const minimumDroppers = Array.from({ length: profile.dropper.quantity ?? 1 }, () => legalDropper);
    const capLayout = autoLayout({ dropper: legalDropper, droppers: minimumDroppers, chain: uniqueChainEntries(capState.chain), furnace, plotSize: profile.plotSize, rules });
    if (hasHardLayoutError(capLayout)) continue;
    const areaBudget = Math.max(0, profile.plotSize ** 2 * 0.82 - capState.area - legalDropper.size.width * legalDropper.size.length - furnace.size.width * furnace.size.length);
    const postResult = optimizePostCap({ initialState: capState, legalItems: pool.legal, profile, rules, areaBudget, maxSteps: options.postSteps, beamWidth: options.beamWidth });
    for (const postState of [...postResult.alternatives, capState]) {
      if (!includesRequiredItems(postState, legalDropper, furnace, profile)) continue;
      const desiredQuantity = desiredDropperQuantity(profile, legalDropper, postState, rules);
      for (let quantity = desiredQuantity; quantity >= 1; quantity -= 1) {
        const droppersForLayout = Array.from({ length: quantity }, () => legalDropper);
        const layout = autoLayout({ dropper: legalDropper, droppers: droppersForLayout, chain: uniqueChainEntries(postState.chain), furnace, plotSize: profile.plotSize, rules });
        if (hasHardLayoutError(layout)) continue;
        const effectSafety = evaluateEffectSafety({ dropper: legalDropper, dropperCount: quantity, chain: postState.chain, layout, rules });
        if (!effectSafety.safe) continue;
        const score = candidateScore(postState, layout, furnace, quantity);
        if (!selected || score > selected.score) selected = { capState, postState, postResult, layout, score, quantity, effectSafety };
        break;
      }
      if (selected?.postState === postState) break;
    }
  }
  if (!selected) {
    const layout = autoLayout({ dropper: legalDropper, chain: uniqueChainEntries(cap.best.chain), furnace, plotSize: profile.plotSize, rules });
    return { version: 1, profile, title: `${legalDropper.name} layout`, valid: false, items: [], conveyors: [], route: [], diagnostics: layout.diagnostics.length ? layout.diagnostics : [diagnostic('OUT_OF_BOUNDS', 'No optimized chain fits the plot.')], legalPool: { accepted: pool.legal.length, rejected: pool.rejected.length } };
  }
  const { capState, postState, postResult: post, layout, quantity, effectSafety } = selected;
  const routeTimeSeconds = postState.timeSeconds + layout.conveyors.reduce((sum, conveyor) => sum + conveyorTravelSeconds(conveyor), 0);
  const oresPerSecond = Number(legalDropper.dropSpeed ?? 0) * dropQuantity(legalDropper);
  const droppers = Array.from({ length: quantity }, (_, index) => ({ label: String.fromCharCode(65 + index), oresPerSecond, value: initialValue }));
  const economy = analyticOreFlow({ droppers, routeTimeSeconds, finalState: postState, furnaceMultiplier: furnace.mainStat, oreCap: rules.oreCap });
  const simulation = seededOreSimulation({
    seconds: options.simulationSeconds ?? 300,
    seed: options.seed ?? 1,
    droppers,
    routeTimeSeconds,
    stages: simulationStages(postState.chain),
    furnaceMultiplier: furnace.mainStat,
    oreCap: rules.oreCap,
  });
  const diagnostics = [...layout.diagnostics];
  const finalCapRatio = capState.finalCap ? capState.finalInput / capState.finalCap : null;
  if (finalCapRatio != null && finalCapRatio < 1 - rules.finalCapTolerance) diagnostics.push(diagnostic('CAP_RANGE', `Best final capgrader input is ${(finalCapRatio * 100).toFixed(2)}% of its cap; below the preferred band.`, { ratio: finalCapRatio }));
  const hardErrors = diagnostics.filter((entry) => ['OUT_OF_BOUNDS', 'COLLISION', 'ROUTE_GAP', 'FURNACE_MISSED', 'PORTABLE_UNREACHABLE', 'ITEM_ILLEGAL'].includes(entry.code));
  const orderedItems = [...layout.items].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  return {
    version: 1,
    profile,
    title: `${profile.life ? `Life ${profile.life}` : `Rebirth ${profile.rebirth}`} ${legalDropper.variant} ${legalDropper.name}`,
    valid: hardErrors.length === 0,
    legalPool: { accepted: pool.legal.length, rejected: pool.rejected.length },
    items: orderedItems.map((placed, index) => {
      const type = placed.sequenceIndex >= quantity && placed.sequenceIndex < quantity + capState.chain.length ? 'capgrader' : renderType(placed.item);
      const chainIndex = placed.sequenceIndex - quantity;
      const entry = chainIndex >= 0 && chainIndex < postState.chain.length ? postState.chain[chainIndex] : null;
      return ({
      id: placed.id, order: index + 1, name: placed.item.name, variant: placed.item.variant,
      type, x: placed.x, y: placed.y, width: placed.width, height: placed.height,
      itemWidth: placed.item.size.width, itemLength: placed.item.size.length,
      direction: placed.direction, conveyorWidth: ['dropper', 'furnace', 'portable'].includes(renderType(placed.item)) ? 0 : (placed.item.size.width % 2 === 0 ? 2 : 1),
      beamLength: renderType(placed.item) === 'portable' ? (placed.item.name === 'Portable Spinner' ? 1 : rules.defaultPortableBeamLength) : 0,
      processingZoneAcross: renderType(placed.item) === 'furnace' ? (rules.furnaceOverrides[placed.item.name]?.across ?? 2) : 0,
      processingZoneDepth: renderType(placed.item) === 'furnace' ? (rules.furnaceOverrides[placed.item.name]?.depth ?? 2) : 0,
      processingZonePlacement: renderType(placed.item) === 'furnace' ? (rules.furnaceOverrides[placed.item.name]?.placement ?? 'front-center') : null,
      description: placed.item.effects ?? '', stats: itemStats({ placed, type, entry, chainIndex, chain: postState.chain, quantity, layout, effectSafety, finalTime: postState.timeSeconds }),
    }); }),
    conveyors: layout.conveyors,
    route: layout.route,
    furnaceZone: layout.furnaceZone,
    diagnostics,
    optimization: {
      capStates: cap.searchedStates,
      postStates: post.searchedStates,
      finalCapInput: capState.finalInput,
      finalCap: capState.finalCap,
      finalCapRatio,
      valueBeforeFurnace: postState.value,
      survival: postState.survival,
      routeTimeSeconds,
      dropperQuantity: quantity,
      effectSafety,
    },
    metrics: {
      ...economy,
      seededSimulation: simulation,
      expectedCashPerMinuteText: `${compactNumber(economy.expectedCashPerMinute)}/min`,
      expectedCashPerSecondText: `${compactNumber(economy.expectedCashPerSecond)}/sec`,
    },
  };
}
