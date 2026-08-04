const normalized = (value) => String(value ?? '').trim().toLowerCase();

export function connectTeleporterPairs(components, physicalGraph) {
  const graph = new Map();
  const diagnostics = [];
  const receiversByColor = new Map();

  for (const component of components) {
    if (normalized(component.teleporterRole) !== 'receiver') continue;
    const color = normalized(component.teleporterColor);
    const receivers = receiversByColor.get(color) ?? [];
    receivers.push(component);
    receiversByColor.set(color, receivers);
  }

  for (const component of components) {
    const role = normalized(component.teleporterRole);
    const physicalNext = (physicalGraph.get(component.id) ?? [])
      .filter((next) => normalized(next.teleporterRole) !== 'receiver');
    if (role !== 'sender') {
      graph.set(component.id, physicalNext);
      continue;
    }

    const color = normalized(component.teleporterColor);
    const receivers = receiversByColor.get(color) ?? [];
    graph.set(component.id, receivers);
    if (!receivers.length) diagnostics.push({
      code: 'TELEPORTER_PAIR',
      message: `${component.name ?? 'Teleporter sender'} has no ${color || 'matching'} receiver.`,
      componentId: component.id,
    });
  }

  return { graph, diagnostics };
}

export function teleporterJumps(path) {
  const jumps = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const sender = path[index];
    const receiver = path[index + 1];
    if (normalized(sender.teleporterRole) !== 'sender'
      || normalized(receiver.teleporterRole) !== 'receiver'
      || normalized(sender.teleporterColor) !== normalized(receiver.teleporterColor)) continue;
    jumps.push({
      color: normalized(sender.teleporterColor),
      senderId: sender.id,
      receiverId: receiver.id,
    });
  }
  return jumps;
}
