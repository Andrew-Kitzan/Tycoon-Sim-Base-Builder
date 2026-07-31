# Tycoon Sim 2 Base-Building Rules

This document is the shared ruleset for planning, mapping, and validating bases.
The workbook in `data/Tycoon Sim Database.xlsx` is the source of truth for item
names, variants, sizes, multipliers, ranges, speeds, effects, sources, and limits.

## Required workflow

When a player asks for a base:

1. Build the legal item list.
2. Calculate the ore-value chain and validate every input range.
3. Map exact coordinates and rotations inside the player's plot.
4. Validate footprints, conveyor continuity, turns, effects, item uses, timing,
   ore count, and furnace conditions.
5. Render the completed plan on the grid.
6. Perform a final manual verification before presenting the build.

Every rendered item record must include its database description and relevant
stats so the grid's hover details are complete. The item editor may move, rotate,
or remove a mapped item, but every accepted edit invalidates the prior route
validation and must be rechecked before the layout is treated as complete.

When the player asks to clear the board or begin a new setup, permanently remove
all items, route segments, active-plan data, calculated validation totals, and
other setup-specific state from the previous base. Do not retain the old layout
as hidden, archived, fallback, or saved plan data because it is no longer relevant.

Do not stop after producing only an item list. Mapping and rendering follow
immediately unless required player information is missing.

## Workbook navigation

- `Other Info`: Effect definitions, cosmetic effects, ore-destroying effects,
  and effect interactions. A dropper may explicitly override destruction caused
  by an effect it naturally produces.
- `Stats for Nerds`: Drop-rate, conveyor-speed, ore-size, timing, and complex-item
  calculations. When an item says to refer to this sheet, use its rules here.
- `MPU`: Multiplier efficiency:
  - `MPU = multiplier^(1/length)`
  - `MPA = multiplier^(1/area)`
  - `MPS = multiplier^(1/time)`
- `Droppers`: Starting ore values, drop speeds, sizes, and natural effects.
- `Capgrader`: Legal capgraders, ranges, multipliers, sources, and use limits.
- `Upgraders`: Normal upgrader data, speeds, effects, and use limits.
- `Furnaces`: Furnace multipliers and special conditions.
- `DecoPots`: Conveyor items and decorative items. The conveyor section is
  relevant to route construction.
- `Crates`: Item availability by crate progression.
- `Rebirth Items`: Rebirth-locked items.
- `Achievement Items`: Items that require explicit ownership confirmation.
- `Premium Shop(P2W)`: Paid items.
- `Merchant`: Traveling Merchant items.
- `Items That Lie`: Exceptions where an item's displayed behavior or description
  needs correction.

## Player profile and item availability

- If F2P/P2W is unspecified, assume F2P.
- F2P builds may not use any Premium Shop/P2W item.
- If the player is P2W, ask which packs and individual items they own.
- Secret-tier items are never assumed owned. If Secret ownership is not stated,
  ask which Secret items the player has before using any.
- Merchant items require explicit ownership confirmation.
- Achievement items require explicit ownership confirmation.
- Exact inventory quantities are hard limits.
- If no exact quantity is provided, assume an unlimited inventory of every legal
  item, subject to limited-use rules and the dropper ownership exceptions below.
- Rebirth and Achievement droppers are limited to one copy each.
- Before using a Secret dropper, ask exactly how many copies the player owns.
- Base and Shiny versions share the same limited-use pool. Using either variant
  consumes that item's shared use.
- Lunar Landing is the exception: at most one Lunar Landing per dropper.

### Crate progression

Only use the stated crate and earlier crates:

`Basic → Advanced → Factory → Quarry → Futuristic → Toxic → Desert → Fantasy
→ Space → Candy → Periastron → Ancient → Alien → Tropical → Ocean → Trinket
→ Toy`

### Rebirth and Life

- `Life = Rebirth + 1`.
- A player at Rebirth 5 may use items through Rebirth 5.
- A player on Life 6 is equivalent to Rebirth 5.
- Teleporters require Rebirth 5 or later.

## Plot sizes

- Starting plot: 14×14.
- Mastery can increase it to 23×23.
- Rebirth progression provides 12 additional tiles per side in total.
- Current maximum: 35×35.
- The player's stated plot is a hard boundary.

## Item size, rotation, and internal conveyors

Workbook sizes use `WIDTH × LENGTH`.

- North/south placement:
  - Grid X size = item width.
  - Grid Y size = item length.
