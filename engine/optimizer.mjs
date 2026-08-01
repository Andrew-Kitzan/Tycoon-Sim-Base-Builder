import { applyDeterministicItem, crossingSeconds, expectedCashWeight, itemArea, maxPhysicalCopies } from './models.mjs';
import { integerUseLimit, normalize, parseRange } from './utils.mjs';

function bestVariantPerName(items, rules) {
  const rank = new Map(rules.variantRank.map((variant, index) => [normalize(variant), index]));
  const grouped = new Map();
  for (const item of items) {
    const prior = grouped.get(normalize(item.name));
    if (!prior || (rank.get(normalize(item.variant)) ?? -1) > (rank.get(normalize(prior.variant)) ?? -1)) grouped.set(normalize(item.name), item);
  }
  return [...grouped.values()];
}

function useAllowed(item, state, profile, rules, phase = 'post') {
  const used = state.uses[normalize(item.name)] ?? 0;
  const perOreLimit = integerUseLimit(item.limitedUses);
  const physicalLimit = maxPhysicalCopies(item, profile, rules, phase);
  return used < Math.min(perOreLimit, physicalLimit);
}

function addUse(state, item) {
  return { ...state.uses, [normalize(item.name)]: (state.uses[normalize(item.name)] ?? 0) + 1 };
}

function chainEntry(item, beforeState, afterState) {
  return {
    item,
    before: beforeState.value,
    after: afterState.value,
    oreSizeBefore: beforeState.oreSize,
    oreSizeAfter: afterState.oreSize,
    survivalBefore: beforeState.survival,
    survival: afterState.survival,
    timeBefore: beforeState.timeSeconds,
    timeAfter: afterState.timeSeconds,
  };
}

function paretoKey(state) {
  return `${Math.round(Math.log10(Math.max(1, state.value)) * 100)}|${Object.entries(state.uses).sort().map(([name, count]) => `${name}:${count}`).join(',')}`;
}

function prune(states, width, score) {
  const best = new Map();
  for (const state of states) {
    const key = paretoKey(state);
    const prior = best.get(key);
    if (!prior || score(state) > score(prior)) best.set(key, state);
  }
  return [...best.values()].sort((a, b) => score(b) - score(a)).slice(0, width);
}

export function optimizeCapgraders({ initialValue, initialOreSize = 1, legalItems, profile, rules, maxSteps = 18, beamWidth = 2500 }) {
  const capgraders = legalItems.filter((item) => item.sourceSheets?.some((source) => source.sheet === 'Capgrader')
    && Number.isFinite(item.mainStat) && parseRange(item.range));
  const lunar = bestVariantPerName(legalItems.filter((item) => item.name === 'Lunar Landing'), rules)[0];
  const additives = bestVariantPerName(legalItems.filter((item) => normalize(item.mainStatType).includes('additive') && Number.isFinite(item.mainStat)), rules);
  const initial = { value: initialValue, oreSize: initialOreSize, survival: 1, replication: 1, timeSeconds: 0, area: 0, uses: {}, chain: [], finalInput: null, finalCap: null };
  let openingStates = [initial];
  if (lunar) {
    const state = applyDeterministicItem(lunar, initial, 1, profile);
    openingStates.push({ ...state, uses: addUse(initial, lunar), chain: [chainEntry(lunar, initial, state)] });
  }
  const lunarGain = lunar?.mainStat ?? 1;
  // Additives may repeat at the opening, but only while the next additive is
  // more valuable than Lunar (or a normal in-range capgrader) at that value.
  let additiveFrontier = [initial];
  for (let depth = 0; depth < 4; depth += 1) {
    const next = [];
    for (const state of additiveFrontier) for (const additive of additives) {
      if (!useAllowed(additive, state, profile, rules, 'cap')) continue;
      const additiveGain = (state.value + additive.mainStat) / Math.max(1, state.value);
      const bestCapGain = capgraders
        .filter((item) => {
          const range = parseRange(item.range);
          return state.value >= range.minimum && state.value <= range.maximum;
        })
        .reduce((best, item) => Math.max(best, item.mainStat), 1);
      if (additiveGain <= Math.max(lunarGain, bestCapGain)) continue;
      const applied = applyDeterministicItem(additive, state, (state.uses[normalize(additive.name)] ?? 0) + 1, profile);
      next.push({ ...applied, uses: addUse(state, additive), chain: [...state.chain, chainEntry(additive, state, applied)] });
    }
    if (!next.length) break;
    openingStates.push(...next);
    additiveFrontier = prune(next, Math.min(beamWidth, 250), (state) => Math.log(Math.max(1, state.value)) - state.timeSeconds * 0.002 - state.area * 0.0002);
  }

  let frontier = openingStates;
  const terminals = [];
  const score = (state) => Math.log(Math.max(1, state.value)) - state.timeSeconds * 0.002 - state.area * 0.0002;
  for (let depth = 0; depth < maxSteps; depth += 1) {
    const next = [];
    for (const state of frontier) {
      for (const item of capgraders) {
        const range = parseRange(item.range);
        if (state.value < range.minimum || state.value > range.maximum || !useAllowed(item, state, profile, rules, 'cap')) continue;
        const useNumber = (state.uses[normalize(item.name)] ?? 0) + 1;
        const applied = applyDeterministicItem(item, state, useNumber, profile);
        const candidate = {
          ...applied,
          uses: addUse(state, item),
          chain: [...state.chain, chainEntry(item, state, applied)],
          finalInput: state.value,
          finalCap: range.maximum,
        };
        terminals.push(candidate);
        if (!/scanner/i.test(item.name)) next.push(candidate);
      }
    }
    if (!next.length) break;
    frontier = prune(next, beamWidth, score);
  }
  const terminalScore = (state) => {
    const ratio = state.finalInput / state.finalCap;
    const nearBand = ratio >= 1 - rules.finalCapTolerance ? 1 : 0;
    return nearBand * 1e9 + ratio * 1e7 + Math.log(Math.max(1, state.value)) * 1e4 - state.timeSeconds * 10 - state.area;
  };
  const best = terminals.sort((a, b) => terminalScore(b) - terminalScore(a))[0] ?? initial;
  const alternatives = [];
  const seenChains = new Set();
  for (const state of terminals.sort((a, b) => terminalScore(b) - terminalScore(a))) {
    const signature = state.chain.map((entry) => `${entry.item.key}@${entry.before}`).join('|');
    if (seenChains.has(signature)) continue;
    seenChains.add(signature);
    alternatives.push(state);
    if (alternatives.length >= 40) break;
  }
  return { best, alternatives, searchedStates: terminals.length };
}

