import { expectedCashWeight } from './models.mjs';

export function analyticOreFlow({ droppers, routeTimeSeconds, finalState, furnaceMultiplier, oreCap = 100 }) {
  const dropRate = droppers.reduce((sum, dropper) => sum + dropper.oresPerSecond, 0);
  const averageRemovalTime = finalState.averageRemovalTimeSeconds ?? routeTimeSeconds;
  const projectedActiveOres = dropRate * averageRemovalTime;
  const throughputScale = projectedActiveOres > 0 ? Math.min(1, oreCap / projectedActiveOres) : 1;
  const processedFraction = finalState.survival ?? 1;
  const replication = finalState.replication ?? 1;
  const furnaceEntriesPerSecond = dropRate * processedFraction * replication * throughputScale;
  const cashPerEntry = finalState.value * furnaceMultiplier;
  return {
    dropRate,
    projectedActiveOres,
    cappedActiveOres: Math.min(oreCap, projectedActiveOres),
    throughputScale,
    processedFraction,
    furnaceEntriesPerMinute: furnaceEntriesPerSecond * 60,
    expectedCashPerMinute: furnaceEntriesPerSecond * cashPerEntry * 60,
    expectedCashPerSecond: furnaceEntriesPerSecond * cashPerEntry,
    expectedRouteValue: expectedCashWeight(finalState),
    limitedByOreCap: projectedActiveOres > oreCap,
  };
}

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function seededOreSimulation({ seconds = 300, seed = 1, droppers, routeTimeSeconds, stages = [], furnaceMultiplier = 1, oreCap = 100 }) {
  const random = mulberry32(seed);
  const events = [];
  for (const dropper of droppers) {
    const interval = 1 / dropper.oresPerSecond;
    for (let time = 0; time <= seconds; time += interval) events.push({ time, type: 'spawn', dropper });
  }
  events.sort((a, b) => a.time - b.time);
  const active = [];
  let processed = 0;
  let destroyed = 0;
  let cash = 0;
  const flushUntil = (time) => {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].finishTime > time) continue;
      const ore = active.splice(index, 1)[0];
      if (ore.destroyed) destroyed += 1;
      else {
        processed += ore.count;
        cash += ore.value * ore.count * furnaceMultiplier;
      }
    }
  };
  for (const event of events) {
    flushUntil(event.time);
    if (active.reduce((sum, ore) => sum + ore.count, 0) >= oreCap) continue;
    let ore = { value: event.dropper.value, count: 1, destroyed: false, finishTime: event.time + routeTimeSeconds };
    for (const stage of stages) {
      if (random() < (stage.destructionChance ?? 0)) { ore.destroyed = true; ore.finishTime = event.time + (stage.removalTimeSeconds ?? routeTimeSeconds); break; }
      ore.value = stage.additive != null ? ore.value + stage.additive : ore.value * (stage.multiplier ?? 1);
      ore.count *= stage.replication ?? 1;
    }
    active.push(ore);
  }
  flushUntil(seconds);
  return { seconds, seed, processed, destroyed, cash, cashPerMinute: cash / seconds * 60 };
}
