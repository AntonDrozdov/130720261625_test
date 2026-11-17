import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
import { groupSnapshot, transformGroup } from './designGroup.js';

const objects = [
  { id: 'a', position: { x: -1000, y: 0, z: 0 }, dimensions: { height: 500 }, rotation: { x: 0, y: 0, z: 0 } },
  { id: 'b', position: { x: 1000, y: 0, z: 0 }, dimensions: { height: 500 }, rotation: { x: 0, y: 0, z: 0 } },
];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8);

test('group translation moves every member equally', () => {
  const changes = transformGroup(groupSnapshot(objects), new Vector3(0.1, 0.2, 0.3));
  close(changes[0].position.x, -900);
  close(changes[1].position.x, 1100);
  for (const change of changes) {
    close(change.position.y, 200);
    close(change.position.z, 300);
  }
});

test('group rotation orbits the shared centre and rotates individual objects', () => {
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
  const changes = transformGroup(groupSnapshot(objects), new Vector3(), rotation);
  close(changes[0].position.x, 0);
  close(changes[0].position.z, 1000);
  close(changes[1].position.z, -1000);
  close(changes[0].position.y, 0);
  close(changes[0].rotation.y, 90);
});

test('drag snapshot is immutable across repeated transformations', () => {
  const snapshot = groupSnapshot(objects);
  transformGroup(snapshot, new Vector3(10, 0, 0));
  const changes = transformGroup(snapshot);
  close(changes[0].position.x, -1000);
  close(changes[1].position.x, 1000);
});
