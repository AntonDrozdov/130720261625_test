import { Euler, Quaternion, Vector3 } from 'three';

export function planeDistances(object) {
  const dimensions = object.dimensions ?? {};
  const sizes = [dimensions.length ?? 1000, dimensions.height ?? 500, dimensions.width ?? 600];
  const rotation = object.rotation ?? {};
  const quaternion = new Quaternion().setFromEuler(new Euler(...['x', 'y', 'z'].map((axis) => (rotation[axis] ?? 0) * Math.PI / 180)));
  const axes = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)].map((axis) => axis.applyQuaternion(quaternion));
  const center = new Vector3(object.position?.x ?? 0, (object.position?.y ?? 0) + sizes[1] / 2, object.position?.z ?? 0);
  return ['x', 'y', 'z'].map((axis, index) => {
    const sign = center[axis] >= 0 ? 1 : -1;
    const components = axes.map((direction, i) => direction[axis] * sizes[i] / 2);
    const extent = object.type === 'sphere' ? Math.hypot(...components) : components.reduce((sum, value) => sum + Math.abs(value), 0);
    const offset = new Vector3();
    axes.forEach((direction, i) => {
      const amount = object.type === 'sphere'
        ? (extent > 0 ? components[i] * sizes[i] / 2 / extent : 0)
        : Math.sign(components[i]) * sizes[i] / 2;
      offset.addScaledVector(direction, -sign * amount);
    });
    const start = center.clone().add(offset);
    const distance = Math.max(0, Math.abs(center[axis]) - extent);
    if (distance === 0) {
      // The segment between the two support points crosses the coordinate plane.
      start.copy(center).addScaledVector(offset, extent > 0 ? Math.abs(center[axis]) / extent : 0);
    }
    const end = start.clone();
    end[axis] = 0;
    return { axis, plane: ['YZ', 'XZ', 'XY'][index], distance, extent, sign, start: start.multiplyScalar(0.001), end: end.multiplyScalar(0.001) };
  });
}

export function positionAtPlaneDistance(object, axis, distance) {
  const measurement = planeDistances(object).find((item) => item.axis === axis);
  const position = { x: object.position?.x ?? 0, y: object.position?.y ?? 0, z: object.position?.z ?? 0 };
  position[axis] = measurement.sign * (measurement.extent + distance);
  if (axis === 'y') position.y -= (object.dimensions?.height ?? 500) / 2;
  return position;
}
