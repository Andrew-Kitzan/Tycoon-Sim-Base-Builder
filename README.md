# Tycoon Sim 2 Base Planner

A browser-based grid planner for constructing and validating Tycoon Sim 2 bases.
The application can scale from 14×14 through 35×35 and opens on a clean canvas.
Completed setups are compact plan recipes loaded only after the reusable
geometry and continuous-route validators accept them.

## Repository contents

- `index.html` — planner interface.
- `styles.css` — grid, item, conveyor, workflow, and coordinate styling.
- `app.js` — planner interaction and rendering logic.
- `planner-core.js` — reusable rotation, conveyor compression, database checks,
  and continuous-route simulation.
- `engine/` — legal-item filtering, cap/post-cap search, A* placement,
  destructive-effect timing, seeded simulation, and independent validation.
- `rules/engine-rules.json` — machine-readable rules and diagnostic codes.
- `schemas/` — player-profile and generated-plan contracts.
- `profiles/` — compact player inputs that replace repeated large edits to
  `app.js`.
- `data/items.generated.js` — normalized workbook records used by recipes.
- `data/database-conflicts.json` — exact cross-sheet disagreements.
- `scripts/sync-database.mjs` — workbook normalization command.
- `data/Tycoon Sim Database.xlsx` — source-of-truth game database.
- `docs/BUILD_RULES.md` — complete shared base-building rules.
- `docs/PLANNER_WORKFLOW.md` — low-token setup recipe workflow.
- `docs/DATABASE_CONFLICTS.md` — readable workbook consistency report.
- `tests/validate-planner.js` — automated geometry and calculation checks.

## Quick start

No build step or web server is required:

1. Clone the repository and switch to your testing branch.
2. Open `index.html` in a browser.
3. Move the Base size slider to test plots from 14×14 through 35×35.

The board starts empty. When a setup is cleared or replaced, its superseded item,
route, active-plan, and validation data must be removed from `app.js` rather than
retained.

## Run automated checks

Install a current Node.js LTS release, then run:

```powershell
npm.cmd test
```

The test has no third-party dependencies. It verifies:

- database width/length rotation;
- odd/even internal conveyor widths;
- plot boundaries;
- item/item and conveyor/item overlaps;
- blank-board state and reusable interaction controls;
- reusable route, dropper, ore-cap, and economy calculations;
- furnace processing-zone geometry;
- the included database file; and
- that no retired setup remains loaded as the active plan.

For a syntax-only check:

```powershell
npm.cmd run check
```

## Low-token engine commands

The planner accepts a compact JSON profile and performs the repetitive work in
code. The normal loop is:

```powershell
npm.cmd run legal-pool -- profiles/example.json --compact
npm.cmd run solve-cap -- profiles/example.json --compact
npm.cmd run build -- profiles/example.json --compact
npm.cmd run validate-plan -- plans/active-plan.json --compact
npm.cmd run plan:summary
```

For a new setup, the preferred one-command workflow uses the reusable profile
format in `profiles/template.json`:

```powershell
npm.cmd run plan:full -- profiles/my-player.json --compact
```

It validates the player profile and database, searches item and layout
candidates, strictly validates every route, finalizes the winner, and writes the
grid artifacts. Add `--quick` for a smaller diagnostic search. Identical inputs
reuse a content-addressed cache until `npm.cmd run plan:clear` is run.

For a completed setup, use the resumable batch optimizer instead of manually
running individual candidates:

```powershell
npm.cmd run optimize
```

It checkpoints every tested configuration, skips completed configurations when
resumed, prints only a compact winning summary, runs strict directed-route
validation, finalizes the grid, and writes `PROJECT_STATE.md`. A new Codex task
can read that state file plus the rule files without replaying the old chat.

Before committing reusable engine changes, run:

```powershell
npm.cmd run verify:commit
```

Confirmed regressions live as structured fixtures in
`tests/fixtures/regressions/`. Repository-wide Codex workflow instructions are
in `AGENTS.md`.

