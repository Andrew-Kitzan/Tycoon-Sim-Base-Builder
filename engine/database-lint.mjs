import { normalize } from './utils.mjs';

export function lintDatabase(database, rules) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  for (const record of database.records ?? []) {
    const label = `${record.variant ?? '?'} ${record.name ?? '?'}`;
    if (!record.name || !record.variant || !record.type) errors.push({ code: 'DATABASE_REQUIRED', item: label, message: 'Name, variant, and type are required.' });
    if (!Number.isFinite(record.size?.width) || !Number.isFinite(record.size?.length) || record.size.width <= 0 || record.size.length <= 0) errors.push({ code: 'DATABASE_SIZE', item: label, message: 'Width and length must be positive numbers.' });
    if (!record.source && !(record.sources?.length)) warnings.push({ code: 'DATABASE_SOURCE', item: label, message: 'No acquisition source is recorded.' });
    if (seen.has(record.key)) errors.push({ code: 'DATABASE_DUPLICATE', item: label, message: `Duplicate canonical key ${record.key}.` });
    seen.add(record.key);
    if (record.type === 'dropper' && (!Number.isFinite(record.dropSpeed) || record.dropSpeed <= 0)) warnings.push({ code: 'DATABASE_DROP_SPEED', item: label, message: 'Dropper has no positive drop speed.' });
    if (!['dropper', 'upgrader', 'furnace', 'conveyor', 'decoration'].includes(normalize(record.type))) warnings.push({ code: 'DATABASE_TYPE', item: label, message: `Unrecognized type ${record.type}.` });
  }
  for (const conflict of database.conflicts ?? []) errors.push({ code: 'DATABASE_CONFLICT', item: conflict.item ?? conflict.key, message: 'Repeated workbook statistics disagree.' });
  for (const [effect, definition] of Object.entries(rules.effectDefinitions ?? {})) {
    if (!definition.type) errors.push({ code: 'EFFECT_SCHEMA', item: effect, message: 'Effect type is missing.' });
    if (definition.type === 'destructive' && !Number.isFinite(definition.timerSeconds)) errors.push({ code: 'EFFECT_TIMER', item: effect, message: 'Destructive effect timer is missing.' });
  }
  return { valid: errors.length === 0, errors, warnings, recordCount: database.records?.length ?? 0 };
}

