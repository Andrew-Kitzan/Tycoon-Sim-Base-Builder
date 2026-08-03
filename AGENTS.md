# Tycoon Sim 2 planner instructions

These instructions apply to the entire repository.

## Authoritative sources

- Item statistics and ownership data: `data/items.index.json`, generated from
  `data/Tycoon Sim Database.xlsx`.
- Mechanical rules: `rules/engine-rules.json`.
- Human-readable interpretation: `docs/BUILD_RULES.md`.
- Never infer an item stat from an old plan, screenshot, or chat message when it
  exists in the database. Report missing or conflicting database data.

## Base-building workflow

1. Validate every required player-profile field. Ask once for missing facts; do
   not silently assume ownership, progression, plot size, or inventory.
2. Run the database lint and legal-item filter.
3. Optimize the capgrader chain before normal multipliers or portables.
4. Map exact coordinates and directed conveyor flow.
5. Validate ranges, effects, lanes, timing, turns, footprints, inventory, item
   uses, furnace entry, and every dropper route.
6. Optimize expected cash/min, then remaining space, then route time.
7. Finalize and render only a strictly validated winner.

Use `npm.cmd run plan:full -- <profile.json> --compact` for the complete
pipeline. Use the individual commands only for diagnosis or when the user asks
to stop at a particular stage.

## Corrections and regressions

- Every confirmed engine mistake must become a minimal fixture in
  `tests/fixtures/regressions/` and an automated test before it is considered
  fixed.
- A regression fixture states the observed behavior, expected behavior, input,
  and expected diagnostic or assertion.
- Fix the reusable engine or rules rather than patching only the current plan.

## Generated state

- `npm.cmd run plan:clear` removes the current profile, plan, coordinate map,
  validation, optimization checkpoints, cached candidates, previews, and
  project-state summary.
- Clearing must preserve the database, engine, rules, schemas, fixtures, and
  automated tests.
- Do not commit a finalized test base unless the user explicitly requests it.

## Resource use

- Prefer compact CLI summaries and saved JSON artifacts over pasting full plans
  into chat.
- Optimization caches must be keyed by the profile, database, rules, and engine
  implementation. Never reuse a stale result.
- Give concise progress updates and a final outcome summary; do not narrate
  repetitive candidate searches.

## Verification

- Run `npm.cmd run verify:commit` after engine, rules, database, or UI changes.
- A build is not complete while any strict diagnostic remains.
