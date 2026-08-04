import { integerUseLimit, normalize } from './utils.mjs';
import { isCrimsonPillars } from './crimson.mjs';

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
  if (rules.effectClearers?.includes(item.name) || /collider/i.test(item.name)) active.clear();
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
  let outcomeModel = null;
  const model = (profile.complexItemModels ?? {})[item.name];

  const activates = canActivateItem(item, state, rules);
  if (!activates) {
    value = before;
  } else if (model) {
    value = model.operation === 'add' ? before + model.amount : before * (model.multiplier ?? 1);
    survival *= 1 - (model.destructionChance ?? 0);
    replication *= model.replication ?? 1;
  } else if (isCrimsonPillars(item)) {
    // Crimson marks ore here; only a later phantom zone supplies the multiplier.
    value = before;
    outcomeModel = { kind: 'crimson-mark', expectedSurvivorValue: before, outcomes: [] };
  } else if (item.name === 'Lambda Upgrader') {
    const shinyScale = /shiny/i.test(item.variant) ? 1.1 : 1;
    const intrinsic = useNumber <= 1 ? 1 : 1.5 / useNumber;
    const survivorExpected = (
      before * 3.2 * shinyScale
      + (before + 1000 * shinyScale)
      + 1
      + before * 6 * shinyScale
      + 13 * before * 2.2 * shinyScale
    ) / 17;
    value = survivorExpected;
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
  } else if (item.name === 'Tiki Evaluator') {
    const additiveByVariant = { Base: 30000, Shiny: 33000, Mythic: 37500, 'Shiny Mythic': 45000 };
    const multipliedValue = before * Number(item.mainStat ?? 1);
    const additiveValue = before + (additiveByVariant[item.variant] ?? 30000);
    value = (multipliedValue + additiveValue) / 2;
    survival *= 2 / 3;
    outcomeModel = {
      kind: 'tiki-phase',
      expectedSurvivorValue: value,
      outcomes: [
        { label: 'Red phase: destroyed', probability: 1 / 3, destroyed: true },
        { label: `Green phase: ${item.mainStat}x`, probability: 1 / 3, value: multipliedValue },
        { label: `Yellow phase: +${additiveByVariant[item.variant] ?? 30000}`, probability: 1 / 3, value: additiveValue },
      ],
    };
  } else if (item.name === 'Runic Array') {
    const ageMultiplier = Number(item.mainStat ?? 1) * 3 ** ((state.timeSeconds ?? 0) / 120);
    value = before * ageMultiplier;
  } else if (type.includes('additive')) {
    value = before + Number(item.mainStat ?? 0);
  } else if (Number.isFinite(item.mainStat)) {
    value = before * item.mainStat;
  }

  const scannerHitChance = /scanner/i.test(`${item.name} ${item.effects ?? ''}`)
    ? (profile.scannerHitChances?.[item.name]
      ?? rules?.scannerHitChances?.[item.name]
      ?? profile.scannerHitChance
      ?? rules?.defaultScannerHitChance
      ?? Math.min(1, (state.oreSize ?? 1) / 4))
    : null;
  if (scannerHitChance != null && Number.isFinite(item.mainStat)) {
    value = before * (1 + scannerHitChance * (item.mainStat - 1));
    outcomeModel = {
      kind: 'scanner',
      expectedSurvivorValue: value,
      outcomes: [
        { label: `Hit: ${item.mainStat}x`, probability: scannerHitChance, value: before * item.mainStat },
        { label: 'Miss: unchanged', probability: 1 - scannerHitChance, value: before },
      ],
    };
  }
  if (item.name === 'Ore Expander') oreSize *= 1.55;
  if (item.name === 'Ore Shrinker') oreSize *= 0.85;

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
    effects: activates ? updateEffects(item, state.effects, rules) : [...(state.effects ?? [])],
    activated: activates,
    timeSeconds: (state.timeSeconds ?? 0) + crossingSeconds(item),
    area: (state.area ?? 0) + itemArea(item),
  };
}

export function expectedCashWeight(state) {
  return state.value * state.survival * (state.replication ?? 1);
}
