import { Euler, Quaternion, Vector3 } from 'three';

export function groupSnapshot(objects) {
  const members = objects.map((object) => {
    const height = object.dimensions?.height ?? 500;
    return {
      id: object.id, height,
      center: new Vector3(object.position?.x ?? 0, (object.position?.y ?? 0) + height / 2, object.position?.z ?? 0).multiplyScalar(0.001),
      quaternion: new Quaternion().setFromEuler(new Euler(...['x', 'y', 'z'].map((axis) => (object.rotation?.[axis] ?? 0) * Math.PI / 180))),
    };
  });
  const pivot = members.reduce((sum, member) => sum.add(member.center), new Vector3()).divideScalar(Math.max(1, members.length));
  return { members, pivot };
}

export function transformGroup(snapshot, translation = new Vector3(), rotation = new Quaternion()) {
  return snapshot.members.map((member) => {
    const center = member.center.clone().sub(snapshot.pivot).applyQuaternion(rotation).add(snapshot.pivot).add(translation);
    const angles = new Euler().setFromQuaternion(rotation.clone().multiply(member.quaternion));
    return {
      id: member.id,
      position: { x: center.x * 1000, y: center.y * 1000 - member.height / 2, z: center.z * 1000 },
      rotation: { x: angles.x * 180 / Math.PI, y: angles.y * 180 / Math.PI, z: angles.z * 180 / Math.PI },
    };
  });
}
