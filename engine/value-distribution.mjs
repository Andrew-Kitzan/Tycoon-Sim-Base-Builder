const MAX_BRANCHES = 1024;

function distributionLabelNumber(value, places = 4) {
  const factor = 10 ** places;
  return String(Math.trunc((Number(value) + Number.EPSILON) * factor) / factor);
}

function withDistributionOutcome(entry, outcome) {
  return { ...entry, outcome, history: [...(entry.history ?? []), outcome] };
}

function normalize(entries) {
  const combined = new Map();
  for (const entry of entries.filter((candidate) => candidate.probability > 0 && Number.isFinite(candidate.value))) {
    const key = `${entry.tikiPhase ?? ''}|${(entry.history ?? []).join('>')}|${entry.outcome ?? ''}|${Number(entry.value).toPrecision(12)}`;
    const prior = combined.get(key);
    if (prior) prior.probability += entry.probability;
    else combined.set(key, { ...entry });
  }
  let output = [...combined.values()];
  const total = output.reduce((sum, entry) => sum + entry.probability, 0) || 1;
  output = output.map((entry) => ({ ...entry, probability: entry.probability / total }));
  if (output.length <= MAX_BRANCHES) return output;
  const sorted = output.sort((left, right) => left.value - right.value);
  const groupSize = Math.ceil(sorted.length / MAX_BRANCHES);
  const grouped = [];
  for (let index = 0; index < sorted.length; index += groupSize) {
    const group = sorted.slice(index, index + groupSize);
    const probability = group.reduce((sum, entry) => sum + entry.probability, 0);
    grouped.push({
      value: group.reduce((sum, entry) => sum + entry.value * entry.probability, 0) / probability,
      probability,
      outcome: 'Grouped low-probability outcomes',
    });
  }
  return grouped;
}

export function expectedDistributionValue(distribution) {
  return distribution.reduce((sum, entry) => sum + entry.value * entry.probability, 0);
}

export function applyItemValueDistribution(item, state, useNumber = 1, profile = {}, rules = null) {
  const input = state.valueDistribution?.length
    ? state.valueDistribution
    : [{ value: Number(state.value ?? 0), probability: 1 }];
  const type = String(item.mainStatType ?? '').toLowerCase();
  const additiveByVariant = { Base: 30000, Shiny: 33000, Mythic: 37500, 'Shiny Mythic': 45000 };
  const scannerChance = /scanner/i.test(`${item.name} ${item.effects ?? ''}`)
    ? (profile.scannerHitChances?.[item.name] ?? rules?.scannerHitChances?.[item.name]
      ?? profile.scannerHitChance ?? rules?.defaultScannerHitChance ?? Math.min(1, (state.oreSize ?? 1) / 4))
    : null;
  let output;

  if (item.name === 'Tiki Evaluator') {
    const sharesPhase = useNumber > 1 && input.some((entry) => entry.tikiPhase);
    output = input.flatMap((entry) => {
      if (sharesPhase && entry.tikiPhase === 'green') return [{ ...withDistributionOutcome(entry, `Green phase: ${item.mainStat}x`), value: entry.value * Number(item.mainStat ?? 1) }];
      if (sharesPhase && entry.tikiPhase === 'yellow') return [{ ...withDistributionOutcome(entry, `Yellow phase: +${additiveByVariant[item.variant] ?? 30000}`), value: entry.value + (additiveByVariant[item.variant] ?? 30000) }];
      return [
        { ...withDistributionOutcome(entry, `Green phase: ${item.mainStat}x`), value: entry.value * Number(item.mainStat ?? 1), probability: entry.probability / 2, tikiPhase: 'green' },
        { ...withDistributionOutcome(entry, `Yellow phase: +${additiveByVariant[item.variant] ?? 30000}`), value: entry.value + (additiveByVariant[item.variant] ?? 30000), probability: entry.probability / 2, tikiPhase: 'yellow' },
      ];
    });
  } else if (item.name === 'Lambda Upgrader') {
    const shinyScale = /shiny/i.test(item.variant ?? '') ? 1.1 : 1;
    output = input.flatMap((entry) => [
      { ...withDistributionOutcome(entry, `${distributionLabelNumber(3.2 * shinyScale)}x`), value: entry.value * 3.2 * shinyScale, probability: entry.probability / 17 },
      { ...withDistributionOutcome(entry, `+${1000 * shinyScale}`), value: entry.value + 1000 * shinyScale, probability: entry.probability / 17 },
      { ...withDistributionOutcome(entry, 'Set to 1'), value: 1, probability: entry.probability / 17 },
      { ...withDistributionOutcome(entry, `${distributionLabelNumber(6 * shinyScale)}x + Sparkles`), value: entry.value * 6 * shinyScale, probability: entry.probability / 17 },
      { ...withDistributionOutcome(entry, `${distributionLabelNumber(2.2 * shinyScale)}x`), value: entry.value * 2.2 * shinyScale, probability: entry.probability * 13 / 17 },
    ]);
  } else if (scannerChance != null && Number.isFinite(item.mainStat)) {
    output = input.flatMap((entry) => [
      { ...withDistributionOutcome(entry, `Scanner hit: ${item.mainStat}x`), value: entry.value * item.mainStat, probability: entry.probability * scannerChance },
      { ...withDistributionOutcome(entry, 'Scanner miss'), probability: entry.probability * (1 - scannerChance) },
    ]);
  } else {
    output = input.map((entry) => {
      let value = entry.value;
      if (item.name === 'Incremental Upgrader') {
        const multipliers = rules?.incrementalMultipliers?.[item.variant]
          ?? (/shiny/i.test(item.variant ?? '') ? [1.21, 1.375, 1.925] : [1.1, 1.25, 1.75]);
        value *= Number(multipliers[Math.max(0, useNumber - 1)] ?? 1);
      } else if (item.name === 'Crimson Pillars') value = entry.value;
      else if (item.name === 'Runic Array') value *= Number(item.mainStat ?? 1) * 3 ** ((state.timeSeconds ?? 0) / 120);
      else if (type.includes('additive')) value += Number(item.mainStat ?? 0);
      else if (Number.isFinite(item.mainStat)) value *= item.mainStat;
      return { ...entry, value };
    });
  }
  return normalize(output);
}
