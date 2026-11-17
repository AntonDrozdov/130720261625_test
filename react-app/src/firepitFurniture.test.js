import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFirepitFurniture } from './firepitFurniture.js';

test('creates four complete armchairs and a five-part low table with unique IDs', () => {
  const parts = createFirepitFurniture();
  assert.equal(parts.length, 53);
  assert.equal(new Set(parts.map((part) => part.id)).size, 53);
  assert.equal(parts.filter((part) => part.name.includes('сиденье')).length, 4);
  assert.equal(parts.filter((part) => part.name.includes('наклонная спинка')).length, 4);
  const top = parts.find((part) => part.name === 'Комплект — столешница');
  assert.deepEqual(top.dimensions, { length: 1000, width: 500, height: 40 });
  assert.equal(top.position.y + top.dimensions.height, 300);
});

test('inserting beyond existing objects translates the whole set consistently', () => {
  const base = createFirepitFurniture();
  const shifted = createFirepitFurniture(5000);
  base.forEach((part, index) => {
    assert.ok(Math.abs(shifted[index].position.x - part.position.x - 5000) < 1e-8);
    assert.equal(shifted[index].position.y, part.position.y);
    assert.equal(shifted[index].position.z, part.position.z);
  });
});
