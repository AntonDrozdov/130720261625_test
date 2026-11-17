import { Euler, Quaternion, Vector3 } from 'three';

// Concept geometry only. Sections are placeholders pending site-specific structural design.
export const workshopAssumptions = {
  width: 6000, depth: 8000, eaves: 3000, ridge: 4200,
  gate: { width: 2500, height: 2000 }, door: { width: 900, height: 2100 },
};

export function createWorkshopFrame(offsetX = 0) {
  const parts = [];
  const profiles = {
    column: [100, 100, 5, '#485566'], chord: [60, 60, 4, '#5c6f80'],
    web: [60, 40, 3, '#8090a0'], rail: [100, 50, 3, '#85968b'],
    opening: [100, 100, 4, '#ba9055'], brace: [40, 40, 3, '#a36b51'],
  };
  const beam = (name, from, to, profile) => {
    const [width, depth, thickness, color] = profiles[profile];
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const length = a.distanceTo(b);
    const center = a.clone().add(b).multiplyScalar(0.5);
    const rotation = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.sub(a).normalize()));
    parts.push({
      id: globalThis.crypto.randomUUID(), type: 'box',
      name: `${name} · ${width}×${depth}×${thickness} (эскиз)`, color,
      dimensions: { length: width, width: depth, height: length },
      position: { x: center.x + offsetX, y: center.y - length / 2, z: center.z },
      rotation: { x: rotation.x * 180 / Math.PI, y: rotation.y * 180 / Math.PI, z: rotation.z * 180 / Math.PI },
      steelProfile: { width, depth, thickness },
    });
  };
  const xs = [70, 5930];
  const stations = [70, 2035, 4000, 5965, 7930];
  // Five transverse frames: two columns and a triangulated gable truss each.
  stations.forEach((z, index) => {
    const tag = `Рама ${index + 1}`;
    xs.forEach((x) => beam(`${tag} — колонна`, [x, 0, z], [x, 3000, z], 'column'));
    beam(`${tag} — нижний пояс`, [70, 3000, z], [5930, 3000, z], 'chord');
    beam(`${tag} — левый верхний пояс`, [70, 3000, z], [3000, 4200, z], 'chord');
    beam(`${tag} — правый верхний пояс`, [3000, 4200, z], [5930, 3000, z], 'chord');
    for (const x of [1535, 3000, 4465]) {
      const top = 4200 - Math.abs(x - 3000) * 1200 / 2930;
      beam(`${tag} — стойка фермы`, [x, 3000, z], [x, top, z], 'web');
    }
    [[70, 1535], [3000, 1535], [3000, 4465], [5930, 4465]].forEach(([bottom, top]) =>
      beam(`${tag} — раскос фермы`, [bottom, 3000, z], [top, 3600, z], 'web'));
  });
  // Roof purlins at roughly one metre along the slope, segmented at frame supports.
  for (const x of [70, 1047, 2023, 3000, 3977, 4953, 5930]) {
    const y = 4200 - Math.abs(x - 3000) * 1200 / 2930;
    for (let bay = 0; bay < 4; bay++) beam('Кровля — продольный прогон', [x, y + 60, stations[bay]], [x, y + 60, stations[bay + 1]], 'rail');
  }

  const openings = [
    { x: 5930, start: 2500, end: 3400, bottom: 0, top: 2100, name: 'Боковая дверь' },
    { x: 70, start: 2400, end: 3600, bottom: 1200, top: 2200, name: 'Левое окно' },
    { x: 5930, start: 4400, end: 5600, bottom: 1200, top: 2200, name: 'Правое окно' },
  ];
  // Trim wall rails around clear openings; no member crosses doors or windows.
  xs.forEach((x) => {
    for (const y of [300, 1100, 1900, 2700]) for (let bay = 0; bay < 4; bay++) {
      let spans = [[stations[bay], stations[bay + 1]]];
      openings.filter((opening) => opening.x === x && y >= opening.bottom && y <= opening.top).forEach((opening) => {
        spans = spans.flatMap(([a, b]) => [
          ...(a < opening.start - 100 ? [[a, Math.min(b, opening.start - 100)]] : []),
          ...(b > opening.end + 100 ? [[Math.max(a, opening.end + 100), b]] : []),
        ]);
      });
      spans.filter(([a, b]) => b - a > 10).forEach(([a, b]) => beam('Стена — ригель под панели', [x, y, a], [x, y, b], 'rail'));
    }
  });
  openings.forEach(({ x, start, end, bottom, top, name }) => {
    for (const z of [start - 50, end + 50]) beam(`${name} — стойка проёма`, [x, 0, z], [x, 3000, z], 'opening');
    beam(`${name} — перемычка`, [x, top + 50, start - 100], [x, top + 50, end + 100], 'opening');
    if (bottom) beam(`${name} — подоконный ригель`, [x, bottom - 50, start - 100], [x, bottom - 50, end + 100], 'opening');
  });
  // Front clear opening: 2500 wide by 2000 high, with no threshold member.
  for (const x of [1700, 4300]) beam('Подъёмные ворота — стойка', [x, 0, 70], [x, 3000, 70], 'opening');
  beam('Подъёмные ворота — перемычка', [1650, 2050, 70], [4350, 2050, 70], 'opening');
  for (const y of [300, 1100, 1900, 2800]) {
    const spans = y < 2100 ? [[70, 1650], [4350, 5930]] : [[70, 5930]];
    spans.forEach(([a, b]) => beam('Передний торец — ригель', [a, y, 70], [b, y, 70], 'rail'));
    beam('Задний торец — ригель', [70, y, 7930], [5930, y, 7930], 'rail');
  }
  // Longitudinal wall X-bracing stays in the last bay, away from all openings.
  xs.forEach((x) => {
    beam('Стена — Х-связь', [x, 150, 5965], [x, 2900, 7930], 'brace');
    beam('Стена — Х-связь', [x, 2900, 5965], [x, 150, 7930], 'brace');
  });
  // Roof-plane X-bracing in first and last bays, on both roof slopes.
  for (const [a, b] of [[70, 2035], [5965, 7930]]) for (const x of xs) {
    beam('Кровля — Х-связь', [x, 3020, a], [3000, 4220, b], 'brace');
    beam('Кровля — Х-связь', [x, 3020, b], [3000, 4220, a], 'brace');
  }
  for (const [a, b] of [[70, 3000], [3000, 5930]]) {
    beam('Задний торец — Х-связь', [a, 150, 7930], [b, 2900, 7930], 'brace');
    beam('Задний торец — Х-связь', [a, 2900, 7930], [b, 150, 7930], 'brace');
  }
  return parts;
}