export function optimizePostCap({ initialState, legalItems, profile, rules, maxSteps = 28, beamWidth = 2000, areaBudget = Infinity }) {
  const items = bestVariantPerName(legalItems.filter((item) => item.type === 'upgrader'
    && !item.sourceSheets?.some((source) => source.sheet === 'Capgrader')
    && item.name !== 'Lunar Landing'
    && (Number.isFinite(item.mainStat) || rules.builtInComplexModels.includes(item.name))), rules);
  const initial = { ...initialState, uses: { ...(initialState.uses ?? {}) }, chain: [...(initialState.chain ?? [])] };
  let frontier = [initial];
  let best = initial;
  const candidates = [initial];
  const score = (state) => Math.log(Math.max(1, expectedCashWeight(state))) - state.timeSeconds * 0.002 - state.area * 0.0005;
  for (let depth = 0; depth < maxSteps; depth += 1) {
    const next = [];
    for (const state of frontier) {
      for (const item of items) {
        if (!useAllowed(item, state, profile, rules)) continue;
        if (state.area + itemArea(item) > areaBudget) continue;
        const useNumber = (state.uses[normalize(item.name)] ?? 0) + 1;
        const applied = applyDeterministicItem(item, state, useNumber, profile);
        const candidate = {
          ...applied,
          uses: addUse(state, item),
          chain: [...state.chain, chainEntry(item, state, applied)],
        };
        next.push(candidate);
        candidates.push(candidate);
        if (score(candidate) > score(best)) best = candidate;
      }
    }
    if (!next.length) break;
    frontier = prune(next, beamWidth, score);
  }
  return {
    best,
    alternatives: candidates.sort((a, b) => score(b) - score(a)).slice(0, 50),
    searchedStates: candidates.length,
    score: expectedCashWeight(best),
  };
}

export function chooseFurnace(legalItems, state, profile, rules) {
  const furnaces = bestVariantPerName(legalItems.filter((item) => item.type === 'furnace' && Number.isFinite(item.mainStat)), rules);
  const required = furnaces.find((item) => (profile.requiredItems ?? []).some((name) => normalize(name) === normalize(item.name)));
  if (required) return required;
  return furnaces.sort((a, b) => (b.mainStat ?? 0) - (a.mainStat ?? 0))[0] ?? null;
}
