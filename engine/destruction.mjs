export function itemDestructionChance(item) {
  const text = `${item?.effects ?? ''}\n${item?.description ?? ''}`;
  const match = text.match(/destroys?\s+([\d.]+)%\s+of (?:the )?ore/i);
  if (!match) return 0;
  return Math.min(1, Math.max(0, Number(match[1]) / 100));
}

export function expectedRouteOccupancySeconds({
  routeTimeSeconds,
  stages = [],
  terminalEvents = [],
  finalSurvival = 1,
  finalReplication = 1,
}) {
  const events = [
    ...stages.map((stage) => ({
      time: Number(stage.arrivalSeconds ?? stage.timeAfter ?? 0),
      kind: 'set',
      mass: Number(stage.survivalAfter ?? stage.survival ?? 1)
        * Number(stage.replicationAfter ?? stage.replication ?? 1),
    })),
    ...terminalEvents.map((event) => ({
      time: Number(event.time ?? 0),
      kind: 'subtract',
      mass: Number(event.destroyedOriginalFraction ?? 0) * Number(event.replication ?? 1),
    })),
  ].sort((left, right) => left.time - right.time || (left.kind === 'set' ? -1 : 1));

  let priorTime = 0;
  let activeMass = 1;
  let oreSeconds = 0;
  for (const event of events) {
    const eventTime = Math.min(Number(routeTimeSeconds), Math.max(priorTime, event.time));
    oreSeconds += (eventTime - priorTime) * activeMass;
    activeMass = event.kind === 'set' ? event.mass : Math.max(0, activeMass - event.mass);
    priorTime = eventTime;
  }
  oreSeconds += Math.max(0, Number(routeTimeSeconds) - priorTime)
    * Number(finalSurvival) * Number(finalReplication);
  return oreSeconds;
}
