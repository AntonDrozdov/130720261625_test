import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createWorkshopFrame } from './workshopFrame.js';

test('generates five triangulated frames and wall/roof bracing with unique IDs', () => {
  const parts = createWorkshopFrame();
  assert.equal(parts.filter((part) => part.name.includes('колонна')).length, 10);
  assert.equal(parts.filter((part) => part.name.includes('нижний пояс')).length, 5);
  assert.ok(parts.filter((part) => part.name.includes('колонна')).every((part) => part.steelProfile.width === 100 && part.steelProfile.depth === 100));
  assert.ok(parts.filter((part) => part.name.includes('пояс')).every((part) => part.steelProfile.width === 60 && part.steelProfile.depth === 60));
  assert.equal(parts.filter((part) => part.name.includes('раскос фермы')).length, 20);
  assert.equal(parts.filter((part) => part.name.startsWith('Кровля — Х-связь')).length, 8);
  assert.equal(new Set(parts.map((part) => part.id)).size, parts.length);
  for (const part of parts) {
    assert.ok(Object.values(part.dimensions).every((value) => Number.isFinite(value) && value > 0));
    assert.ok(Object.values(part.rotation).every(Number.isFinite));
  }
});

test('gate, side door and both windows remain clear of steel members', () => {
  const meshes = createWorkshopFrame().map((part) => {
    const mesh = new Mesh(new BoxGeometry(part.dimensions.length / 1000, part.dimensions.height / 1000, part.dimensions.width / 1000), new MeshBasicMaterial());
    mesh.position.set(part.position.x / 1000, (part.position.y + part.dimensions.height / 2) / 1000, part.position.z / 1000);
    mesh.rotation.set(...['x', 'y', 'z'].map((axis) => part.rotation[axis] * Math.PI / 180));
    mesh.updateMatrixWorld();
    return mesh;
  });
  const check = (origin, direction) => {
    const ray = new Raycaster(new Vector3(...origin), new Vector3(...direction), 0, 0.5);
    assert.equal(ray.intersectObjects(meshes, false).length, 0, `Blocked opening at ${origin}`);
  };
  for (const x of [1.77, 3, 4.23]) for (const y of [0.02, 1, 1.98]) check([x, y, -0.2], [0, 0, 1]);
  for (const z of [2.52, 2.95, 3.38]) for (const y of [0.02, 1, 2.08]) check([6.2, y, z], [-1, 0, 0]);
  for (const z of [2.42, 3, 3.58]) for (const y of [1.22, 1.7, 2.18]) check([-0.2, y, z], [1, 0, 0]);
  for (const z of [4.42, 5, 5.58]) for (const y of [1.22, 1.7, 2.18]) check([6.2, y, z], [-1, 0, 0]);
  meshes.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
});

test('inserting a second frame translates all members together', () => {
  const original = createWorkshopFrame();
  const shifted = createWorkshopFrame(9000);
  original.forEach((part, index) => {
    assert.ok(Math.abs(shifted[index].position.x - part.position.x - 9000) < 1e-8);
    assert.equal(shifted[index].position.y, part.position.y);
    assert.equal(shifted[index].position.z, part.position.z);
  });
});
