import fs from 'node:fs/promises';
import path from 'node:path';
import { compilePlan, lockedCapResult } from '../engine/compiler.mjs';
import { loadDatabase, loadRules, searchItems } from '../engine/database.mjs';
import { buildLegalPool } from '../engine/profile.mjs';
import { compareOptimizationMetrics, optimizeCapgraders, optimizePostCap } from '../engine/optimizer.mjs';
import { appliedEffectsForItem, expectedCashWeight } from '../engine/models.mjs';
import { readJson, compactNumber } from '../engine/utils.mjs';
import { validatePlan } from '../engine/validate.mjs';
import { validateCoordinateMap } from '../engine/coordinate-map.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [command, ...args] = process.argv.slice(2);
const database = await loadDatabase(root);
const rules = await loadRules(root);

function print(value) { console.log(JSON.stringify(value, null, process.argv.includes('--compact') ? 0 : 2)); }
function completedStageForPlan(plan) {
  if (!plan?.valid) return 2;
  const optimizationComplete = plan.optimization?.complete === true || plan.workflow?.optimizationComplete === true;
  const finalVerificationComplete = plan.finalVerification?.complete === true || plan.workflow?.finalVerificationComplete === true;
  if (optimizationComplete && finalVerificationComplete) return 5;
  if (optimizationComplete) return 4;
  return 3;
}
async function writeWorkflowState(completedStage, details = {}) {
  let previous = {};
  try { previous = await readJson(path.join(root, 'plans', 'workflow-state.json')); } catch { /* first stage */ }
  const { replaceSummary = false, ...stateDetails } = details;
  const state = {
    ...previous,
    completedStage,
    ...stateDetails,
    summary: replaceSummary ? (details.summary ?? {}) : { ...(previous.summary ?? {}), ...(details.summary ?? {}) },
  };
  await fs.mkdir(path.join(root, 'plans'), { recursive: true });
  await fs.mkdir(path.join(root, 'data'), { recursive: true });
  await fs.writeFile(path.join(root, 'plans', 'workflow-state.json'), `${JSON.stringify(state, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'data', 'workflow-state.js'), `globalThis.TycoonWorkflowState = ${JSON.stringify(state)};\n`);
  return state;
}
async function writeCoordinatePreview(preview) {
  await fs.mkdir(path.join(root, 'data'), { recursive: true });
  await fs.writeFile(path.join(root, 'data', 'coordinate-preview.js'), `globalThis.TycoonCoordinateMapPreview = ${JSON.stringify(preview)};\n`);
}
async function writeOptimizationBaseline(baseline) {
  await fs.mkdir(path.join(root, 'data'), { recursive: true });
  await fs.writeFile(path.join(root, 'data', 'optimization-baseline.js'), `globalThis.TycoonOptimizationBaseline = ${JSON.stringify(baseline)};\n`);
}
async function writeOptimizationProgress(progress) {
  await fs.mkdir(path.join(root, 'data'), { recursive: true });
  await fs.writeFile(path.join(root, 'data', 'optimization-progress.js'), `globalThis.TycoonOptimizationProgress = ${JSON.stringify(progress)};\n`);
}
async function restoreCoordinateMapPreview() {
  const map = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
  const profile = await readJson(path.join(root, 'profiles', `${map.profile}.json`));
  const result = validateCoordinateMap({ map, database, rules, profile });
  const pool = buildLegalPool(database, profile, rules);
  await writeCoordinatePreview({
    profile,
    map,
    legalPool: {
      legalCount: pool.legal.length,
      rejectedCount: pool.rejected.length,
      categories: Object.fromEntries([...pool.legal.reduce((counts, item) => counts.set(item.type, (counts.get(item.type) ?? 0) + 1), new Map())]),
    },
    validation: {
      valid: result.valid,
      diagnostics: result.diagnostics,
      routes: result.routes.map((route) => ({ dropperOrder: route.dropperOrder, seconds: route.seconds })),
      metrics: result.metrics,
      furnaceZone: result.furnaceZone,
    },
  });
  return { map, profile, result, pool };
}
function argument(index, label) {
  const value = args.filter((entry) => !entry.startsWith('--'))[index];
  if (!value) throw new Error(`${label} is required.`);
  return value;
}
function numericOption(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} must be a positive number.`);
  return value;
}
function columnName(index) {
  let value = index;
  let output = '';
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}
function gridRange(entry) {
  const first = `${columnName(entry.x)}${entry.y}`;
  const last = `${columnName(entry.x + entry.width - 1)}${entry.y + entry.height - 1}`;
  return first === last ? first : `${first}:${last}`;
}
function coordinateMapFromPlan(plan) {
  return {
    stage: 4,
    status: 'optimization-candidate',
    accepted: false,
    plotSize: plan.profile.plotSize,
    profile: 'rebirth3-space-iron',
    items: (plan.items ?? []).map((item) => ({
      order: item.order,
      name: item.name,
      variant: item.variant,
      topLeft: `${columnName(item.x)}${item.y}`,
      bottomRight: `${columnName(item.x + item.width - 1)}${item.y + item.height - 1}`,
      facing: item.direction,
      section: item.type === 'capgrader' ? 'capgrader' : item.type === 'furnace' ? 'furnace' : 'post-cap',
    })),
    conveyorRuns: (plan.conveyors ?? []).map((conveyor) => ({ type: conveyor.conveyor, cells: gridRange(conveyor), facing: conveyor.direction, ...(conveyor.lane ? { lane: conveyor.lane } : {}) })),
  };
}