- East/west placement:
  - Grid X size = item length.
  - Grid Y size = item width.
- Rotating an item 90 degrees rotates its entire footprint, input, output, and
  internal conveyor while preserving its original width and length.
- The internal conveyor travels through the full item length and is centered
  across the item width.
- Even-width items use a centered two-tile-wide internal conveyor.
- Odd-width items use a centered one-tile-wide internal conveyor.
- The remainder of the full database footprint is wall or decoration and cannot
  overlap normal items or external conveyors.
- External conveyors must connect to the internal conveyor rather than to an
  item's wall or decoration.
- Normal items, including droppers, upgraders, furnaces, and conveyors, may not
  overlap unless an explicit exception is documented.
- Some droppers have extended drop points that can reach over nearby items.
  Handle those as documented edge cases rather than as the default rule.

## Ore movement and removal

Ore must move on an item's internal conveyor or an external conveyor. Ore is
removed when it:

- is destroyed by an upgrader;
- is destroyed by an effect;
- falls onto the ground;
- remains stuck without moving for five seconds; or
- is processed by the furnace.

All conveyors must be physically connected. Gaps cause ore to fall.

### Turns and conveyor safety

- Quarter Conveyor: 1×1.
- Half Conveyor: use for a straight two-tile section when its footprint matches.
- Conveyor: 2×2, speed 12.
- Supercharged Conveyor: 2×2, speed 18.
- Ultracharged Conveyor: 4×2, speed 24.
- Centering Conveyor: 2×2, speed 12. Its walls block ore from crossing the
  closed sides.
- Conveyor Wall: 1×2 and occupies its own placement space; it does not overlap a
  conveyor.
- Prefer faster conveyors on safe straight sections.
- Slow ore before a turn when practical.
- Ore may turn safely at speeds through 16.8. At speed 17 or higher, use a
  correctly placed Conveyor Wall or slow the ore before the turn.
- Use Quarter Conveyors for compact turns. For gap bridging and straight
  sections, use the fastest safe conveyor that fits the available space so ore
  reaches the furnace sooner.
- A 2×2 block made only from Quarter Conveyors should normally be replaced by the
  appropriate 2×2 conveyor unless the individual Quarter directions are required.
- Centering Conveyors, Orbital Messenger, Clockwork Upgrader, and teleporters
  center ore.
- A centering item can appear earlier on the same uninterrupted line; it does not
  need to be immediately before a centered upgrader.
- Side-fed droppers place ore toward that side. Droppers aligned with the route
  spawn ore in the center.
- T-junction merges are allowed.

## Dropper selection and the ore cap

- The base may contain at most 100 ores.
- The workbook's drop-speed calculation returns the interval for one ore.
- Example: Drop Speed 2 means two ores per second, or one ore every 0.5 seconds.
- Estimate steady-state ore count per dropper:
  `drop rate (ores/sec) × that dropper's travel time to the furnace`.
- For droppers with different entry positions, calculate each travel time
  separately and sum their estimated ore counts.
- Clamp the active estimate to the 100-ore base cap and also report the uncapped
  projection.
- When the base reaches 100 ores, droppers pause until an ore is removed. Which
  paused dropper resumes next is unpredictable and must not be used as a routing
  or value assumption.
- Always use the dropper the player requests, regardless of its drop speed.
- A Rebirth or Achievement dropper is limited to one copy, so use that single
  dropper at its actual speed.
- For a Secret dropper, ask how many copies the player owns before planning.
- If the requested dropper cannot provide enough ore and plot space permits, add
  other legal dropper types to raise production. Respect the player's progression,
  ownership, inventory, and item restrictions when choosing those additional
  droppers.
- Choose the total dropper mix from calculated travel time. Do not add excessive
  production that fills the cap much earlier than needed unless the player
  explicitly wants a cap-saturated build.

## Timing calculation

For every traveled item or conveyor section:

`time in seconds = length in tiles × 3 ÷ conveyor speed`

Sum the traveled lengths along the ore's actual centerline. Do not count parallel
width tiles as additional route length. By default, a furnace has a centered 2×2
processing zone. Route the ore into that zone. Processing is immediate when the
ore touches it, so do not add time beyond the travel time required to reach the
zone unless the database explicitly documents an additional delay.

Furnace processing-zone exceptions:

- Krakatoa has a centered 2×1 processing zone rather than a 2×2 zone.
- Proficient Furnace and Toxic Wasteland have a 2×2 processing zone in a corner.
  When facing south, the zone is in the bottom-left corner of the furnace
  footprint. Rotate that corner position with the furnace for every other facing.

