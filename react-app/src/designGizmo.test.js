import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { gizmoAnchor } from './designGizmo.js';

function cameraAt(z) {
  const camera = new PerspectiveCamera(48, 800 / 600, 0.01, 2000);
  camera.position.z = z;
  camera.updateMatrixWorld();
  return camera;
}

test('gizmo remains in front of the camera at extreme zoom distances', () => {
  for (const distance of [0.001, 0.1, 100, 5000]) {
    const camera = cameraAt(distance);
    const result = gizmoAnchor(new Vector3(), camera, 800, 600);
    const projected = result.position.clone().project(camera);
    assert.ok(projected.z > -1 && projected.z < 1);
    assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1);
    assert.ok(Number.isFinite(result.movementScale));
  }
});

test('offscreen object keeps its gizmo inside the viewport with margins', () => {
  const camera = cameraAt(1);
  const result = gizmoAnchor(new Vector3(100, 100, 0), camera, 800, 600);
  const projected = result.position.clone().project(camera);
  assert.ok(Math.abs(projected.x) <= 0.700001);
  assert.ok(Math.abs(projected.y) <= 0.600001);
});

test('an object behind the camera still has an accessible gizmo', () => {
  const camera = cameraAt(1);
  const result = gizmoAnchor(new Vector3(0, 0, 2), camera, 800, 600);
  const projected = result.position.clone().project(camera);
  assert.ok(Math.abs(projected.x) < 1e-9);
  assert.ok(Math.abs(projected.y) < 1e-9);
  assert.ok(projected.z > -1 && projected.z < 1);
});
