import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planeDistances, positionAtPlaneDistance } from './designDistances.js';

const object = { type: 'box', dimensions: { length: 1000, width: 600, height: 500 }, position: { x: 800, y: 100, z: -900 } };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('measures nearest surfaces on both sides of coordinate planes', () => {
  const distances = planeDistances(object);
  assert.deepEqual(distances.map((item) => item.distance), [300, 100, 600]);
  close(distances[0].start.x, 0.3);
  close(distances[0].end.x, 0);
});

test('editing a distance preserves the side of the plane and other coordinates', () => {
  const position = positionAtPlaneDistance(object, 'z', 50);
  assert.deepEqual(position, { x: 800, y: 100, z: -350 });
});

test('zero distance places a rotated object onto the plane without intersection', () => {
  const rotated = { ...object, rotation: { z: 45 } };
  const position = positionAtPlaneDistance(rotated, 'y', 0);
  close(planeDistances({ ...rotated, position })[1].distance, 0);
  close(position.y, (1000 + 500) / 2 / Math.sqrt(2) - 250);
});

test('intersections measure zero and can be moved clear of the plane', () => {
  const intersecting = { ...object, position: { x: 100, y: 100, z: 100 } };
  close(planeDistances(intersecting)[0].distance, 0);
  const position = positionAtPlaneDistance(intersecting, 'x', 20);
  close(planeDistances({ ...intersecting, position })[0].distance, 20);
});
