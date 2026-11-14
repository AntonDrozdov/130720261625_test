import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const MM = 0.001;
const minimumSize = 10;

const dimensionsOf = (object) => ({
  length: Math.max(minimumSize, Number(object.dimensions?.length) || 1000),
  width: Math.max(minimumSize, Number(object.dimensions?.width) || 600),
  height: Math.max(minimumSize, Number(object.dimensions?.height) || 500),
});

const positionOf = (object) => ({
  x: Number(object.position?.x) || 0,
  y: Number(object.position?.y) || 0,
  z: Number(object.position?.z) || 0,
});

const shapeOf = (object) => object.type === 'sphere' ? 'sphere' : 'box';

const geometryKeyOf = (object) => {
  const { length, width, height } = dimensionsOf(object);
  return `${shapeOf(object)}:${length}:${width}:${height}`;
};

const geometryFor = (object) => {
  const { length, width, height } = dimensionsOf(object);
  if (shapeOf(object) === 'sphere') {
    const geometry = new THREE.SphereGeometry(1, 28, 18);
    geometry.scale(length * MM / 2, height * MM / 2, width * MM / 2);
    return geometry;
  }
  return new THREE.BoxGeometry(length * MM, height * MM, width * MM);
};

const rotationOf = (object) => ({
  x: Number(object.rotation?.x) || 0,
  y: Number(object.rotation?.y) || 0,
  z: Number(object.rotation?.z) || 0,
});

const findInteractiveParent = (object) => {
  let current = object;
  while (current) {
    if (current.userData.designObjectId || current.userData.resizeHandle) return current;
    current = current.parent;
  }
  return null;
};

