# Regression report template

Copy this when reporting a planner mistake:

```text
Regression:
Observed: [What the planner currently does]
Expected: [What the game requires]
Minimal example: [Items, effects, direction, or coordinates that demonstrate it]
Scope: [Engine/rules/UI/database]
Current base: [Rebuild it afterward: yes/no]
```

The correction is complete only when the reusable engine or rule is fixed and a
minimal JSON fixture is added under `tests/fixtures/regressions/`.

