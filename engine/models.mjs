import { integerUseLimit, normalize } from './utils.mjs';

export function crossingSeconds(item) {
  const speed = Number(item.conveyorSpeed);
  return speed > 0 ? item.size.length * 3 / speed : 0;
}

export function itemArea(item) {
  return item.size.width * item.size.length;
}

export function maxPhysicalCopies(item, profile, rules, phase = 'post') {
  const exactKey = `${normalize(item.name)}::${normalize(item.variant)}`;
  if (Object.hasOwn(profile.inventory ?? {}, exactKey)) return profile.inventory[exactKey];
  if (Number.isFinite(item.maxCopies)) return item.maxCopies;
  const uses = integerUseLimit(item.limitedUses);
  if (item.name === 'Lambda Upgrader') return rules.recommendedLambdaCount;
  if (Number.isFinite(uses)) return Math.max(1, uses);
  if (phase === 'cap') return Infinity;
  return 1;
}

function updateEffects(item, effects, rules) {
  const active = new Set(effects ?? []);
  if (!rules?.effectDefinitions) return [...active];
  for (const [effect, definition] of Object.entries(rules.effectDefinitions)) {
    if (definition.removedBy?.includes(item.name)) active.delete(effect);
  }
  for (const [effect, definition] of Object.entries(rules.effectDefinitions)) {
    if (definition.appliedBy?.includes(item.name)) active.add(effect);
  }
  return [...active];
}

export function appliedEffectsForItem(item, rules) {
  return Object.entries(rules?.effectDefinitions ?? {})
    .filter(([, definition]) => definition.appliedBy?.includes(item.name))
    .map(([effect]) => effect);
}

export function itemRequirements(item, rules) {
  return rules?.itemRequirements?.[item.name] ?? {};
}

export function canActivateItem(item, state, rules = null) {
  const requirements = itemRequirements(item, rules);
  return !requirements.requiresNoEffects || !(state.effects?.length);
}

export function applyDeterministicItem(item, state, useNumber = 1, profile = {}, rules = null) {
  const type = normalize(item.mainStatType);
  const before = state.value;
  let value = before;
  let survival = state.survival;
  let replication = state.replication ?? 1;
  let oreSize = state.oreSize ?? 1;
  const model = (profile.complexItemModels ?? {})[item.name];

  const activates = canActivateItem(item, state, rules);
  if (!activates) {
    value = before;
  } else if (model) {
    value = model.operation === 'add' ? before + model.amount : before * (model.multiplier ?? 1);
    survival *= 1 - (model.destructionChance ?? 0);
    replication *= model.replication ?? 1;
  } else if (item.name === 'Lambda Upgrader') {
    const shinyScale = /shiny/i.test(item.variant) ? 1.1 : 1;
    const intrinsic = [1, 0.75, 0.5][Math.min(useNumber - 1, 2)] ?? 0.5;
    const survivorExpected = (
      before * 3.2 * shinyScale
      + (before + 1000 * shinyScale)
      + 1
      + before * 6 * shinyScale
      + 13 * before * 2.2 * shinyScale
    ) / 17;
    value = survivorExpected;
    survival *= intrinsic * (17 / 19);
  } else if (item.name === 'Runic Array') {
    const ageMultiplier = Number(item.mainStat ?? 1) * 3 ** ((state.timeSeconds ?? 0) / 120);
    value = before * ageMultiplier;
  } else if (type.includes('additive')) {
    value = before + Number(item.mainStat ?? 0);
  } else if (Number.isFinite(item.mainStat)) {
    value = before * item.mainStat;
  }

  const scannerHitChance = /scanner/i.test(`${item.name} ${item.effects ?? ''}`)
    ? (profile.scannerHitChance ?? Math.min(1, (state.oreSize ?? 1) / 4))
    : null;
  if (scannerHitChance != null && Number.isFinite(item.mainStat)) {
    value = before * (1 + scannerHitChance * (item.mainStat - 1));
  }
  if (item.name === 'Ore Expander') oreSize *= 1.55;
  if (item.name === 'Ore Shrinker') oreSize *= 0.85;

  return {
    ...state,
    value,
    survival,
    replication,
    oreSize,
    effects: activates ? updateEffects(item, state.effects, rules) : [...(state.effects ?? [])],
    activated: activates,
    timeSeconds: (state.timeSeconds ?? 0) + crossingSeconds(item),
    area: (state.area ?? 0) + itemArea(item),
  };
}

export function expectedCashWeight(state) {
  return state.value * state.survival * (state.replication ?? 1);
}
