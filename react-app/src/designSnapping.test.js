import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Object3D } from 'three';
import { coordinateAlignment, coordinateAlignments, snapRotation, snapTranslation } from './designSnapping.js';

test('reports three distinct planes for an axis-aligned object', () => {
  const matches = coordinateAlignments(box(10, 20, 30));
  assert.equal(matches.length, 3);
  assert.equal(new Set(matches.map((match) => match.label)).size, 3);
});

test('reports only one plane when the other two faces are rotated away', () => {
  assert.equal(coordinateAlignments(box(10, 20, 30, 0.3)).length, 1);
});

test('detects parallel faces from orientation without a grabbed rotation axis or origin contact', () => {
  const mesh = box(10, 20, 30, Math.PI / 2);
  assert.ok(coordinateAlignment(mesh));
});

test('does not report coordinate alignment when all faces are tilted', () => {
  const mesh = box(10, 20, 30, 0.3);
  mesh.rotation.x = 0.4;
  mesh.rotation.y = 0.2;
  assert.equal(coordinateAlignment(mesh), null);
});

test('rotation aligns to scene planes within three degrees without moving the object', () => {
  const mesh = box(2, 3, 4, Math.PI / 2 + 0.02);
  assert.ok(snapRotation(mesh, 'Z'));
  close(mesh.rotation.z, Math.PI / 2);
  close(mesh.position.x, 2);
  close(mesh.position.y, 3);
});

test('rotation releases outside the angular tolerance', () => {
  const mesh = box(2, 3, 4, 0.1);
  assert.equal(snapRotation(mesh, 'Z'), null);
  close(mesh.rotation.z, 0.1);
});

test('rotation aligns with a face of another rotated object', () => {
  const mesh = box(2, 3, 4, Math.PI / 4 + 0.02);
  assert.equal(snapRotation(mesh, 'Z', [{ mesh: box(5, 3, 4, Math.PI / 4), name: 'Target' }]).label, 'Грань: Target');
  close(mesh.rotation.z, Math.PI / 4);
});

const dimensions = { length: 1000, height: 1000, width: 1000 };
function box(x, y, z, rotation = 0) {
  const mesh = new Object3D();
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotation;
  return mesh;
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);

test('snaps a whole face to a coordinate plane along the grabbed axis only', () => {
  const mesh = box(0.505, 2, 3);
  assert.equal(snapTranslation(mesh, dimensions, 'X', []), true);
  close(mesh.position.x, 0.5);
  close(mesh.position.y, 2);
  close(mesh.position.z, 3);
});

test('snaps overlapping opposite faces without a gap', () => {
  const mesh = box(3.005, 2, 3);
  const target = box(4, 2, 3);
  snapTranslation(mesh, dimensions, 'X', [{ mesh: target, dimensions }]);
  close(mesh.position.x, 3);
});

test('does not snap to a distant extension of another face', () => {
  const mesh = box(3.005, 2, 3);
  assert.equal(snapTranslation(mesh, dimensions, 'X', [{ mesh: box(4, 5, 3), dimensions }]), false);
  close(mesh.position.x, 3.005);
});

test('does not treat a rotated corner as a flat face on the ground', () => {
  const mesh = box(2, Math.SQRT1_2 + 0.01, 3, Math.PI / 4);
  assert.equal(snapTranslation(mesh, dimensions, 'Y', []), false);
});

test('snaps rotated parallel faces while preserving the other coordinates and rotation', () => {
  const source = box(3.005, 2, 3, Math.PI / 4);
  const target = box(3 + Math.SQRT1_2, 2 + Math.SQRT1_2, 3, Math.PI / 4);
  assert.equal(snapTranslation(source, dimensions, 'X', [{ mesh: target, dimensions }]), true);
  close(source.position.x, 3);
  close(source.position.y, 2);
  close(source.rotation.z, Math.PI / 4);
});

test('releases beyond the snapping distance and rejects plane dragging', () => {
  const mesh = box(0.55, 2, 3);
  assert.equal(snapTranslation(mesh, dimensions, 'X', []), false);
  assert.equal(snapTranslation(mesh, dimensions, 'XY', []), false);
  close(mesh.position.x, 0.55);
});

test('catches a coordinate plane crossed in a fast pointer step', () => {
  const mesh = box(0.3, 2, 3);
  assert.equal(snapTranslation(mesh, dimensions, 'X', [], box(0.8, 2, 3).position), true);
  close(mesh.position.x, 0.5);
});

test('catches another face crossed beyond the proximity threshold', () => {
  const mesh = box(3.3, 2, 3);
  const target = box(4, 2, 3);
  assert.equal(snapTranslation(mesh, dimensions, 'X', [{ mesh: target, dimensions }], box(2.8, 2, 3).position), true);
  close(mesh.position.x, 3);
});

test('stops at the first crossed face when a step crosses both sides', () => {
  const mesh = box(-1, 2, 3);
  snapTranslation(mesh, dimensions, 'X', [], box(1, 2, 3).position);
  close(mesh.position.x, 0.5);
});

test('can leave a plane after snapping', () => {
  const mesh = box(0.4, 2, 3);
  assert.equal(snapTranslation(mesh, dimensions, 'X', [], box(0.5, 2, 3).position), false);
});