`build` writes `plans/active-plan.json` plus the browser loader at
`data/active-plan.js`. The renderer reads that recipe automatically; it no
longer requires a hand-written setup inside `app.js`.

Use `npm.cmd run item -- "Item Name" --compact` for a focused database lookup.
The engine reads `data/items.index.json`, which merges repeated workbook rows
while preserving source sheets and ownership restrictions. Database sync hashes
the workbook and skips the expensive import when nothing changed.

## Branch testing workflow

```powershell
git switch -c test/my-layout
npm.cmd test
```

Make changes on the branch, rerun `npm.cmd test`, then commit and push the branch.
Do not change `main` directly when multiple people are testing.

## Database and rule precedence

Use these sources in order:

1. Explicit player restrictions and inventory.
2. `docs/BUILD_RULES.md`.
3. `data/Tycoon Sim Database.xlsx`.
4. A documented item exception or screenshot supplied for the current test.

If a required fact is missing or contradictory, ask before finalizing the route.

## Coordinate system

- Coordinates are one-based.
- Columns use letters: `A` through `AI`.
- Rows use numbers: `1` through `35`.
- An item's coordinate is its top-left occupied tile after rotation.
- Database size is always `WIDTH × LENGTH`.
- North/south items occupy `width × length` on the grid.
- East/west items occupy `length × width` on the grid.

## Add or update an item placement

Use `placeItem` in `app.js`:

```js
placeItem(
  order,
  'Item Name',
  columnNumber,
  rowNumber,
  databaseWidth,
  databaseLength,
  'north',
  'capgrader',
  {
    description: 'What the item does',
    stats: { Multiplier: '3x', Speed: 12 },
  },
);
```

Valid directions are `north`, `east`, `south`, and `west`. Never manually swap
the database width and length; `placeItem` performs the rotation. The final
first optional value declares the render category: `dropper`, `capgrader`,
`upgrader`, `portable`, or `furnace`. Droppers and furnaces can also be inferred
from their names. The final optional details object can provide `description`,
`stats`, `label`, and a stable `id` for the grid's item information and editor.

Rendered items are interactive. Hovering or keyboard-focusing an item shows its
name, description, stats, database size, rendered footprint, top-left coordinate,
and facing direction. Clicking opens controls to move it by a new top-left
coordinate, rotate it 90 degrees left or right, or remove it from the plan. Moves
and rotations are rejected if they leave the active base or overlap another item
or external conveyor. An accepted edit marks the route for revalidation.

Internal path width is automatic:

- even item width → two-tile centered path;
- odd item width → one-tile centered path.

## Add an external conveyor

Add a record to `routeSegments`:

```js
{
  name: 'Descriptive route name',
  conveyor: 'Supercharged',
  label: 'SC',
  x: 10,
  y: 17,
  width: 2,
  height: 2,
  direction: 'east',
  speed: 18,
}
```

Use the true conveyor footprint. Quarter Conveyors are 1×1. A normal Conveyor,
Supercharged Conveyor, and Centering Conveyor are 2×2. An Ultracharged Conveyor
is 4×2 before rotation.

## Render a plan

The normal blank state is:

```js
let workflowStage = 0;
let activePlan = null;
```

To render a verified plan during a branch test, point `activePlan` at the plan
object and advance `workflowStage` only after the corresponding checks pass.
Before merging a reusable planner change, restore the board to the blank state
unless the pull request intentionally adds a default example.

## Timing and ore-count calculation

Use:

```text
section time = length in tiles × 3 ÷ conveyor speed
```

Calculate each dropper separately when their entry paths differ:

```text
projected ores = Σ(dropper travel time × that dropper's ores/second)
active ores = min(projected ores, 100)
```

When cash-in value is known:

```text
expected cash/min = expected cash per processed ore × processed furnace entries/min
```

If the ore cap is saturated and no measured furnace rate is available, the
planner reduces spawning according to average time until each ore is either
destroyed or processed. Destroyed and rejected ores produce no cash, but their
removal frees ore-cap space earlier.

See `docs/BUILD_RULES.md` for the complete capgrader, effect, inventory, portable,
conveyor-wall, progression, and optimization rules.
