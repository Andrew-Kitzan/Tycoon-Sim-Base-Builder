import fs from 'node:fs/promises';
import path from 'node:path';
import { compilePlan } from '../engine/compiler.mjs';
import { plannerCacheKey, readPlannerCache, writePlannerCache } from '../engine/cache.mjs';
import { coordinateMapFromPlan, validateCoordinateMap } from '../engine/coordinate-map.mjs';
import { loadDatabase, loadRules } from '../engine/database.mjs';
import { lintDatabase } from '../engine/database-lint.mjs';
import { compareOptimizationMetrics } from '../engine/optimizer.mjs';
import { validateProfile } from '../engine/profile.mjs';
import { compactNumber, readJson } from '../engine/utils.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const compact = args.includes('--compact');
const quick = args.includes('--quick');
const positional = args.filter((entry) => !entry.startsWith('--'));
if (!positional[0]) throw new Error('Usage: npm.cmd run plan:full -- <profile.json> [--quick] [--compact]');
const sourceProfilePath = path.resolve(positional[0]);
const profile = await readJson(sourceProfilePath);
const [database, rules] = await Promise.all([loadDatabase(root), loadRules(root)]);

const profileDiagnostics = validateProfile(profile, rules);
if (profileDiagnostics.length) throw new Error(`Player profile is incomplete: ${profileDiagnostics.map((entry) => entry.message).join(' ')}`);
const databaseLint = lintDatabase(database, rules);
await fs.writeFile(path.join(root, 'data', 'database-lint.json'), `${JSON.stringify(databaseLint, null, 2)}\n`);
if (!databaseLint.valid) throw new Error(`Database lint failed: ${databaseLint.errors.map((entry) => `${entry.code}: ${entry.item}`).join(', ')}`);

const options = { mode: quick ? 'quick' : 'full', plannerVersion: 1 };
const cacheKey = await plannerCacheKey(root, profile, options);
let cacheHit = false;
let result = await readPlannerCache(root, cacheKey);
if (result) {
  const cachedValidation = validateCoordinateMap({ map: result.map, database, rules, profile });
  if (cachedValidation.valid) {
    result.validation = cachedValidation;
    cacheHit = true;
  } else result = null;
}

if (!result) {
  const quantities = profile.dropper.quantity != null ? [profile.dropper.quantity] : [1, 2, 3, 4, 5, 6];
  const configurations = quantities.flatMap((quantity) => [
    { key: `${quick ? 'quick' : 'standard'}-q${quantity}`, quantity, capSteps: quick ? 14 : 18, capAlternativeLimit: quick ? 32 : 96, postSteps: quick ? 14 : 28, beamWidth: quick ? 300 : 2000, simulationSeconds: quick ? 60 : 300, uncertaintyRuns: quick ? 3 : 7 },
    ...(quick ? [] : [{ key: `deep-q${quantity}`, quantity, postSteps: 45, beamWidth: 10000, simulationSeconds: 900 }]),
  ]);
  let winner = null;
  let winnerMetrics = null;
  const testedCandidates = [];
  for (const config of configurations) {
    const candidateProfile = { ...profile, dropper: { ...profile.dropper, quantity: config.quantity } };
    const plan = await compilePlan(candidateProfile, { root, capSteps: config.capSteps, capAlternativeLimit: config.capAlternativeLimit, postSteps: config.postSteps, beamWidth: config.beamWidth, simulationSeconds: config.simulationSeconds, uncertaintyRuns: config.uncertaintyRuns ?? 7 });
    const map = coordinateMapFromPlan(plan);
    const validation = plan.valid
      ? validateCoordinateMap({ map, database, rules, profile: candidateProfile })
      : { valid: false, diagnostics: plan.diagnostics ?? [], metrics: {} };
    const metrics = validation.metrics ?? {};
    const accepted = validation.valid && (!winner || compareOptimizationMetrics(metrics, winnerMetrics, rules) > 0);
    testedCandidates.push({
      configKey: config.key,
      valid: validation.valid,
      accepted,
      metrics,
      diagnosticCodes: validation.diagnostics.map((entry) => entry.code),
      rejectionReasons: validation.valid ? [] : validation.diagnostics.map((entry) => entry.message),
    });
    if (accepted) { winner = plan; winnerMetrics = metrics; }
  }
  if (!winner) {
    const reasons = [...new Set(testedCandidates.flatMap((candidate) => candidate.rejectionReasons))].slice(0, 12);
    throw new Error(`No strictly valid plan was found. ${reasons.join(' ')}`);
  }
  const finalProfile = winner.profile;
  const map = { ...coordinateMapFromPlan(winner), stage: 5, status: 'final-verification-complete', accepted: true, validationPending: false, rendered: true };
  const validation = validateCoordinateMap({ map, database, rules, profile: finalProfile });
  if (!validation.valid) throw new Error(`Winning plan failed final verification: ${validation.diagnostics.map((entry) => entry.code).join(', ')}`);
  result = { winner, map, validation, testedCandidates };
  await writePlannerCache(root, cacheKey, result);
}

