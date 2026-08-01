import { diagnostic, itemKey, normalize } from './utils.mjs';
import { preferredRecord } from './database.mjs';

const REQUIRED = ['plotSize', 'dropper', 'highestCrate', 'variants', 'payment'];

export function validateProfile(profile, rules) {
  const diagnostics = [];
  for (const field of REQUIRED) if (profile[field] == null) diagnostics.push(diagnostic('PROFILE_MISSING', `Missing profile field: ${field}.`, { field }));
  if (profile.life == null && profile.rebirth == null) diagnostics.push(diagnostic('PROFILE_MISSING', 'Either Life or Rebirth is required.', { field: 'life/rebirth' }));
  if (profile.life != null && profile.rebirth != null && profile.life !== profile.rebirth + 1) diagnostics.push(diagnostic('PROFILE_MISSING', 'Life must equal Rebirth + 1.', { life: profile.life, rebirth: profile.rebirth }));
  if (profile.plotSize != null && (profile.plotSize < 14 || profile.plotSize > 35)) diagnostics.push(diagnostic('PROFILE_MISSING', 'Plot size must be between 14 and 35.', { plotSize: profile.plotSize }));
  if (profile.highestCrate && !rules.crateProgression.some((crate) => normalize(crate) === normalize(profile.highestCrate))) diagnostics.push(diagnostic('PROFILE_MISSING', `Unknown crate: ${profile.highestCrate}.`));
  if (!profile.dropper?.name || !profile.dropper?.variant) diagnostics.push(diagnostic('PROFILE_MISSING', 'Dropper name and variant are required.'));
  return diagnostics;
}

function sourceCrate(record, rules) {
  const sources = record.sources ?? [record.source];
  return rules.crateProgression.find((crate) => sources.some((source) => new RegExp(`\\b${crate}\\s+crate\\b`, 'i').test(source ?? ''))) ?? null;
}

function sourceRebirth(record) {
  const values = (record.sources ?? [record.source]).flatMap((source) => {
    const match = String(source ?? '').match(/rebirth\s*(\d+)/i);
    return match ? [Number(match[1])] : [];
  });
  return values.length ? Math.min(...values) : null;
}

function ownsByName(list, record) {
  return (list ?? []).some((name) => normalize(name) === normalize(record.name));
}

export function legalReason(record, profile, rules) {
  const highestCrateIndex = rules.crateProgression.findIndex((crate) => normalize(crate) === normalize(profile.highestCrate));
  const crate = sourceCrate(record, rules);
  if (crate && rules.crateProgression.indexOf(crate) > highestCrateIndex) return `requires ${crate} crate`;
  const rebirth = profile.rebirth ?? Math.max(0, profile.life - 1);
  const requiredRebirth = sourceRebirth(record);
  if (requiredRebirth != null && requiredRebirth > rebirth) return `requires Rebirth ${requiredRebirth}`;
  const source = normalize((record.sources ?? [record.source]).join(' '));
  const rarity = normalize(record.rarity);
  if ((rarity === 'secret' || record.acquisitions?.includes('secret')) && !ownsByName(profile.secretItems, record)) return 'Secret item not owned';
  if (record.acquisitions?.includes('achievement') && !ownsByName(profile.achievementItems, record)) return 'Achievement item not owned';
  if (record.acquisitions?.includes('merchant') && !ownsByName(profile.merchantItems, record)) return 'Merchant item not owned';
  if (record.acquisitions?.includes('premium') && profile.payment !== 'p2w') return 'P2W item in F2P profile';
  if (profile.payment === 'p2w' && record.acquisitions?.includes('premium') && !ownsByName(profile.premiumItems, record)) return 'Premium item not owned';
  if ((profile.forbiddenItems ?? []).some((name) => normalize(name) === normalize(record.name))) return 'explicitly forbidden';
  if (profile.variants === 'base-only' && normalize(record.variant) !== 'base') return 'non-Base variant forbidden';
  const inventoryKey = itemKey(record.name, record.variant);
  if (profile.variants === 'exact-inventory' && !Object.hasOwn(profile.inventory ?? {}, inventoryKey)) return 'variant absent from exact inventory';
  if (Object.hasOwn(profile.inventory ?? {}, inventoryKey) && profile.inventory[inventoryKey] <= 0) return 'inventory is zero';
  if (/refer to the "stats for nerds"/i.test(record.effects ?? '')
    && !(profile.complexItemModels ?? {})[record.name]
    && !rules.builtInComplexModels?.includes(record.name)) return 'complex item has no explicit model';
  if (/teleport/i.test(record.name) && !rules.teleportersEnabled) return 'teleporters disabled';
  return null;
}

export function buildLegalPool(database, profile, rules) {
  const diagnostics = validateProfile(profile, rules);
  if (diagnostics.length) return { legal: [], rejected: [], diagnostics };
  const grouped = new Map();
  for (const record of database.records) {
    const list = grouped.get(record.key) ?? [];
    list.push(record);
    grouped.set(record.key, list);
  }
  const legal = [];
  const rejected = [];
  for (const records of grouped.values()) {
    const record = preferredRecord(records);
    const reason = legalReason(record, profile, rules);
    (reason ? rejected : legal).push(reason ? { record, reason } : record);
  }
  return { legal, rejected, diagnostics };
}
