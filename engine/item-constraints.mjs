import { integerUseLimit } from './utils.mjs';

export function itemUseLimit(item) {
  return integerUseLimit(item?.limitedUses);
}

export function exceedsItemUseLimit(item, useNumber) {
  const limit = itemUseLimit(item);
  // Scanner limits apply to successful hits, not beam attempts; later scanners
  // remain useful when earlier scanners miss.
  return !/scanner/i.test(item?.name ?? '') && Number.isFinite(limit) && useNumber > limit;
}

export function maximumAcceptedOreSize(item) {
  const acceptable = item?.oreSizeRestriction?.acceptable ?? [];
  const confirmed = acceptable.map(Number).filter(Number.isFinite);
  return confirmed.length ? Math.max(...confirmed) : null;
}

export function exceedsOreSizeLimit(item, oreSize) {
  const maximum = maximumAcceptedOreSize(item);
  return maximum != null && Number(oreSize) > maximum + 1e-9;
}

export function firstOreSizeViolation(stages = []) {
  return stages.find((stage) => exceedsOreSizeLimit(stage.item?.definition ?? stage.item, stage.beforeOreSize)) ?? null;
}