function DesignEditor({ objects, selectedId, onSelect, onChange, onDelete, onAddObject }) {
  const mountRef = useRef(null);
  const sceneApiRef = useRef(null);
  const objectsRef = useRef(objects);
  const selectedIdRef = useRef(selectedId);
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  const onDeleteRef = useRef(onDelete);
  const [transformMode, setTransformMode] = useState('translate');

  objectsRef.current = objects;
  selectedIdRef.current = selectedId;
  onChangeRef.current = onChange;
  onSelectRef.current = onSelect;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    sceneApiRef.current?.sync(objects);
  }, [objects]);

  useEffect(() => {
    sceneApiRef.current?.select(selectedId);
  }, [selectedId]);

  useEffect(() => {
    sceneApiRef.current?.setMode(transformMode);
  }, [transformMode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef1eb');
    const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 2000);
    camera.position.set(3.2, 2.4, 4.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'design-canvas';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.target.set(0, 0.35, 0);

    scene.add(new THREE.HemisphereLight('#ffffff', '#80907a', 2.2));
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.6);
    keyLight.position.set(4, 7, 4);
    scene.add(keyLight);
    const grid = new THREE.GridHelper(12, 120, '#9ca698', '#d6dcd3');
    scene.add(grid);
    const axes = new THREE.AxesHelper(0.7);
    axes.position.y = 0.002;
    scene.add(axes);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    const meshes = new Map();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode('translate');
    const transformHelper = transform.getHelper();
    scene.add(transformHelper);

    let pointerStart = null;
    let resizeDrag = null;
    let transformStartRotation = null;
    let transformWasDragging = false;
    let hoveredHandle = null;

    const removeHandles = (mesh) => {
      const handles = mesh?.userData.handles;
      if (!handles) return;
      handles.traverse((item) => {
        item.geometry?.dispose?.();
        item.material?.dispose?.();
      });
      mesh.remove(handles);
      delete mesh.userData.handles;
    };

    const removeOutline = (mesh) => {
      const outline = mesh?.userData.outline;
      if (!outline) return;
      outline.traverse((item) => {
        item.geometry?.dispose?.();
        item.material?.dispose?.();
      });
      mesh.remove(outline);
      delete mesh.userData.outline;
    };

    const addOutline = (mesh, isSelected) => {
      removeOutline(mesh);
      const outline = new THREE.Group();
      if (isSelected && mesh.userData.shapeType !== 'sphere') {
        const { width, height, depth } = mesh.geometry.parameters;
        const half = { x: width / 2, y: height / 2, z: depth / 2 };
        const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new THREE.Vector3(x * half.x, y * half.y, z * half.z))));
        const pairs = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
        pairs.forEach(([startIndex, endIndex]) => {
          const start = corners[startIndex];
          const end = corners[endIndex];
          const direction = end.clone().sub(start);
          const edge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.014, 0.014, direction.length(), 8),
            new THREE.MeshBasicMaterial({ color: '#e2b52e', depthTest: true }),
          );
          edge.position.copy(start.clone().add(end).multiplyScalar(0.5));
          edge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
          outline.add(edge);
        });
      } else {
        outline.add(new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ color: isSelected ? '#e2b52e' : '#161616' }),
        ));
      }
      mesh.add(outline);
      mesh.userData.outline = outline;
    };

    const addHandles = (mesh, model) => {
      removeHandles(mesh);
      const { length, width, height } = dimensionsOf(model);
      const half = { x: length * MM / 2, y: height * MM / 2, z: width * MM / 2 };
      const group = new THREE.Group();
      const entries = [];
      const faceOffset = 0.016;
      const addFace = ({ key, normal, position, size, axes }) => {
        const material = new THREE.MeshBasicMaterial({ color: '#3f6e93', transparent: true, opacity: 0.055, depthWrite: false });
        const handle = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
        handle.position.set(position.x, position.y, position.z);
        handle.renderOrder = 2;
        handle.userData.resizeHandle = { axes, faces: [key], normal };
        entries.push({ key, material });
        group.add(handle);
      };

      [-1, 1].forEach((sign) => {
        const suffix = sign > 0 ? '+' : '-';
        addFace({ key: `x${suffix}`, normal: 'x', position: { x: sign * (half.x + faceOffset), y: 0, z: 0 }, size: { x: 0.025, y: half.y * 2, z: half.z * 2 }, axes: [{ axis: 'x', sign, drag: 'x' }] });
        addFace({ key: `y${suffix}`, normal: 'y', position: { x: 0, y: sign * (half.y + faceOffset), z: 0 }, size: { x: half.x * 2, y: 0.025, z: half.z * 2 }, axes: [{ axis: 'y', sign, drag: 'y' }] });
        addFace({ key: `z${suffix}`, normal: 'z', position: { x: 0, y: 0, z: sign * (half.z + faceOffset) }, size: { x: half.x * 2, y: half.y * 2, z: 0.025 }, axes: [{ axis: 'z', sign, drag: 'x' }] });
      });
      group.userData.setHoveredHandle = (hoveredHandle) => {
        const highlightedFaces = new Set(hoveredHandle?.userData.resizeHandle?.faces ?? []);
        entries.forEach((entry) => {
          const highlighted = highlightedFaces.has(entry.key);
          entry.material.color.set(highlighted ? '#e2b52e' : '#3f6e93');
          entry.material.opacity = highlighted ? 0.42 : 0.055;
        });
      };
      mesh.add(group);
      mesh.userData.handles = group;
    };

    const setHoveredHandle = (handle) => {
      if (hoveredHandle === handle) return;
      hoveredHandle?.parent?.userData.setHoveredHandle?.(null);
      hoveredHandle = handle;
      hoveredHandle?.parent?.userData.setHoveredHandle?.(hoveredHandle);
    };

    const syncMesh = (model) => {
      const dimensions = dimensionsOf(model);
      const position = positionOf(model);
      const rotation = rotationOf(model);
      let mesh = meshes.get(model.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          geometryFor(model),
          new THREE.MeshStandardMaterial({ color: model.color || '#f8f8f6', roughness: 0.72, metalness: 0.03 }),
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.designObjectId = model.id;
        mesh.userData.geometryKey = geometryKeyOf(model);
        mesh.userData.shapeType = shapeOf(model);
        modelGroup.add(mesh);
        meshes.set(model.id, mesh);
      } else {
        const geometryKey = geometryKeyOf(model);
        if (mesh.userData.geometryKey !== geometryKey) {
          mesh.geometry.dispose();
          mesh.geometry = geometryFor(model);
          mesh.userData.geometryKey = geometryKey;
          mesh.userData.shapeType = shapeOf(model);
        }
        mesh.material.color.set(model.color || '#f8f8f6');
      }
      mesh.visible = true;
      mesh.position.set(position.x * MM, (position.y + dimensions.height / 2) * MM, position.z * MM);
      mesh.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));
      if (model.id === selectedIdRef.current) {
        addOutline(mesh, true);
        addHandles(mesh, model);
      } else {
        addOutline(mesh, false);
        removeHandles(mesh);
      }
    };

    const sync = (models) => {
      const currentIds = new Set(models.map((model) => model.id));
      meshes.forEach((mesh, id) => {
        if (currentIds.has(id)) return;
        removeHandles(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        modelGroup.remove(mesh);
        meshes.delete(id);
      });
      models.forEach(syncMesh);
    };

    const select = (id) => {
      meshes.forEach((mesh, meshId) => {
        const model = objectsRef.current.find((object) => object.id === meshId);
        if (!model) return;
        mesh.visible = true;
        if (meshId === id) {
          addOutline(mesh, true);
          addHandles(mesh, model);
        } else {
          addOutline(mesh, false);
          removeHandles(mesh);
        }
      });
      const mesh = id ? meshes.get(id) : null;
      if (mesh) transform.attach(mesh);
      else transform.detach();
    };

    transform.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
      if (event.value && transform.getMode() === 'rotate' && transform.object) {
        transformStartRotation = transform.object.rotation.clone();
      }
      if (event.value) transformWasDragging = true;
      if (!event.value) transformStartRotation = null;
    });
    transform.addEventListener('objectChange', () => {
      const mesh = transform.object;
      const id = mesh?.userData.designObjectId;
      if (!id) return;
      if (transform.getMode() === 'rotate' && transformStartRotation) {
        const sensitivity = 0.35;
        mesh.rotation.set(
          transformStartRotation.x + (mesh.rotation.x - transformStartRotation.x) * sensitivity,
          transformStartRotation.y + (mesh.rotation.y - transformStartRotation.y) * sensitivity,
          transformStartRotation.z + (mesh.rotation.z - transformStartRotation.z) * sensitivity,
        );
      }
      const model = objectsRef.current.find((object) => object.id === id);
      if (!model) return;
      const dimensions = dimensionsOf(model);
      onChangeRef.current(id, {
        position: { x: mesh.position.x / MM, y: mesh.position.y / MM - dimensions.height / 2, z: mesh.position.z / MM },
        rotation: {
          x: THREE.MathUtils.radToDeg(mesh.rotation.x),
          y: THREE.MathUtils.radToDeg(mesh.rotation.y),
          z: THREE.MathUtils.radToDeg(mesh.rotation.z),
        },
      });
    });

    const setPointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (event) => {
      if (event.button !== 0) return;
      if (transform.axis !== null || transform.dragging) {
        setHoveredHandle(null);
        pointerStart = null;
        return;
      }
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(modelGroup.children, true);
      const interactive = intersections.map((result) => findInteractiveParent(result.object)).find(Boolean);
      pointerStart = { x: event.clientX, y: event.clientY, interactive };
      if (interactive?.userData.resizeHandle) {
        setHoveredHandle(interactive);
        const id = interactive.parent?.parent?.userData.designObjectId;
        const object = objectsRef.current.find((item) => item.id === id);
        if (!object) return;
        resizeDrag = {
          id, handle: interactive.userData.resizeHandle, start: pointerStart, dimensions: dimensionsOf(object),
          position: positionOf(object), rotation: rotationOf(object),
        };
        controls.enabled = false;
        renderer.domElement.setPointerCapture?.(event.pointerId);
      }
    };

    const handlePointerMove = (event) => {
      if (resizeDrag && (event.buttons & 1) === 0) {
        finishPointerDrag(event);
        return;
      }
      if (!resizeDrag) {
        if (transform.axis !== null || transform.dragging) {
          setHoveredHandle(null);
          return;
        }
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        const intersections = raycaster.intersectObjects(modelGroup.children, true);
        const interactive = intersections.map((result) => findInteractiveParent(result.object)).find(Boolean);
        setHoveredHandle(interactive?.userData.resizeHandle ? interactive : null);
        return;
      }
      const dx = (event.clientX - resizeDrag.start.x) * 4;
      const dy = (resizeDrag.start.y - event.clientY) * 4;
      const next = { ...resizeDrag.dimensions };
      const centerOffset = new THREE.Vector3();
      resizeDrag.handle.axes.forEach(({ axis, sign, drag }) => {
        const delta = (drag === 'y' ? dy : dx) * sign;
        const field = axis === 'x' ? 'length' : axis === 'y' ? 'height' : 'width';
        next[field] = Math.max(minimumSize, Math.round(resizeDrag.dimensions[field] + delta));
        const actualDelta = next[field] - resizeDrag.dimensions[field];
        centerOffset[axis] = sign * actualDelta / 2 * MM;
      });
      const rotation = new THREE.Euler(
        THREE.MathUtils.degToRad(resizeDrag.rotation.x),
        THREE.MathUtils.degToRad(resizeDrag.rotation.y),
        THREE.MathUtils.degToRad(resizeDrag.rotation.z),
      );
      centerOffset.applyEuler(rotation);
      const nextCenter = new THREE.Vector3(
        resizeDrag.position.x * MM,
        (resizeDrag.position.y + resizeDrag.dimensions.height / 2) * MM,
        resizeDrag.position.z * MM,
      ).add(centerOffset);
      onChangeRef.current(resizeDrag.id, {
        dimensions: next,
        position: { x: nextCenter.x / MM, y: nextCenter.y / MM - next.height / 2, z: nextCenter.z / MM },
      });
    };

    const finishPointerDrag = (event) => {
      if (!resizeDrag) return false;
      if (event?.pointerId !== undefined && renderer.domElement.hasPointerCapture?.(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      resizeDrag = null;
      pointerStart = null;
      controls.enabled = true;
      return true;
    };

    const handlePointerUp = (event) => {
      if (finishPointerDrag(event)) return;
      if (transformWasDragging) {
        transformWasDragging = false;
        pointerStart = null;
        return;
      }
      if (!pointerStart || event.button !== 0) return;
      const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      if (moved < 5) {
        const id = pointerStart.interactive?.userData.designObjectId;
        onSelectRef.current(id || null);
      }
      pointerStart = null;
    };

    const handlePointerLeave = () => {
      if (!resizeDrag) setHoveredHandle(null);
    };

    const handlePointerCancel = (event) => {
      finishPointerDrag(event);
      transformWasDragging = false;
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Delete' || !selectedIdRef.current) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
      event.preventDefault();
      onDeleteRef.current(selectedIdRef.current);
    };

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(360, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointercancel', handlePointerCancel);
    renderer.domElement.addEventListener('lostpointercapture', handlePointerCancel);
    renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('keydown', handleKeyDown);
    let frameId;
    const render = () => {
      frameId = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    sceneApiRef.current = { sync, select, setMode: (mode) => transform.setMode(mode) };
    sync(objectsRef.current);
    select(selectedIdRef.current);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
      renderer.domElement.removeEventListener('lostpointercapture', handlePointerCancel);
      window.removeEventListener('keydown', handleKeyDown);
      transform.dispose();
      scene.remove(transformHelper);
      controls.dispose();
      meshes.forEach((mesh) => { removeHandles(mesh); removeOutline(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer.dispose();
      mount.replaceChildren();
      sceneApiRef.current = null;
    };
  }, []);

  return <section className="design-editor">
    <div className="design-toolbar" aria-label="Инструменты сцены">
      <div className="design-create-tools">
        <button type="button" className="admin-button design-tool-button" onClick={() => onAddObject('box')} title="Добавить параллелепипед" aria-label="Добавить параллелепипед"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 8-4 8 4-8 4-8-4Zm0 1 8 4v7l-8-4V9Zm16 0v7l-8 4v-7l8-4Z" /></svg></button>
        <button type="button" className="admin-button design-tool-button" onClick={() => onAddObject('cube')} title="Добавить куб" aria-label="Добавить куб"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 7 7-4 7 4-7 4-7-4Zm0 2 7 4v8l-7-4V9Zm14 0v8l-7 4v-8l7-4Z" /></svg></button>
        <button type="button" className="admin-button design-tool-button" onClick={() => onAddObject('sphere')} title="Добавить шар" aria-label="Добавить шар"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3.5 3 12.5 0 16M12 4c-3 3.5-3 12.5 0 16" /></svg></button>
      </div>
      <div className="design-mode-switch" role="group" aria-label="Режим трансформации">
        <button type="button" className={transformMode === 'translate' ? 'is-active' : ''} onClick={() => setTransformMode('translate')}>Перемещение</button>
        <button type="button" className={transformMode === 'rotate' ? 'is-active' : ''} onClick={() => setTransformMode('rotate')}>Поворот</button>
      </div>
    </div>
    <div className="design-viewport" ref={mountRef} />
  </section>;
}

export default DesignEditor;
