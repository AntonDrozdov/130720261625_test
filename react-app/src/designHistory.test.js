import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesignHistory } from './designHistory.js';

test('keeps only the last ten actions and supports branching after undo', () => {
  const history = createDesignHistory([]);
  for (let i = 1; i <= 12; i++) history.change([i]);
  assert.equal(history.count, 10);
  for (let i = 11; i >= 2; i--) assert.deepEqual(history.undo(), [i]);
  assert.equal(history.undo(), undefined);
  history.change([20]);
  assert.deepEqual(history.undo(), [2]);
});

test('a continuous drag is one action; no-op edits do not consume history', () => {
  const history = createDesignHistory([{ id: 'a', position: { x: 0 } }]);
  history.change([{ id: 'a', position: { x: 0 } }]);
  assert.equal(history.count, 0);
  history.begin();
  for (let x = 1; x <= 100; x++) history.change([{ id: 'a', position: { x } }]);
  assert.equal(history.undo(), undefined);
  history.end();
  assert.equal(history.count, 1);
  assert.deepEqual(history.undo(), [{ id: 'a', position: { x: 0 } }]);
  history.reset([]);
  assert.equal(history.count, 0);
  assert.equal(history.undo(), undefined);
});
