// Editor dimensions and positions are in millimetres; Y is the bottom of a part.
export function createPool(offsetX = 0) {
  const innerSize = 3000;
  const depth = 2000;
  const thickness = 200;
  const outerSize = innerSize + thickness * 2;
  const center = offsetX + outerSize / 2;
  const part = (name, length, width, height, x, y, z) => ({
    id: globalThis.crypto.randomUUID(),
    type: 'box', name: `Бассейн — ${name}`, color: '#80c4d6',
    dimensions: { length, width, height },
    position: { x, y, z }, rotation: { x: 0, y: 0, z: 0 },
  });
  return [
    part('дно', outerSize, outerSize, thickness, center, 0, outerSize / 2),
    part('передняя стенка', outerSize, thickness, depth, center, thickness, thickness / 2),
    part('задняя стенка', outerSize, thickness, depth, center, thickness, outerSize - thickness / 2),
    part('левая стенка', thickness, innerSize, depth, offsetX + thickness / 2, thickness, outerSize / 2),
    part('правая стенка', thickness, innerSize, depth, offsetX + outerSize - thickness / 2, thickness, outerSize / 2),
  ];
}
