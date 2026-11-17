import { Euler, Quaternion, Vector3 } from 'three';

export function createFirepitFurniture(offsetX = 0) {
  const parts = [];
  const wood = '#b78a5b';
  const frame = '#414640';
  const center = new Vector3(offsetX + 2200, 0, 2200);
  const add = (name, size, localCenter, color, origin, yaw = 0, tilt = 0) => {
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    const position = new Vector3(...localCenter).applyQuaternion(turn).add(origin);
    const rotation = new Euler().setFromQuaternion(turn.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tilt)));
    parts.push({
      id: globalThis.crypto.randomUUID(), type: 'box', name, color,
      dimensions: { length: size[0], width: size[1], height: size[2] },
      position: { x: position.x, y: position.y - size[2] / 2, z: position.z },
      rotation: { x: rotation.x * 180 / Math.PI, y: rotation.y * 180 / Math.PI, z: rotation.z * 180 / Math.PI },
    });
  };

  for (let index = 0; index < 4; index++) {
    const yaw = index * Math.PI / 2;
    const origin = center.clone().add(new Vector3(Math.sin(yaw) * 1800, 0, Math.cos(yaw) * 1800));
    const name = `Кресло ${index + 1}`;
    add(`${name} — сиденье`, [640, 640, 60], [0, 380, 0], wood, origin, yaw);
    const tilt = 22 * Math.PI / 180;
    add(`${name} — наклонная спинка`, [640, 50, 600], [0, 380 + 300 * Math.cos(tilt), 290 + 300 * Math.sin(tilt)], wood, origin, yaw, tilt);
    for (const x of [-270, 270]) for (const z of [-245, 245]) {
      add(`${name} — ножка ${x < 0 ? 'Л' : 'П'}${z < 0 ? 'П' : 'З'}`, [50, 50, 350], [x, 175, z], frame, origin, yaw);
      add(`${name} — опора подлокотника ${x < 0 ? 'Л' : 'П'}${z < 0 ? 'П' : 'З'}`, [35, 35, 150], [x, 485, z], frame, origin, yaw);
    }
    for (const x of [-290, 290]) add(`${name} — подлокотник ${x < 0 ? 'левый' : 'правый'}`, [80, 680, 45], [x, 582.5, 10], wood, origin, yaw);
  }

  // Leave the centre empty for the fire; the low table sits beside it.
  const tableOrigin = center.clone().add(new Vector3(850, 0, 0));
  add('Комплект — столешница', [1000, 500, 40], [0, 280, 0], wood, tableOrigin, Math.PI / 2);
  for (const x of [-425, 425]) for (const z of [-175, 175]) {
    add(`Комплект — ножка стола ${x < 0 ? 'Л' : 'П'}${z < 0 ? 'П' : 'З'}`, [50, 50, 260], [x, 130, z], frame, tableOrigin, Math.PI / 2);
  }
  return parts;
}
