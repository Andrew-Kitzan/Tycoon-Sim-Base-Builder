# Automated, low-token planner workflow

Base creation is data-driven. Do not rewrite a large item list in `app.js`.

## 1. Record the player profile

Copy `profiles/example.json` and fill every required field. Missing Life/Rebirth,
plot size, dropper variant, crate limit, variant access, or payment status is a
hard `PROFILE_MISSING` diagnostic rather than an assumption. Merchant, Secret,
Achievement, Premium, exact inventory, required, and forbidden items are
explicit arrays/maps.

## 2. Compile the plan

```powershell
npm.cmd run build -- profiles/example.json --compact
```

The compiler performs these reusable stages:

1. Merge duplicate workbook rows and build the player-specific legal pool.
2. Search range-valid capgrader chains with shared variant use limits. Scanners
   are terminal capgraders; near-cap candidates enter the 5% band before the
   global fit/cash comparison.
3. Search post-cap items by expected surviving cash, use limits, time, and area.
4. Select legal dropper quantity, furnace, and variants.
5. Pack footprints, route pre-upgrader dropper merges with A*, place portable
   footprints beside reachable route cells, and compress straight Quarter
   patterns into Half/Supercharged conveyors.
6. Time destructive effects to the next Ore Wash or furnace and reject chains
   whose ores expire first.
7. Calculate analytic ore-cap throughput and a reproducible seeded simulation.

The output is `plans/active-plan.json`; `data/active-plan.js` lets the grid render
the same recipe.

Run `npm.cmd run plan:clear` when a build is finished or a new setup is about to
start. It deletes the generated JSON and resets the browser loader to `null`, so
retired base data is not retained.

## 3. Validate independently

```powershell
npm.cmd run validate-plan -- plans/active-plan.json --compact
npm.cmd test
```

The validator recomputes rotation, bounds, collisions, conveyor footprints,
continuous dropper-to-processing-zone reachability, and hard diagnostics. It
does not trust the compiler's `valid` flag.

## 4. Inspect without loading large files

```powershell
npm.cmd run item -- "Runic Array" --compact
npm.cmd run legal-pool -- profiles/example.json --compact
npm.cmd run solve-cap -- profiles/example.json --compact
npm.cmd run plan:summary
```

These focused commands are the preferred interface for future Codex work. They
keep the full database, search frontiers, and rendered JavaScript out of chat
context unless a specific failure needs investigation.

## Database updates

Run `npm.cmd run database:sync` after replacing the workbook. Its SHA-256 cache
skips unchanged imports. `data/items.generated.js` remains the full browser
database; `data/items.index.json` is the smaller engine index. Cross-sheet
conflicts remain fatal and are written to `data/database-conflicts.json`.

Teleporters remain disabled until their routing rules are supplied.
