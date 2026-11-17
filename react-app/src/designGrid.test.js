import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { gridForBounds } from './designGrid.js';

test('grid covers an eight-metre frame with a margin and retains origin-aligned spacing', () => {
  const spec = gridForBounds(new Box3(new Vector3(0, 0, 0), new Vector3(6, 4.3, 8)));
  assert.ok(spec.size / 2 >= 9);
  assert.equal(spec.divisions % 2, 0);
  assert.ok(Math.abs(spec.size / spec.divisions - 0.1) < 1e-9);
});

test('grid covers shifted objects on either side without unbounded line count', () => {
  const spec = gridForBounds(new Box3(new Vector3(-150, 0, -3), new Vector3(20, 3, 70)));
  assert.ok(spec.size / 2 >= 151);
  assert.ok(spec.divisions <= 1000);
});

test('empty scene retains the standard grid', () => {
  assert.deepEqual(gridForBounds(new Box3()), { size: 12, divisions: 120 });
});
