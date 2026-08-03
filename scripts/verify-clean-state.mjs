import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const activeSource = await fs.readFile(path.join(root, 'data', 'active-plan.js'), 'utf8');
const state = JSON.parse(await fs.readFile(path.join(root, 'plans', 'workflow-state.json'), 'utf8'));
if (state.completedStage === 0 && !/TycoonActivePlan = null/.test(activeSource)) throw new Error('Empty workflow has stale rendered plan data.');
console.log(JSON.stringify({ valid: true, workflowStage: state.completedStage, renderedPlan: !/TycoonActivePlan = null/.test(activeSource) }));