## Expected cash per minute

When the expected furnace cash-in value and furnace entry rate are known, report:

`expected cash/min = expected cash per accepted ore × furnace entries/min`

- Prefer a measured or otherwise known furnace entry rate when the player
  supplies one.
- When estimating, calculate the total raw drop rate and the rate-weighted
  average travel time.
- If projected active ores remain below 100, estimated furnace entries/min equal
  the total ores/second produced multiplied by 60.
- If the route saturates the 100-ore cap and no ore is removed early, estimate
  the cap-limited rate as: `100 ÷ weighted average travel time × 60`.
- Count only ores actually processed by the furnace as furnace entries. An ore
  destroyed or rejected earlier produces no cash.
- Destroyed ores immediately free their ore-cap slots. For routes with meaningful
  destruction risk, estimate cap usage from each outcome's time until destruction
  or furnace processing rather than treating every spawned ore as traveling the
  full route.
- Include probabilistic scanner results, destructive machines, furnace rejection,
  and every other survival risk in the processed-ore rate and expected cash.
- The cash-per-ore input must include the furnace multiplier and every condition
  the build actually satisfies.
- Report the furnace entries/min, expected cash/min, and whether the estimate is
  production-limited or ore-cap-limited.

## Capgrader rules

- Use only items listed on `Capgrader` as capgraders.
- Normal upgraders cannot be used as capgrader starts.
- Apply capgraders immediately after the dropper section.
- Pick a final capgrader and keep every input inside its allowed range.
- The first optimization priority is the ore value immediately **before** the
  final capgrader. Bring that input as close as practical to the final
  capgrader's upper threshold without reaching or exceeding it.
- Measure and report the remaining gap between the planned input and the final
  capgrader's upper threshold. A faster or smaller chain must not be chosen when
  it leaves a meaningfully larger cap gap.
- An input within 5% below the final capgrader's upper threshold qualifies as
  near-cap. Inside that 5% band, time and space may take priority only when the
  saved space enables a stronger later multiplier or otherwise improves expected
  cash/min. If space is not constrained, continue favoring the closer cap input.
- Example: for a final capgrader with a 135K upper threshold, prefer an input
  close to 134K–134.999K over an input near 101K, even when the 101K chain is
  faster or shorter.
- A high-cap item may appear later if its input is still within range.
- Capgrader scanners such as Precision, Ancient, and Azure may only be the final
  capgrader because their upgrades are not guaranteed. This final-capgrader rule
  does not apply to normal post-capgrader items such as Star Scanner.
- Do not select a tiny shortcut that merely reaches the final capgrader's minimum
  unless the player explicitly requests absolute minimum time.
- Capgrader-chain optimization is lexicographic:
  1. reach the final capgrader's 5% near-cap band whenever practical;
  2. inside that band, maximize expected cash/min for the completed base;
  3. accept a larger cap gap only when saved time/space enables a stronger later
     multiplier or another net cash/min improvement;
  4. when the saved space produces no downstream benefit, prefer the closer cap
     input;
  5. use elapsed time and total occupied space as final tie-breakers.
- Only prioritize absolute minimum time over reaching the 5% near-cap band when
  the player explicitly asks for that objective.

### Additive starts and Lunar Landing

- One Lunar Landing per dropper is available whenever Lunar Landing comes from a
  crate the player can access. It does not require separate player permission.
- When Lunar Landing is selected, it must be that dropper's first upgrader.
- Compare Lunar Landing's effective multiplier with every legal additive
  upgrader available to that player. Use Lunar Landing when it provides the
  larger upgrade; use the additive upgrader instead when the additive provides
  the larger upgrade.
- Perform this comparison separately for each dropper and starting ore value.
- Recalculate the effective multiplier after every additive use. Do not assume a
  second copy remains the best option.

### Destructive effects

- Avoid capgraders that add a destructive effect unless Ore Washer can remove it
  before the ore is destroyed.
- Overcharged cannot be washed away.
- A dropper that naturally produces a destructive effect is allowed to give its
  ore that same effect without destroying it when the database documents that
  protection.

### Randomized and destructive normal upgraders

- Evaluate randomized and destructive normal upgraders by expected cash/min,
  not only by guaranteed survival or cash per surviving ore.
- A machine that destroys some ores may still be optimal when its multiplier on
  surviving ores raises total expected cash/min.
