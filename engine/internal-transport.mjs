const excludedTypes = new Set(['dropper', 'portable', 'furnace']);

function definitionFor(item) {
  return item.item ?? item.definition ?? item;
}

export function internalTransportProfile(item, rules = {}) {
  const definition = definitionFor(item);
  const itemWidth = Number(item.itemWidth ?? definition.size?.width);
  const override = rules.internalTransportOverrides?.[item.name ?? definition.name];
  const across = Number(override?.across ?? (itemWidth % 2 === 0 ? 2 : 1));
  const northOffset = Number(override?.northOffset ?? ((itemWidth - across) / 2));
  return { across, northOffset, itemWidth };
}

export function internalTransportCrossOffset(item, direction = item.direction, rules = {}) {
  const profile = internalTransportProfile(item, rules);
  return direction === 'south' || direction === 'west'
    ? profile.itemWidth - profile.northOffset - profile.across
    : profile.northOffset;
}

export function internalTransportRect(item, rules = {}) {
  const definition = definitionFor(item);
  const type = item.type ?? definition.type;
  if (excludedTypes.has(type)) return null;
  const profile = internalTransportProfile(item, rules);
  const offset = internalTransportCrossOffset(item, item.direction, rules);
  const horizontal = item.direction === 'east' || item.direction === 'west';
  return horizontal
    ? { x: item.x, y: item.y + offset, width: item.width, height: profile.across }
    : { x: item.x + offset, y: item.y, width: profile.across, height: item.height };
}
