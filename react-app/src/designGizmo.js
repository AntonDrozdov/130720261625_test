import { Vector3 } from 'three';

export function gizmoAnchor(position, camera, width, height) {
  camera.updateMatrixWorld();
  const local = position.clone().applyMatrix4(camera.matrixWorldInverse);
  const projected = position.clone().project(camera);
  const marginX = Math.min(0.8, 240 / Math.max(width, 1));
  const marginY = Math.min(0.8, 240 / Math.max(height, 1));
  const x = local.z < -0.001 && Number.isFinite(projected.x) ? projected.x : 0;
  const y = local.z < -0.001 && Number.isFinite(projected.y) ? projected.y : 0;
  const depth = 2;
  const halfHeight = Math.tan(camera.fov * Math.PI / 360) * depth / camera.zoom;
  return {
    position: new Vector3(
      Math.max(-1 + marginX, Math.min(1 - marginX, x)) * halfHeight * camera.aspect,
      Math.max(-1 + marginY, Math.min(1 - marginY, y)) * halfHeight,
      -depth,
    ).applyMatrix4(camera.matrixWorld),
    movementScale: Math.max(0.05, Math.abs(local.z) / depth),
  };
}