- Lambdas have no maximum number of uses per ore. Three Lambdas are the normal
  recommendation, not a use limit: the workbook identifies three as the
  risk/reward sweet spot between stronger possible outcomes and the rapidly
  increasing chance that the ore is destroyed or ruined.
- For `n` Lambda upgrades, use the workbook's cumulative survival formula:
  `1.5^(n - 1) ÷ n!`. The listed survival rates are 100% after one Lambda, 75%
  after two, 37.5% after three, and approximately 14.06% after four.
- After a Base Lambda upgrade survives, its outcome probabilities are:
  1/19 for 3.2×, 1/19 for +1,000, 1/19 for an explosion, 1/19 for setting the
  ore to 1, 1/19 for fling and 2.2×, 1/19 for 6× plus Sparkle, and 13/19 for
  2.2×. Use the corresponding variant-specific values from `Stats for Nerds`
  when the player owns a stronger Lambda variant.
- Three Lambdas have a listed 37.5% total survival chance. The workbook's custom
  three-Lambda comparison lists approximately 40.28% bad outcomes and 59.72%
  good outcomes among the modeled outcomes; use the full probability tree when
  estimating processed ore rate and expected cash/min.
- Because Lambda can apply Sparkle, prefer placing it after Acid Plant when the
  route can subsequently clear effects with Ore Washer.
- If Lambdas do not fit, use the MPU list to compare their expected benefit
  against competing items rather than removing them automatically.
- Star Scanner is optional when space is available. If owned, one is a common
  choice for its possible 3× upgrade; multiple Star Scanners may be spread across
  the route to give more ores a chance to be hit.
- Star Scanner has a successful-use limit of one per ore across all of its
  variants and copies. Once an ore receives one successful Star Scanner beam hit,
  later Star Scanner beams cannot upgrade it again. A missed earlier beam does
  not consume the use, so a later scanner may still successfully hit that ore.
- When space is constrained, remove optional scanners before stronger
  expected-value items unless the scanner has better MPU or expected cash/min.

## Normal upgraders and furnaces

- After capgraders, use legal normal upgraders while space and use limits allow.
- Apply every multiplier in route order.
- Validate limited uses across Base, Shiny, Mythic, and Shiny Mythic variants.
- All variant forms of the same item share one Limited Uses pool per ore. Using
  the Base, Shiny, Mythic, or Shiny Mythic form counts against that same item's
  per-ore limit.
- Additional copies may improve coverage for random or position-dependent
  upgraders, but they cannot exceed the shared per-ore successful-use limit.
- Place the furnace last.
- Connect the route to the furnace's processing zone. Assume a centered 2×2 zone
  unless the furnace is one of the documented processing-zone exceptions.
- Check furnace-specific conditions and use the best multiplier the route
  actually satisfies.

## Portable upgraders

- Portables do not contain conveyors. Place them beside an external conveyor.
- All normal portable upgrade beams are two tiles long. This includes standard
  Portables, Derp Blaster, Dragon, and Ore Glazer.
- Portable Spinner is the only documented exception: its upgrade zone extends
  one tile around it instead of using a two-tile-long beam.
- Portable upgrade beams may pass through walls/decorations and may overlap other
  portable beams.
- Portable physical footprints still obey any documented placement restrictions.
- A single portable may upgrade the same ore again only after the ore completely
  leaves its upgrade zone and later re-enters it.
- Normal built-in conveyor upgraders cannot reverse direction internally, so
  multi-pass reuse is generally a portable routing technique.

## Optimization priority

1. Maximize expected cash per minute, including ore survival, destruction,
   random outcomes, furnace acceptance, and ore-cap behavior.
2. Preserve the final-capgrader priority and its 5% near-cap rule.
3. If everything does not fit, prioritize space efficiency and compare MPU/MPA
   by their contribution to expected cash/min.
4. Prioritize travel time when the ore cap is saturated or the player uses
   Throne.
5. Prefer faster safe straight conveyors, but preserve valid turns, centering,
   ranges, effects, and item-use limits.

## Required output

For a completed build, provide:

- the legal item chain;
- grouped calculation tables with amount, ore before/after, cumulative elapsed
  time, and cumulative route length;
- exact grid coordinates and facing direction;
- all external conveyor types and coordinates;
- turn/wall/centering notes;
- estimated per-dropper travel time;
- projected and capped ore counts;
- estimated furnace entries per minute and expected cash per minute when the
  required values are known;
- remaining plot space; and
- a rendered grid that matches the coordinate map.