if (command === 'item') {
  const query = argument(0, 'item query');
  print(searchItems(database, query).map((item) => ({ name: item.name, variant: item.variant, type: item.type, size: item.size, mainStat: item.mainStat, range: item.range, uses: item.limitedUses, source: item.source })));
} else if (command === 'legal-pool') {
  const profile = await readJson(path.resolve(argument(0, 'profile file')));
  const pool = buildLegalPool(database, profile, rules);
  await writeWorkflowState(1, {
    status: 'legal-items-complete',
    validationPending: true,
    rendered: false,
    summary: { plotSize: profile.plotSize, legalItemCount: pool.legal.length, rejectedItemCount: pool.rejected.length },
  });
  await writeCoordinatePreview({
    profile,
    legalPool: {
      legalCount: pool.legal.length,
      rejectedCount: pool.rejected.length,
      categories: Object.fromEntries([...pool.legal.reduce((counts, item) => counts.set(item.type, (counts.get(item.type) ?? 0) + 1), new Map())]),
    },
  });
  print({ legalCount: pool.legal.length, rejectedCount: pool.rejected.length, diagnostics: pool.diagnostics, legal: process.argv.includes('--full') ? pool.legal : undefined });
} else if (command === 'solve-cap') {
  const profile = await readJson(path.resolve(argument(0, 'profile file')));
  const pool = buildLegalPool(database, profile, rules);
  const dropper = pool.legal.find((item) => item.name === profile.dropper.name && item.variant === profile.dropper.variant);
  if (!dropper) throw new Error('Requested dropper is not legal.');
  const result = optimizeCapgraders({ initialValue: dropper.mainStat, initialEffects: appliedEffectsForItem(dropper, rules), legalItems: pool.legal, profile, rules });
  print({ searchedStates: result.searchedStates, finalInput: result.best.finalInput, finalCap: result.best.finalCap, ratio: result.best.finalInput / result.best.finalCap, finalValue: result.best.value, chain: result.best.chain.map((entry) => `${entry.item.variant} ${entry.item.name}`) });
} else if (command === 'analyze-post') {
  const profile = await readJson(path.resolve(argument(0, 'profile file')));
  const map = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
  const pool = buildLegalPool(database, profile, rules);
  const dropper = pool.legal.find((item) => item.name === profile.dropper.name && item.variant === profile.dropper.variant);
  const lockedChain = [...(map.items ?? [])].filter((item) => item.section === 'capgrader').sort((a, b) => a.order - b.order);
  const cap = lockedCapResult(dropper.mainStat, dropper.oreSize ?? 1, lockedChain, pool.legal, profile, rules, appliedEffectsForItem(dropper, rules));
  const post = optimizePostCap({ initialState: cap.best, legalItems: pool.legal, profile, rules, maxSteps: numericOption('post-steps', 20), beamWidth: numericOption('beam-width', 750), areaBudget: numericOption('area-budget', 180) });
  print({ searchedStates: post.searchedStates, alternatives: post.alternatives.slice(0, numericOption('limit', 30)).map((state) => ({ weight: expectedCashWeight(state), area: state.area, seconds: state.timeSeconds, chain: state.chain.slice(cap.best.chain.length).map((entry) => `${entry.item.variant} ${entry.item.name}`) })) });
} else if (command === 'build') {
  const profilePath = path.resolve(argument(0, 'profile file'));
  let profile = await readJson(profilePath);
  const forbiddenCandidates = args.flatMap((entry, index) => entry === '--forbid-item' ? [args[index + 1]] : []).filter(Boolean);
  if (forbiddenCandidates.length) profile = { ...profile, forbiddenItems: [...new Set([...(profile.forbiddenItems ?? []), ...forbiddenCandidates])] };
  const requiredCandidates = args.flatMap((entry, index) => entry === '--require-item' ? [args[index + 1]] : []).filter(Boolean);
  if (requiredCandidates.length) profile = { ...profile, requiredItems: [...new Set([...(profile.requiredItems ?? []), ...requiredCandidates])] };
  if (args.includes('--dropper-quantity')) profile = { ...profile, dropper: { ...profile.dropper, quantity: numericOption('dropper-quantity', 1) } };
  let lockedCapChain = null;
  if (args.includes('--lock-map-cap')) {
    const map = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
    lockedCapChain = [...(map.items ?? [])]
      .filter((item) => item.section === 'capgrader')
      .sort((left, right) => left.order - right.order)
      .map((item) => ({ name: item.name, variant: item.variant }));
  }
  const plan = await compilePlan(profile, {
    root,
    postSteps: numericOption('post-steps', 28),
    beamWidth: numericOption('beam-width', 2000),
    simulationSeconds: numericOption('simulation-seconds', 300),
    lockedCapChain,
  });
  if (args.includes('--candidate')) {
    const baseline = await readJson(path.join(root, 'plans', 'optimization-baseline.json'));
    const strictValidation = plan.valid
      ? validateCoordinateMap({ map: coordinateMapFromPlan(plan), database, rules, profile })
      : { valid: false, diagnostics: plan.diagnostics ?? [], metrics: {} };
    const reservedTiles = (plan.items ?? []).reduce((sum, item) => sum + item.width * item.height, 0)
      + (plan.conveyors ?? []).reduce((sum, conveyor) => sum + conveyor.width * conveyor.height, 0);
    const candidateMetrics = {
      expectedCashPerMinute: strictValidation.metrics?.expectedCashPerMinute ?? 0,
      remainingTiles: Math.max(0, profile.plotSize ** 2 - reservedTiles),
      routeTimeSeconds: strictValidation.metrics?.routeTimeSeconds ?? Infinity,
    };
    let previous = { testedCandidates: [] };
    try { previous = await readJson(path.join(root, 'plans', 'optimization-progress.json')); } catch { /* first candidate */ }
    let incumbentMetrics = previous.bestMetrics ?? baseline.metrics;
    try {
      const incumbentPlan = await readJson(path.join(root, 'plans', 'optimization-winner.json'));
      const incumbentValidation = validateCoordinateMap({ map: coordinateMapFromPlan(incumbentPlan), database, rules, profile });
      if (!incumbentValidation.valid) incumbentMetrics = baseline.metrics;
    } catch { incumbentMetrics = baseline.metrics; }
    const candidateValid = plan.valid && strictValidation.valid;
    const comparison = candidateValid ? compareOptimizationMetrics(candidateMetrics, incumbentMetrics, rules) : -1;
    let winnerCheckpointExists = true;
    try { await fs.access(path.join(root, 'plans', 'optimization-winner.json')); } catch { winnerCheckpointExists = false; }
    const accepted = comparison > 0 || (comparison === 0 && candidateValid && !winnerCheckpointExists);
    const hasAcceptedCandidate = (previous.testedCandidates ?? []).some((candidate) => candidate.accepted);
    const progress = {
      stage: 4,
      status: 'optimization-in-progress',
      objective: baseline.objective,
      tieBreakers: baseline.tieBreakers,
      baseline: baseline.metrics,
      testedCandidates: [...(previous.testedCandidates ?? []), {
        testedAt: new Date().toISOString(),
        valid: candidateValid,
        accepted,
        metrics: candidateMetrics,
        itemCount: plan.items?.length ?? 0,
        conveyorCount: plan.conveyors?.length ?? 0,
        items: (plan.items ?? []).map((item) => ({ name: item.name, variant: item.variant, type: item.type })),
        diagnosticCodes: strictValidation.diagnostics.map((entry) => entry.code),
      }],
      bestMetrics: accepted ? candidateMetrics : incumbentMetrics,
      optimizationComplete: false,
    };
    await fs.writeFile(path.join(root, 'plans', 'optimization-progress.json'), `${JSON.stringify(progress, null, 2)}\n`);
    await writeOptimizationProgress(progress);
    if (accepted) {
      await fs.writeFile(path.join(root, 'plans', 'active-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
      await fs.writeFile(path.join(root, 'plans', 'optimization-winner.json'), `${JSON.stringify(plan, null, 2)}\n`);
      await fs.writeFile(path.join(root, 'data', 'active-plan.js'), `globalThis.TycoonActivePlan = ${JSON.stringify(plan)};\n`);
    } else if (!hasAcceptedCandidate) {
      await fs.rm(path.join(root, 'plans', 'active-plan.json'), { force: true });
      await fs.writeFile(path.join(root, 'data', 'active-plan.js'), 'globalThis.TycoonActivePlan = null;\n');
      await restoreCoordinateMapPreview();
    }
    await writeWorkflowState(3, {
      status: 'optimization-in-progress',
      validationPending: false,
      rendered: false,
      summary: { ...(baseline.candidate ?? {}), testedCandidateCount: progress.testedCandidates.length },
    });
    print({ valid: candidateValid, accepted, incumbent: incumbentMetrics, candidate: candidateMetrics, diagnosticCodes: strictValidation.diagnostics.map((entry) => entry.code), testedCandidates: progress.testedCandidates.length });
    if (!candidateValid) process.exitCode = 2;
  } else {
  await fs.mkdir(path.join(root, 'plans'), { recursive: true });
  await fs.writeFile(path.join(root, 'plans', 'active-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'data', 'active-plan.js'), `globalThis.TycoonActivePlan = ${JSON.stringify(plan)};\n`);
  await writeCoordinatePreview(null);
  const completedStage = completedStageForPlan(plan);
  await writeWorkflowState(completedStage, {
    status: !plan.valid ? 'mapping-complete-validation-blocked'
      : completedStage === 5 ? 'final-verification-complete'
        : completedStage === 4 ? 'optimization-complete-final-verification-pending'
          : 'route-validation-complete-optimization-pending',
    validationPending: !plan.valid,
    rendered: plan.valid,
    summary: { plotSize: profile.plotSize, itemCount: plan.items?.length ?? 0, conveyorRunCount: plan.conveyors?.length ?? 0 },
  });
  print({ valid: plan.valid, title: plan.title, items: plan.items?.length ?? 0, conveyors: plan.conveyors?.length ?? 0, diagnostics: plan.diagnostics, capRatio: plan.optimization?.finalCapRatio, cashPerMinute: plan.metrics ? compactNumber(plan.metrics.expectedCashPerMinute) : null });
  if (!plan.valid) process.exitCode = 2;
  }
} else if (command === 'optimize-current') {
  const map = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
  const baseProfile = await readJson(path.resolve(args.filter((entry) => !entry.startsWith('--'))[0] ?? path.join(root, 'profiles', `${map.profile}.json`)));
  const lockedCapChain = [...(map.items ?? [])].filter((item) => item.section === 'capgrader').sort((a, b) => a.order - b.order).map((item) => ({ name: item.name, variant: item.variant }));
  const baseline = await readJson(path.join(root, 'plans', 'optimization-baseline.json'));
  let progress = { stage: 4, status: 'optimization-in-progress', objective: baseline.objective, tieBreakers: baseline.tieBreakers, baseline: baseline.metrics, testedCandidates: [], bestMetrics: baseline.metrics, optimizationComplete: false };
  try { progress = { ...progress, ...(await readJson(path.join(root, 'plans', 'optimization-progress.json'))) }; } catch { /* first batch */ }
  let incumbentMetrics = progress.bestMetrics ?? baseline.metrics;
  let incumbentPlan = null;
  try {
    incumbentPlan = await readJson(path.join(root, 'plans', 'optimization-winner.json'));
    const incumbentCheck = validateCoordinateMap({ map: coordinateMapFromPlan(incumbentPlan), database, rules, profile: incumbentPlan.profile ?? baseProfile });
    if (!incumbentCheck.valid) { incumbentPlan = null; incumbentMetrics = { expectedCashPerMinute: 0, remainingTiles: 0, routeTimeSeconds: Infinity }; }
  } catch { incumbentPlan = null; incumbentMetrics = { expectedCashPerMinute: 0, remainingTiles: 0, routeTimeSeconds: Infinity }; }
  const configurations = [
    ...Array.from({ length: 6 }, (_, index) => ({ key: `v${rules.version}-standard-q${index + 1}`, quantity: index + 1, postSteps: 28, beamWidth: 2000, simulationSeconds: 300 })),
    ...Array.from({ length: 5 }, (_, index) => ({ key: `v${rules.version}-deep-q${index + 1}`, quantity: index + 1, postSteps: 45, beamWidth: 10000, simulationSeconds: 900 })),
  ];
  const completedKeys = new Set((progress.testedCandidates ?? []).map((candidate) => candidate.configKey).filter(Boolean));
  let testedThisRun = 0;
  let skipped = 0;
  for (const config of configurations) {
    if (completedKeys.has(config.key)) { skipped += 1; continue; }
    const profile = { ...baseProfile, dropper: { ...baseProfile.dropper, quantity: config.quantity } };
    const plan = await compilePlan(profile, { root, lockedCapChain, postSteps: config.postSteps, beamWidth: config.beamWidth, simulationSeconds: config.simulationSeconds });
    const strict = plan.valid ? validateCoordinateMap({ map: coordinateMapFromPlan(plan), database, rules, profile }) : { valid: false, diagnostics: plan.diagnostics ?? [], metrics: {} };
    const reservedTiles = (plan.items ?? []).reduce((sum, item) => sum + item.width * item.height, 0) + (plan.conveyors ?? []).reduce((sum, conveyor) => sum + conveyor.width * conveyor.height, 0);
    const metrics = { expectedCashPerMinute: strict.metrics?.expectedCashPerMinute ?? 0, remainingTiles: Math.max(0, profile.plotSize ** 2 - reservedTiles), routeTimeSeconds: strict.metrics?.routeTimeSeconds ?? Infinity };
    const accepted = strict.valid && compareOptimizationMetrics(metrics, incumbentMetrics, rules) > 0;
    progress.testedCandidates.push({ configKey: config.key, valid: strict.valid, accepted, metrics, diagnosticCodes: strict.diagnostics.map((entry) => entry.code) });
    if (accepted) { incumbentMetrics = metrics; incumbentPlan = plan; }
    progress.bestMetrics = incumbentMetrics;
    await fs.writeFile(path.join(root, 'plans', 'optimization-progress.json'), `${JSON.stringify(progress, null, 2)}\n`);
    await writeOptimizationProgress(progress);
    if (accepted) await fs.writeFile(path.join(root, 'plans', 'optimization-winner.json'), `${JSON.stringify(plan, null, 2)}\n`);
    testedThisRun += 1;
  }
  if (!incumbentPlan) throw new Error('Batch optimization did not produce a strictly validated winner.');
  await fs.writeFile(path.join(root, 'plans', 'active-plan.json'), `${JSON.stringify(incumbentPlan, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'data', 'active-plan.js'), `globalThis.TycoonActivePlan = ${JSON.stringify(incumbentPlan)};\n`);
  await writeWorkflowState(3, { status: 'optimization-in-progress', validationPending: false, rendered: true, summary: { plotSize: baseProfile.plotSize, testedCandidateCount: progress.testedCandidates.length } });
  print({ complete: true, testedThisRun, skipped, totalCandidates: progress.testedCandidates.length, best: incumbentMetrics });
} else if (command === 'validate-plan') {
  const plan = await readJson(path.resolve(argument(0, 'plan file')));
  const result = validatePlan(plan, rules);
  await writeWorkflowState(result.valid ? 3 : 2, {
    status: result.valid ? 'route-validation-complete' : 'route-validation-failed',
    validationPending: !result.valid,
    rendered: false,
    summary: { plotSize: plan.profile?.plotSize, itemCount: plan.items?.length ?? 0, conveyorRunCount: plan.conveyors?.length ?? 0 },
  });
  print(result);
} else if (command === 'validate-map') {
  const mapPath = path.resolve(args.filter((entry) => !entry.startsWith('--'))[0] ?? path.join(root, 'plans', 'coordinate-map.json'));
  const map = await readJson(mapPath);
  const profilePath = path.resolve(args.filter((entry) => !entry.startsWith('--'))[1] ?? path.join(root, 'profiles', `${map.profile}.json`));
  const profile = await readJson(profilePath);
  const result = validateCoordinateMap({ map, database, rules, profile });
  const validatedPool = buildLegalPool(database, profile, rules);
  const artifact = {
    stage: 3,
    status: result.valid ? 'route-validation-complete' : 'route-validation-failed',
    valid: result.valid,
    map: path.relative(root, mapPath),
    profile: path.relative(root, profilePath),
    diagnostics: result.diagnostics,
    routes: result.routes,
    metrics: result.metrics,
    furnaceZone: result.furnaceZone,
    portableUsesPerOre: result.portableUsesPerOre,
  };
  await fs.writeFile(path.join(root, 'plans', 'route-validation.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  if (result.valid) {
    const policy = rules.optimizationPolicy ?? {};
    const baseline = {
      stage: 4,
      status: 'baseline-ready',
      sourceMap: path.relative(root, mapPath),
      profile: path.relative(root, profilePath),
      validated: true,
      objective: policy.primaryObjective ?? 'expectedCashPerMinute',
      tieBreakers: policy.tieBreakers ?? ['remainingTiles', 'routeTimeSeconds'],
      metrics: result.metrics,
      candidate: {
        itemCount: map.items?.length ?? 0,
        conveyorRunCount: map.conveyorRuns?.length ?? 0,
        routeCount: result.routes.length,
      },
      optimizationComplete: false,
      finalVerificationComplete: false,
    };
    await fs.writeFile(path.join(root, 'plans', 'optimization-baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`);
    await writeOptimizationBaseline(baseline);
  } else {
    await fs.rm(path.join(root, 'plans', 'optimization-baseline.json'), { force: true });
    await writeOptimizationBaseline(null);
  }
  await writeWorkflowState(result.valid ? 3 : 2, {
    status: artifact.status,
    validationPending: !result.valid,
    rendered: false,
    summary: {
      plotSize: map.plotSize,
      itemCount: map.items?.length ?? 0,
      conveyorRunCount: map.conveyorRuns?.length ?? 0,
      routeCount: result.routes.length,
      diagnosticCount: result.diagnostics.length,
      legalItemCount: validatedPool.legal.length,
      rejectedItemCount: validatedPool.rejected.length,
    },
  });
  await writeCoordinatePreview({
    profile,
    map,
    legalPool: {
      legalCount: validatedPool.legal.length,
      rejectedCount: validatedPool.rejected.length,
      categories: Object.fromEntries([...validatedPool.legal.reduce((counts, item) => counts.set(item.type, (counts.get(item.type) ?? 0) + 1), new Map())]),
    },
    validation: {
      valid: result.valid,
      diagnostics: result.diagnostics,
      routes: result.routes.map((route) => ({ dropperOrder: route.dropperOrder, seconds: route.seconds })),
      metrics: result.metrics,
      furnaceZone: result.furnaceZone,
    },
  });
  print(artifact);
  if (!result.valid) process.exitCode = 2;
} else if (command === 'restore-preview') {
  const restored = await restoreCoordinateMapPreview();
  let testedCandidateCount = 0;
  try { testedCandidateCount = (await readJson(path.join(root, 'plans', 'optimization-progress.json'))).testedCandidates?.length ?? 0; } catch { /* optimization may not have started */ }
  await writeWorkflowState(3, {
    status: testedCandidateCount ? 'optimization-in-progress' : 'route-validation-complete',
    validationPending: false,
    rendered: false,
    summary: {
      plotSize: restored.map.plotSize,
      itemCount: restored.map.items?.length ?? 0,
      conveyorRunCount: restored.map.conveyorRuns?.length ?? 0,
      routeCount: restored.result.routes.length,
      diagnosticCount: restored.result.diagnostics.length,
      legalItemCount: restored.pool.legal.length,
      rejectedItemCount: restored.pool.rejected.length,
      testedCandidateCount,
    },
  });
  print({ restored: true, valid: restored.result.valid, testedCandidateCount });
} else if (command === 'validate-winner') {
  const winner = await readJson(path.join(root, 'plans', 'optimization-winner.json'));
  const currentMap = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
  const profile = await readJson(path.join(root, 'profiles', `${currentMap.profile}.json`));
  const map = { ...coordinateMapFromPlan({ ...winner, profile }), profile: currentMap.profile };
  const result = validateCoordinateMap({ map, database, rules, profile });
  const artifact = { valid: result.valid, diagnostics: result.diagnostics, routes: result.routes, metrics: result.metrics, map };
  await fs.writeFile(path.join(root, 'plans', 'winner-validation.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  print({ valid: result.valid, diagnosticCodes: result.diagnostics.map((entry) => entry.code), routes: result.routes.length, metrics: result.metrics });
  if (!result.valid) process.exitCode = 2;
} else if (command === 'finalize-winner') {
  const winner = await readJson(path.join(root, 'plans', 'optimization-winner.json'));
  const currentMap = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
  const profile = await readJson(path.join(root, 'profiles', `${currentMap.profile}.json`));
  const map = { ...coordinateMapFromPlan({ ...winner, profile }), profile: currentMap.profile, stage: 5, status: 'final-verification-complete', accepted: true, validationPending: false, rendered: true };
  const result = validateCoordinateMap({ map, database, rules, profile });
  if (!result.valid) throw new Error(`Winner failed final validation: ${result.diagnostics.map((entry) => entry.code).join(', ')}`);
  const finalized = {
    ...winner,
    profile: { ...profile, dropper: { ...profile.dropper, quantity: map.items.filter((item) => item.name === profile.dropper.name).length } },
    optimization: { ...(winner.optimization ?? {}), complete: true, strictMetrics: result.metrics },
    finalVerification: { complete: true, diagnosticCount: 0, routeCount: result.routes.length, verifiedAt: new Date().toISOString() },
    metrics: {
      ...(winner.metrics ?? {}),
      projectedActiveOres: result.metrics.projectedActiveOres,
      cappedActiveOres: result.metrics.cappedActiveOres,
      furnaceEntriesPerMinute: result.metrics.furnaceEntriesPerMinute,
      expectedCashPerMinute: result.metrics.expectedCashPerMinute,
      expectedCashPerSecond: result.metrics.expectedCashPerMinute / 60,
      expectedCashPerMinuteText: `${compactNumber(result.metrics.expectedCashPerMinute)}/min`,
      expectedCashPerSecondText: `${compactNumber(result.metrics.expectedCashPerMinute / 60)}/sec`,
    },
  };
  const baseline = await readJson(path.join(root, 'plans', 'optimization-baseline.json'));
  const completedBaseline = { ...baseline, status: 'optimization-complete', bestMetrics: result.metrics, optimizationComplete: true, finalVerificationComplete: true };
  const progress = await readJson(path.join(root, 'plans', 'optimization-progress.json'));
  const completedProgress = { ...progress, status: 'optimization-complete', bestMetrics: result.metrics, optimizationComplete: true, finalVerificationComplete: true };
  await fs.writeFile(path.join(root, 'plans', 'coordinate-map.json'), `${JSON.stringify(map, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'plans', 'active-plan.json'), `${JSON.stringify(finalized, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'plans', 'optimization-winner.json'), `${JSON.stringify(finalized, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'plans', 'optimization-baseline.json'), `${JSON.stringify(completedBaseline, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'plans', 'optimization-progress.json'), `${JSON.stringify(completedProgress, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'data', 'active-plan.js'), `globalThis.TycoonActivePlan = ${JSON.stringify(finalized)};\n`);
  await writeOptimizationBaseline(completedBaseline);
  await writeOptimizationProgress(completedProgress);
  await writeWorkflowState(5, {
    status: 'final-verification-complete', validationPending: false, rendered: true,
    summary: { plotSize: map.plotSize, itemCount: map.items.length, conveyorRunCount: map.conveyorRuns.length, routeCount: result.routes.length, diagnosticCount: 0, testedCandidateCount: completedProgress.testedCandidates.length },
  });
  const stateDocument = `# Tycoon Sim 2 Planner State\n\n- Workflow: complete through Step 5\n- Profile: Rebirth 3, 20x20, Base Iron Dropper, through Space crate, F2P, no Merchant/Secret/Achievement items\n- Winning droppers: ${finalized.profile.dropper.quantity}\n- Expected cash: ${compactNumber(result.metrics.expectedCashPerMinute)}/min\n- Expected furnace throughput: ${result.metrics.furnaceEntriesPerMinute.toFixed(2)} ores/min\n- Projected active ore: ${result.metrics.projectedActiveOres.toFixed(2)}/100\n- Longest route: ${result.metrics.routeTimeSeconds.toFixed(3)}s\n- Remaining tiles: ${result.metrics.remainingTiles}\n- Final cap ratio: ${((finalized.optimization.finalCapRatio ?? 0) * 100).toFixed(3)}%\n- Final validation: ${result.routes.length} routes, 0 diagnostics\n- Candidate checkpoint: plans/optimization-progress.json\n- Winning plan: plans/optimization-winner.json\n- Final coordinate map: plans/coordinate-map.json\n\nFuture tasks should read this file, docs/BUILD_RULES.md, and rules/engine-rules.json instead of replaying chat history.\n`;
  await fs.writeFile(path.join(root, 'PROJECT_STATE.md'), stateDocument);
  print({ complete: true, cashPerMinute: compactNumber(result.metrics.expectedCashPerMinute), droppers: finalized.profile.dropper.quantity, activeOres: result.metrics.cappedActiveOres, routeSeconds: result.metrics.routeTimeSeconds, remainingTiles: result.metrics.remainingTiles, routes: result.routes.length, diagnostics: 0 });
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
  let activeProfileName = null;
  try {
    const activeMap = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
    if (/^[a-z0-9_-]+$/i.test(activeMap.profile ?? '')) activeProfileName = activeMap.profile;
  } catch {
    // There may be no coordinate map when clearing an already-empty board.
  }
  await fs.rm(path.join(root, 'plans', 'active-plan.json'), { force: true });
  await fs.rm(path.join(root, 'plans', 'coordinate-map.json'), { force: true });
  await fs.rm(path.join(root, 'plans', 'route-validation.json'), { force: true });
  await fs.rm(path.join(root, 'plans', 'optimization-baseline.json'), { force: true });
  await fs.rm(path.join(root, 'plans', 'optimization-progress.json'), { force: true });
  await fs.rm(path.join(root, 'plans', 'optimization-winner.json'), { force: true });
  await fs.rm(path.join(root, 'plans', 'winner-validation.json'), { force: true });
  await fs.rm(path.join(root, 'PROJECT_STATE.md'), { force: true });
  if (activeProfileName && activeProfileName !== 'example') {
    await fs.rm(path.join(root, 'profiles', `${activeProfileName}.json`), { force: true });
  }
  await fs.writeFile(path.join(root, 'data', 'active-plan.js'), 'globalThis.TycoonActivePlan = null;\n');
  await writeCoordinatePreview(null);
  await writeOptimizationBaseline(null);
  await writeOptimizationProgress(null);
  await writeWorkflowState(0, { status: 'not-started', validationPending: false, rendered: false, summary: {}, replaceSummary: true });
  print({ cleared: true, removedActiveProfile: activeProfileName && activeProfileName !== 'example' ? activeProfileName : null });
} else if (command === 'workflow-stage') {
  const completedStage = Number(argument(0, 'completed stage'));
  if (!Number.isInteger(completedStage) || completedStage < 0 || completedStage > 5) {
    throw new Error('completed stage must be an integer from 0 through 5.');
  }
  if (completedStage >= 4) {
    let baseline;
    try { baseline = await readJson(path.join(root, 'plans', 'optimization-baseline.json')); }
    catch { throw new Error('Step 4 cannot complete without a validated optimization baseline.'); }
    if (baseline.optimizationComplete !== true) throw new Error('Step 4 cannot complete until optimizationComplete is explicitly true.');
    if (completedStage >= 5 && baseline.finalVerificationComplete !== true) {
      throw new Error('Step 5 cannot complete until finalVerificationComplete is explicitly true.');
    }
  }
  let summary = {};
  if (completedStage >= 2) {
    try {
      const map = await readJson(path.join(root, 'plans', 'coordinate-map.json'));
      summary = { plotSize: map.plotSize, itemCount: map.items?.length ?? 0, conveyorRunCount: map.conveyorRuns?.length ?? 0 };
      let profile = null;
      try { profile = await readJson(path.join(root, 'profiles', `${map.profile}.json`)); } catch { /* optional preview metadata */ }
      await writeCoordinatePreview({ profile, map, validation: null });
    } catch {
      // A stage can still be recorded before a coordinate-map artifact exists.
    }
  }
  const state = await writeWorkflowState(completedStage, {
    status: args.filter((entry) => !entry.startsWith('--'))[1] ?? 'updated',
    validationPending: completedStage >= 2 && completedStage < 3,
    rendered: completedStage >= 4,
    summary,
  });
  print(state);
} else {
  console.log('Commands: item <query> | legal-pool <profile.json> [--full] | solve-cap <profile.json> | analyze-post <profile.json> | build <profile.json> | optimize-current [profile.json] | validate-plan <plan.json> | validate-map [map.json] [profile.json] | validate-winner | finalize-winner | restore-preview | summary [plan.json] | workflow-stage <0-5> [status] | clear');
}
