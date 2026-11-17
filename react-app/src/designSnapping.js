import { Quaternion, Vector3 } from 'three';

const worldAxes = () => [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

export function coordinateAlignments(mesh) {
  const matches = new Map();
  worldAxes().forEach((localNormal, sourceAxis) => {
    const normal = localNormal.applyQuaternion(mesh.quaternion);
    worldAxes().forEach((reference, index) => {
      const parallel = Math.abs(normal.dot(reference));
      if (parallel >= Math.cos(Math.PI / 360) && (!matches.has(index) || parallel > matches.get(index).parallel)) {
        matches.set(index, { normal: reference, sourceAxis, label: ['YZ', 'XZ — горизонталь', 'XY'][index], parallel });
      }
    });
  });
  return [...matches.values()];
}

export function coordinateAlignment(mesh) {
  return coordinateAlignments(mesh).sort((a, b) => b.parallel - a.parallel)[0] ?? null;
}

export function snapRotation(mesh, axisName, targets = []) {
  if (!['X', 'Y', 'Z'].includes(axisName)) return null;
  const axis = worldAxes()[['X', 'Y', 'Z'].indexOf(axisName)];
  const references = worldAxes().map((normal, index) => ({ normal, label: ['YZ', 'XZ — горизонталь', 'XY'][index] }));
  targets.forEach(({ mesh: target, name, dimensions }) => worldAxes().forEach((normal, index) => {
    references.push({ normal: normal.applyQuaternion(target.quaternion), label: `Грань: ${name}`, mesh: target, dimensions, faceAxis: index });
  }));
  let best = null;
  for (const [sourceAxis, normal] of worldAxes().map((normal) => normal.applyQuaternion(mesh.quaternion)).entries()) {
    const sourceProjection = normal.clone().addScaledVector(axis, -normal.dot(axis));
    // A face whose normal lies on the rotation axis cannot indicate angular alignment.
    if (sourceProjection.lengthSq() < 1e-8) continue;
    sourceProjection.normalize();
    for (const reference of references) for (const sign of [-1, 1]) {
      const targetNormal = reference.normal.clone().multiplyScalar(sign);
      // Rotation around the grabbed axis must be sufficient to align the whole face.
      if (Math.abs(normal.dot(axis) - targetNormal.dot(axis)) > 1e-7) continue;
      const targetProjection = targetNormal.clone().addScaledVector(axis, -targetNormal.dot(axis)).normalize();
      const angle = Math.atan2(axis.dot(sourceProjection.clone().cross(targetProjection)), sourceProjection.dot(targetProjection));
      if (Math.abs(angle) <= Math.PI / 60 && (!best || Math.abs(angle) < Math.abs(best.angle))) best = { angle, reference, sourceAxis };
    }
  }
  if (!best) return null;
  mesh.quaternion.premultiply(new Quaternion().setFromAxisAngle(axis, best.angle));
  return { ...best.reference, sourceAxis: best.sourceAxis };
}

// Scene units are metres. Only genuinely parallel faces can snap together.
const snapDistance = 0.01;
const parallelTolerance = 1e-8;

function facesOf(mesh, dimensions) {
  const axes = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
    .map((axis) => axis.applyQuaternion(mesh.quaternion));
  const half = [dimensions.length, dimensions.height, dimensions.width].map((value) => value * 0.0005);
  return axes.flatMap((axis, index) => [-1, 1].map((sign) => {
    const tangents = axes.filter((_, i) => i !== index);
    const sizes = half.filter((_, i) => i !== index);
    const center = mesh.position.clone().addScaledVector(axis, half[index] * sign);
    const corners = [-1, 1].flatMap((u) => [-1, 1].map((v) => center.clone()
      .addScaledVector(tangents[0], sizes[0] * u).addScaledVector(tangents[1], sizes[1] * v)));
    return { normal: axis.clone().multiplyScalar(sign), center, corners, tangents };
  }));
}

function overlaps(source, target, offset) {
  // Separating-axis test for coplanar rectangles, including rotated faces.
  return [...source.tangents, ...target.tangents].every((axis) => {
    const a = source.corners.map((corner) => corner.clone().add(offset).dot(axis));
    const b = target.corners.map((corner) => corner.dot(axis));
    return Math.min(...a) < Math.max(...b) - 1e-8 && Math.max(...a) > Math.min(...b) + 1e-8;
  });
}

export function snapTranslation(mesh, dimensions, axisName, targets, previousPosition = null) {
  if (!['X', 'Y', 'Z'].includes(axisName)) return false;
  const axis = new Vector3(axisName === 'X' ? 1 : 0, axisName === 'Y' ? 1 : 0, axisName === 'Z' ? 1 : 0);
  let correction = null;
  let firstCrossing = Infinity;
  const movement = previousPosition ? mesh.position.clone().sub(previousPosition).dot(axis) : 0;
  const crossingTime = (distance) => {
    if (Math.abs(movement) < 1e-9) return Infinity;
    const time = 1 + distance / movement;
    // Exclude starting on the plane, so dragging onward releases the snap.
    return time > 1e-8 && time <= 1 ? time : Infinity;
  };
  const consider = (distance) => {
    const time = crossingTime(distance);
    if (time < firstCrossing) {
      firstCrossing = time;
      correction = distance;
    } else if (firstCrossing === Infinity && Math.abs(distance) <= snapDistance && (correction === null || Math.abs(distance) < Math.abs(correction))) correction = distance;
  };
  const targetFaces = targets.flatMap(({ mesh: target, dimensions: size }) => facesOf(target, size));
  for (const face of facesOf(mesh, dimensions)) {
    // Coordinate planes pass through the origin and extend without bounds.
    if (Math.abs(face.normal.dot(axis)) > 1 - parallelTolerance) consider(-face.center.dot(axis));
    for (const target of targetFaces) {
      if (face.normal.dot(target.normal) > -1 + parallelTolerance) continue;
      const denominator = axis.dot(target.normal);
      if (Math.abs(denominator) < 1e-6) continue;
      const distance = target.center.clone().sub(face.center).dot(target.normal) / denominator;
      if (Math.abs(distance) > snapDistance && crossingTime(distance) === Infinity) continue;
      if (overlaps(face, target, axis.clone().multiplyScalar(distance))) consider(distance);
    }
  }
  if (correction === null) return false;
  mesh.position.addScaledVector(axis, correction);
  return true;
}
