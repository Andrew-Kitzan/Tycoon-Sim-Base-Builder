import { crossingSeconds } from './models.mjs';

function namedEffects(item, rules) {
  const text = `${item.effects ?? ''}`;
  return Object.keys(rules.destructiveEffectTimers).filter((effect) => {
    const knownSources = rules.effectDefinitions?.[effect]?.appliedBy;
    if (knownSources?.length) return knownSources.some((name) => name.toLowerCase() === item.name.toLowerCase());
    return new RegExp(`(?:appl(?:y|ies)|gives?|has|sets?[^\n.]*on)\\b[^\n.]*\\b${effect}\\b`, 'i').test(text)
      && !new RegExp(`remov(?:e|es|ing)[^\n.]*\\b${effect}\\b`, 'i').test(text);
  });
}

function immuneTo(dropper, effect) {
  const text = `${dropper.effects ?? ''}`;
  return new RegExp(`(?:not|won't|will not)\\s+(?:be destroyed|die)[^\n]*${effect}|${effect}[^\n]*(?:not|won't|will not)\\s+(?:destroy|kill|die)`, 'i').test(text);
}

function isWasher(item) {
  return /ore wash(?:er)?/i.test(item.name) || /removes? (?:all )?(?:ore )?effects?/i.test(item.effects ?? '');
}

function isEffectRemover(item, effect) {
  if (isWasher(item)) return true;
  return effect.toLowerCase() === 'fire' && /oasis/i.test(item.name);
}

function timerForEffect(effect, item, rules) {
  const definition = rules.effectDefinitions?.[effect];
  return definition?.sourceTimerSeconds?.[item.name]
    ?? definition?.timerSeconds
    ?? rules.destructiveEffectTimers[effect];
}

export function destructiveEffectsInChain(chain, rules) {
  return [...new Set(chain.flatMap((entry) => namedEffects(entry.item ?? entry, rules)))];
}

export function evaluateEffectSafety({ dropper, dropperCount = 1, chain, layout, rules }) {
  const results = [];
  for (let index = 0; index < chain.length; index += 1) {
    const item = chain[index].item ?? chain[index];
    for (const effect of namedEffects(item, rules)) {
      if (immuneTo(dropper, effect)) {
        results.push({ effect, chainIndex: index, appliedBy: item.name, safe: true, immune: true, exposureSeconds: 0, timerSeconds: timerForEffect(effect, item, rules) });
        continue;
      }
      const washable = effect.toLowerCase() !== 'overcharged';
      let destination = chain.length;
      if (washable) {
        const removerIndex = chain.findIndex((entry, candidateIndex) => candidateIndex > index && isEffectRemover(entry.item ?? entry, effect));
        if (removerIndex >= 0) destination = removerIndex;
      }
      const startSequence = dropperCount + index;
      const destinationSequence = dropperCount + destination;
      let exposureSeconds = (layout.connections ?? [])
        .filter((connection) => connection.fromSequence >= startSequence && connection.toSequence <= destinationSequence)
        .reduce((sum, connection) => sum + connection.seconds, 0);
      for (let candidateIndex = index + 1; candidateIndex <= destination && candidateIndex < chain.length; candidateIndex += 1) {
        exposureSeconds += crossingSeconds(chain[candidateIndex].item ?? chain[candidateIndex]);
      }
      const timerSeconds = timerForEffect(effect, item, rules);
      results.push({
        effect,
        chainIndex: index,
        appliedBy: item.name,
        removedBy: destination < chain.length ? (chain[destination].item ?? chain[destination]).name : 'Furnace',
        exposureSeconds,
        timerSeconds,
        marginSeconds: timerSeconds - exposureSeconds,
        safe: exposureSeconds < timerSeconds,
        immune: false,
      });
    }
  }
  return { safe: results.every((result) => result.safe), effects: results };
}

export function isEffectWasher(item) { return isWasher(item); }
export function removesEffect(item, effect) { return isEffectRemover(item, effect); }
