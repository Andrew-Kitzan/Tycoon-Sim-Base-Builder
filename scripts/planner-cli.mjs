import fs from 'node:fs/promises';
import path from 'node:path';
import { compilePlan } from '../engine/compiler.mjs';
import { loadDatabase, loadRules, searchItems } from '../engine/database.mjs';
import { buildLegalPool } from '../engine/profile.mjs';
import { optimizeCapgraders } from '../engine/optimizer.mjs';
import { readJson, compactNumber } from '../engine/utils.mjs';
import { validatePlan } from '../engine/validate.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [command, ...args] = process.argv.slice(2);
const database = await loadDatabase(root);
const rules = await loadRules(root);

function print(value) { console.log(JSON.stringify(value, null, process.argv.includes('--compact') ? 0 : 2)); }
function argument(index, label) {
  const value = args.filter((entry) => !entry.startsWith('--'))[index];
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

if (command === 'item') {
  const query = argument(0, 'item query');
  print(searchItems(database, query).map((item) => ({ name: item.name, variant: item.variant, type: item.type, size: item.size, mainStat: item.mainStat, range: item.range, uses: item.limitedUses, source: item.source })));
} else if (command === 'legal-pool') {
  const profile = await readJson(path.resolve(argument(0, 'profile file')));
  const pool = buildLegalPool(database, profile, rules);
  print({ legalCount: pool.legal.length, rejectedCount: pool.rejected.length, diagnostics: pool.diagnostics, legal: process.argv.includes('--full') ? pool.legal : undefined });
} else if (command === 'solve-cap') {
  const profile = await readJson(path.resolve(argument(0, 'profile file')));
  const pool = buildLegalPool(database, profile, rules);
  const dropper = pool.legal.find((item) => item.name === profile.dropper.name && item.variant === profile.dropper.variant);
  if (!dropper) throw new Error('Requested dropper is not legal.');
  const result = optimizeCapgraders({ initialValue: dropper.mainStat, legalItems: pool.legal, profile, rules });
  print({ searchedStates: result.searchedStates, finalInput: result.best.finalInput, finalCap: result.best.finalCap, ratio: result.best.finalInput / result.best.finalCap, finalValue: result.best.value, chain: result.best.chain.map((entry) => `${entry.item.variant} ${entry.item.name}`) });
} else if (command === 'build') {
  const profilePath = path.resolve(argument(0, 'profile file'));
  const profile = await readJson(profilePath);
  const plan = await compilePlan(profile, { root });
  await fs.mkdir(path.join(root, 'plans'), { recursive: true });
  await fs.writeFile(path.join(root, 'plans', 'active-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'data', 'active-plan.js'), `globalThis.TycoonActivePlan = ${JSON.stringify(plan)};\n`);
  print({ valid: plan.valid, title: plan.title, items: plan.items?.length ?? 0, conveyors: plan.conveyors?.length ?? 0, diagnostics: plan.diagnostics, capRatio: plan.optimization?.finalCapRatio, cashPerMinute: plan.metrics ? compactNumber(plan.metrics.expectedCashPerMinute) : null });
  if (!plan.valid) process.exitCode = 2;
} else if (command === 'validate-plan') {
  const plan = await readJson(path.resolve(argument(0, 'plan file')));
  print(validatePlan(plan, rules));
} else if (command === 'summary') {
  const plan = await readJson(path.resolve(args.filter((entry) => !entry.startsWith('--'))[0] ?? path.join(root, 'plans', 'active-plan.json')));
  print({
    valid: plan.valid,
    title: plan.title,
    chain: plan.items?.map((item) => ({ order: item.order, name: item.name, variant: item.variant, at: `${item.x},${item.y}`, facing: item.direction })) ?? [],
    conveyors: plan.conveyors?.map((item) => ({ type: item.conveyor, at: `${item.x},${item.y}`, facing: item.direction })) ?? [],
    capRatio: plan.optimization?.finalCapRatio,
    effectSafety: plan.optimization?.effectSafety,
    metrics: plan.metrics ? { activeOres: plan.metrics.cappedActiveOres, cashPerMinute: plan.metrics.expectedCashPerMinuteText, cashPerSecond: plan.metrics.expectedCashPerSecondText } : null,
    diagnostics: plan.diagnostics,
  });
} else if (command === 'clear') {
  await fs.rm(path.join(root, 'plans', 'active-plan.json'), { force: true });
  await fs.writeFile(path.join(root, 'data', 'active-plan.js'), 'globalThis.TycoonActivePlan = null;\n');
  print({ cleared: true });
} else {
  console.log('Commands: item <query> | legal-pool <profile.json> [--full] | solve-cap <profile.json> | build <profile.json> | validate-plan <plan.json> | summary [plan.json] | clear');
}