const profileName = 'current-build';
const finalMap = { ...result.map, profile: profileName };
const finalProfile = { ...profile, dropper: { ...profile.dropper, quantity: finalMap.items.filter((item) => item.name === profile.dropper.name).length } };
const strict = validateCoordinateMap({ map: finalMap, database, rules, profile: finalProfile });
if (!strict.valid) throw new Error(`Final map failed verification: ${strict.diagnostics.map((entry) => entry.code).join(', ')}`);
const finalized = {
  ...result.winner,
  profile: finalProfile,
  optimization: { ...(result.winner.optimization ?? {}), complete: true, cacheKey, strictMetrics: strict.metrics },
  finalVerification: { complete: true, diagnosticCount: 0, routeCount: strict.routes.length, verifiedAt: new Date().toISOString() },
  metrics: {
    ...(result.winner.metrics ?? {}),
    projectedActiveOres: strict.metrics.projectedActiveOres,
    cappedActiveOres: strict.metrics.cappedActiveOres,
    furnaceEntriesPerMinute: strict.metrics.furnaceEntriesPerMinute,
    expectedCashPerMinute: strict.metrics.expectedCashPerMinute,
    expectedCashPerSecond: strict.metrics.expectedCashPerMinute / 60,
    expectedCashPerMinuteText: `${compactNumber(strict.metrics.expectedCashPerMinute)}/min`,
    expectedCashPerSecondText: `${compactNumber(strict.metrics.expectedCashPerMinute / 60)}/sec`,
  },
};
const progress = {
  stage: 5,
  status: 'optimization-complete',
  cacheKey,
  cacheHit,
  testedCandidates: result.testedCandidates,
  bestMetrics: strict.metrics,
  optimizationComplete: true,
  finalVerificationComplete: true,
};
const baseline = { stage: 4, status: 'optimization-complete', validated: true, objective: rules.optimizationPolicy.primaryObjective, tieBreakers: rules.optimizationPolicy.tieBreakers, bestMetrics: strict.metrics, optimizationComplete: true, finalVerificationComplete: true };
const workflow = { completedStage: 5, status: 'final-verification-complete', validationPending: false, rendered: true, summary: { plotSize: finalProfile.plotSize, itemCount: finalMap.items.length, conveyorRunCount: finalMap.conveyorRuns.length, routeCount: strict.routes.length, diagnosticCount: 0, testedCandidateCount: result.testedCandidates.length, cacheHit } };

await fs.mkdir(path.join(root, 'plans'), { recursive: true });
await fs.mkdir(path.join(root, 'profiles'), { recursive: true });
await fs.writeFile(path.join(root, 'profiles', `${profileName}.json`), `${JSON.stringify(finalProfile, null, 2)}\n`);
await fs.writeFile(path.join(root, 'plans', 'coordinate-map.json'), `${JSON.stringify(finalMap, null, 2)}\n`);
await fs.writeFile(path.join(root, 'plans', 'active-plan.json'), `${JSON.stringify(finalized, null, 2)}\n`);
await fs.writeFile(path.join(root, 'plans', 'optimization-winner.json'), `${JSON.stringify(finalized, null, 2)}\n`);
await fs.writeFile(path.join(root, 'plans', 'winner-validation.json'), `${JSON.stringify({ valid: true, diagnostics: [], routes: strict.routes, metrics: strict.metrics, map: finalMap }, null, 2)}\n`);
await fs.writeFile(path.join(root, 'plans', 'optimization-progress.json'), `${JSON.stringify(progress, null, 2)}\n`);
await fs.writeFile(path.join(root, 'plans', 'optimization-baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`);
await fs.writeFile(path.join(root, 'plans', 'workflow-state.json'), `${JSON.stringify(workflow, null, 2)}\n`);
await fs.writeFile(path.join(root, 'data', 'active-plan.js'), `globalThis.TycoonActivePlan = ${JSON.stringify(finalized)};\n`);
await fs.writeFile(path.join(root, 'data', 'coordinate-preview.js'), 'globalThis.TycoonCoordinateMapPreview = null;\n');
await fs.writeFile(path.join(root, 'data', 'optimization-progress.js'), `globalThis.TycoonOptimizationProgress = ${JSON.stringify(progress)};\n`);
await fs.writeFile(path.join(root, 'data', 'optimization-baseline.js'), `globalThis.TycoonOptimizationBaseline = ${JSON.stringify(baseline)};\n`);
await fs.writeFile(path.join(root, 'data', 'workflow-state.js'), `globalThis.TycoonWorkflowState = ${JSON.stringify(workflow)};\n`);
await fs.writeFile(path.join(root, 'PROJECT_STATE.md'), `# Tycoon Sim 2 Planner State\n\n- Workflow: complete through Step 5\n- Profile: ${path.basename(sourceProfilePath)}\n- Cache key: ${cacheKey}\n- Cache reused: ${cacheHit ? 'yes' : 'no'}\n- Expected cash: ${compactNumber(strict.metrics.expectedCashPerMinute)}/min\n- Projected active ore: ${strict.metrics.projectedActiveOres.toFixed(2)}/100\n- Longest route: ${strict.metrics.routeTimeSeconds.toFixed(3)}s\n- Remaining tiles: ${strict.metrics.remainingTiles}\n- Final validation: ${strict.routes.length} routes, 0 diagnostics\n`);

const output = { complete: true, cacheHit, cacheKey: cacheKey.slice(0, 12), cashPerMinute: compactNumber(strict.metrics.expectedCashPerMinute), activeOres: strict.metrics.cappedActiveOres, routeSeconds: strict.metrics.routeTimeSeconds, remainingTiles: strict.metrics.remainingTiles, routes: strict.routes.length, diagnostics: 0 };
console.log(JSON.stringify(output, null, compact ? 0 : 2));
