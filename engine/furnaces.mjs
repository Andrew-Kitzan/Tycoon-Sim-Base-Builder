function rateFromText(text, pattern) {
  const match = String(text ?? '').match(pattern);
  return match ? Number(match[1]) : null;
}

export function krakatoaRates(furnace) {
  const text = `${furnace?.effects ?? ''}\n${furnace?.description ?? ''}`;
  return {
    anyEffect: rateFromText(text, /([\d.]+)\s*for any effects?/i),
    fire: rateFromText(text, /([\d.]+)\s*if on fire/i),
    frost: rateFromText(text, /([\d.]+)\s*if (?:it )?has frost/i),
    noEffects: rateFromText(text, /([\d.]+)\s*if (?:it )?(?:has )?no effects?/i),
  };
}

export function furnaceMultiplierForOre(furnace, {
  activeEffects = [],
  fireAppliedSecondsAgo = Number.POSITIVE_INFINITY,
  fireWindowSeconds = 3,
} = {}) {
  if (furnace?.name !== 'Krakatoa') {
    return { multiplier: Number(furnace?.mainStat ?? 0), condition: 'Fixed multiplier' };
  }

  const rates = krakatoaRates(furnace);
  const effects = new Set(activeEffects ?? []);
  if (effects.has('Fire') && fireAppliedSecondsAgo <= fireWindowSeconds) {
    return { multiplier: rates.fire, condition: `Fire within ${fireWindowSeconds}s` };
  }
  if (effects.has('Frost')) return { multiplier: rates.frost, condition: 'Frost' };
  if (effects.size) return { multiplier: rates.anyEffect, condition: `Any effect (${[...effects].join(', ')})` };
  return { multiplier: rates.noEffects, condition: 'No effects' };
}
