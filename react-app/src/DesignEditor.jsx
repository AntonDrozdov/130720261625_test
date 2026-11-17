import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { coordinateAlignments, snapRotation, snapTranslation } from './designSnapping';
import { gizmoAnchor } from './designGizmo';
import { groupSnapshot, transformGroup } from './designGroup';
import { gridForBounds } from './designGrid';

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

function DesignEditor({ onUndo, undoCount, undoDisabled, onActionStart, onActionEnd, objects, selectedId, selectedIds, onSelect, onChange, onChangeMany, onDelete, onAddObject, onPasteObject, onAddCoffeeTable, onAddFirepitFurniture, onAddWorkshopFrame, onAddPool, onSaveScreenshot }) {
  const historyActionsRef = useRef(null);
  historyActionsRef.current = { onUndo, onActionStart, onActionEnd };
  const mountRef = useRef(null);
  const axisWidgetRef = useRef(null);
  const sceneApiRef = useRef(null);
  const frameNextAdditionRef = useRef(false);
  const objectsRef = useRef(objects);
  const selectedIdRef = useRef(selectedId);
  const selectedIdsRef = useRef(selectedIds);
  const onChangeManyRef = useRef(onChangeMany);
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  const onDeleteRef = useRef(onDelete);
  const onPasteObjectRef = useRef(onPasteObject);
  const [transformMode, setTransformMode] = useState('translate');
  const [rotationAlignment, setRotationAlignment] = useState(null);
  const [translationSnapped, setTranslationSnapped] = useState(false);
  const [keyboardAxisHint, setKeyboardAxisHint] = useState(null);
  const [displayOptions, setDisplayOptions] = useState({ labels: true, grid: true, axes: true });
  const [isScreenshotSaving, setIsScreenshotSaving] = useState(false);
  const [screenshotStatus, setScreenshotStatus] = useState('');
  const [screenshotError, setScreenshotError] = useState('');

  const saveScreenshot = async () => {
    if (isScreenshotSaving) return;
    setIsScreenshotSaving(true);
    setScreenshotStatus('');
    setScreenshotError('');
    try {
      const blob = await sceneApiRef.current.capture();
      const result = await onSaveScreenshot(blob);
      setScreenshotStatus(`Снимок сохранён: ${result.path}`);
    } catch (error) {
      setScreenshotError(error instanceof Error ? error.message : 'Не удалось сохранить снимок.');
    } finally {
      setIsScreenshotSaving(false);
    }
  };

  objectsRef.current = objects;
  selectedIdRef.current = selectedId;
  selectedIdsRef.current = selectedIds;
  onChangeManyRef.current = onChangeMany;
  onChangeRef.current = onChange;
  onSelectRef.current = onSelect;
  onDeleteRef.current = onDelete;
  onPasteObjectRef.current = onPasteObject;

  useEffect(() => {
    sceneApiRef.current?.sync(objects);
    if (frameNextAdditionRef.current) {
      frameNextAdditionRef.current = false;
      sceneApiRef.current?.frameSelection();
    }
  }, [objects]);

  useEffect(() => {
    setRotationAlignment(null);
    sceneApiRef.current?.select(selectedId);
  }, [selectedId, selectedIds]);

  useEffect(() => {
    setRotationAlignment(null);
    sceneApiRef.current?.setMode(transformMode);
  }, [transformMode]);

  useEffect(() => {
    sceneApiRef.current?.setDisplay(displayOptions);
  }, [displayOptions]);

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
    let grid = new THREE.GridHelper(12, 120, '#9ca698', '#d6dcd3');
    let gridSize = 12;
    scene.add(grid);
    const axes = new THREE.Group();
    const axisLines = ['#b83c32', '#368341', '#326cbb'].map((color, index) => {
      const direction = [0, 0, 0];
      direction[index] = 6;
      const line = new Line2(
        new LineGeometry().setPositions([0, 0, 0, ...direction]),
        new LineMaterial({ color, linewidth: 1.5, depthTest: false, depthWrite: false, toneMapped: false }),
      );
      line.frustumCulled = false;
      line.renderOrder = 900;
      axes.add(line);
      return line;
    });
    const origin = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]),
      new THREE.PointsMaterial({ color: '#30352f', size: 5, sizeAttenuation: false, depthTest: false, depthWrite: false }),
    );
    origin.renderOrder = 901;
    axes.add(origin);
    scene.add(axes);

    const createAlignmentIndicator = () => {
    const alignmentPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: '#4ca8df', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    alignmentPlane.visible = false;
    scene.add(alignmentPlane);
    const alignmentLine = new Line2(
      new LineGeometry().setPositions([0, 0, 0, 1, 0, 0]),
      new LineMaterial({ color: '#b83c32', linewidth: 1, dashed: true, dashSize: 0.08, gapSize: 0.05, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    alignmentLine.visible = false;
    alignmentLine.frustumCulled = false;
    alignmentLine.renderOrder = 1000;
    scene.add(alignmentLine);
    const alignmentLabelCanvas = document.createElement('canvas');
    alignmentLabelCanvas.width = 768;
    alignmentLabelCanvas.height = 128;
    const alignmentLabelTexture = new THREE.CanvasTexture(alignmentLabelCanvas);
    alignmentLabelTexture.colorSpace = THREE.SRGBColorSpace;
    const alignmentLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: alignmentLabelTexture, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false }));
    alignmentLabel.scale.set(0.3, 0.05, 1);
    alignmentLabel.center.set(0.5, 0);
    alignmentLabel.renderOrder = 1002;
    alignmentLabel.visible = false;
    scene.add(alignmentLabel);
    let alignmentLabelText = '';
    const showAlignmentPlane = (alignment, source) => {
      alignmentPlane.visible = Boolean(alignment);
      alignmentLine.visible = Boolean(alignment && !alignment.mesh);
      alignmentLabel.visible = alignmentLine.visible;
      if (!alignment) return;
      const normal = alignment.normal;
      if (alignment.mesh) {
        const target = alignment.mesh;
        const { length, height, width } = alignment.dimensions;
        const sizes = [length, height, width].map((size) => size * MM);
        const sign = source.position.clone().sub(target.position).dot(normal) >= 0 ? 1 : -1;
        alignmentPlane.position.copy(target.position).addScaledVector(normal, sign * (sizes[alignment.faceAxis] / 2 + 0.0005));
        const localNormal = new THREE.Vector3(alignment.faceAxis === 0 ? 1 : 0, alignment.faceAxis === 1 ? 1 : 0, alignment.faceAxis === 2 ? 1 : 0);
        const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal);
        alignmentPlane.quaternion.copy(target.quaternion).multiply(orientation);
        // Match PlaneGeometry's local X/Y directions after orienting it onto the face.
        const horizontal = new THREE.Vector3(1, 0, 0).applyQuaternion(orientation);
        const vertical = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
        const extent = (direction) => Math.abs(direction.x) * sizes[0] + Math.abs(direction.y) * sizes[1] + Math.abs(direction.z) * sizes[2];
        alignmentPlane.scale.set(extent(horizontal), extent(vertical), 1);
      } else {
        alignmentPlane.visible = false;
        const color = Math.abs(normal.x) > 0.9 ? '#b83c32' : Math.abs(normal.y) > 0.9 ? '#368341' : '#326cbb';
        alignmentLine.material.color.set(color);
        const size = dimensionsOf(objectsRef.current.find((object) => object.id === source.userData.designObjectId));
        const sizes = [size.length, size.height, size.width].map((value) => value * MM);
        const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)].map((axis) => axis.applyQuaternion(source.quaternion));
        // Indicate the object's alignment through its centre, independent of either face.
        const center = source.position.clone();
        const view = camera.position.clone().sub(center).normalize();
        const tangents = axes.map((direction, index) => ({ direction, index })).filter(({ index }) => index !== alignment.sourceAxis);
        tangents.sort((a, b) => Math.abs(a.direction.dot(view)) - Math.abs(b.direction.dot(view)));
        const { direction, index } = tangents[0];
        const halfLength = sizes[index] / 2 + Math.max(0.25, sizes[index] * 0.4);
        const start = center.clone().addScaledVector(direction, -halfLength);
        const end = center.clone().addScaledVector(direction, halfLength);
        alignmentLine.geometry.setPositions([...start.toArray(), ...end.toArray()]);
        alignmentLine.computeLineDistances();
        alignmentLabel.position.copy(end);
        const text = `∥ Плоскость ${alignment.label}`;
        if (text !== alignmentLabelText) {
          alignmentLabelText = text;
          const context = alignmentLabelCanvas.getContext('2d');
          context.clearRect(0, 0, 768, 128);
          context.fillStyle = 'rgba(255,255,255,0.97)';
          context.strokeStyle = color;
          context.lineWidth = 3;
          context.beginPath();
          context.roundRect(4, 12, 760, 104, 18);
          context.fill();
          context.stroke();
          context.font = '600 42px Arial, sans-serif';
          context.fillStyle = color;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(text, 384, 66);
          alignmentLabelTexture.needsUpdate = true;
        }
      }
    };


      return {
        show: showAlignmentPlane,
        hide: () => { alignmentPlane.visible = false; alignmentLine.visible = false; alignmentLabel.visible = false; },
        resize: (width, height) => alignmentLine.material.resolution.set(width, height),
        dispose: () => { alignmentPlane.geometry.dispose(); alignmentPlane.material.dispose(); alignmentLine.geometry.dispose(); alignmentLine.material.dispose(); alignmentLabelTexture.dispose(); alignmentLabel.material.dispose(); },
      };
    };
    const alignmentIndicators = Array.from({ length: 3 }, createAlignmentIndicator);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    const meshes = new Map();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const transform = new TransformControls(camera, renderer.domElement);
    const gizmoProxy = new THREE.Object3D();
    scene.add(gizmoProxy);
    let gizmoDragStart = null;
    let modelDragStart = null;
    let gizmoMovementScale = 1;
    let groupDragSnapshot = null;
    let groupDragQuaternion = null;
    const updateGizmoAnchor = (mesh) => {
      if (transform.dragging) return;
      const group = selectedIdsRef.current.length > 1;
      const snapshot = group ? groupSnapshot(objectsRef.current.filter((object) => selectedIdsRef.current.includes(object.id))) : null;
      const anchor = gizmoAnchor(snapshot ? snapshot.pivot : mesh.position, camera, mount.clientWidth, mount.clientHeight);
      gizmoProxy.position.copy(anchor.position);
      gizmoProxy.quaternion.copy(group ? new THREE.Quaternion() : mesh.quaternion);
      gizmoMovementScale = anchor.movementScale;
      gizmoProxy.updateMatrixWorld();
    };
    transform.setMode('translate');
    // Only axis arrows are available for translation; plane and free dragging are hidden.
    transform.showXY = false;
    transform.showYZ = false;
    transform.showXZ = false;
    transform.showXYZE = false;
    const transformHelper = transform.getHelper();
    // Gizmos stay in front of model geometry and retain a useful screen size.
    transformHelper.traverse((part) => {
      part.frustumCulled = false;
      if (!part.material) return;
      const materials = Array.isArray(part.material) ? part.material : [part.material];
      materials.forEach((material) => {
        material.depthTest = false;
        material.depthWrite = false;
      });
      part.renderOrder = Infinity;
    });
    scene.add(transformHelper);

    let pointerStart = null;
    let resizeDrag = null;
    let transformStartRotation = null;
    let previousTranslationPosition = null;
    let translationLatch = null;
    let transformWasDragging = false;
    let hoveredHandle = null;
    let currentMode = 'translate';
    let keyboardAxis = null;
    let activeRotationAlignment = null;
    let displayedAlignmentLabel = null;
    let copiedObject = null;
    let pasteCount = 0;

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
      const existing = mesh.userData.outline;
      if (existing?.userData.sourceGeometry === mesh.geometry) {
        existing.children[0].material.color.set(isSelected ? '#000000' : '#707570');
        return;
      }
      removeOutline(mesh);
      const outline = new THREE.Group();
      outline.userData.sourceGeometry = mesh.geometry;
      outline.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: isSelected ? '#000000' : '#707570', depthTest: true }),
      ));
      mesh.add(outline);
      mesh.userData.outline = outline;
    };

    const addHandles = (mesh, model) => {
      if (currentMode !== 'scale' || selectedIdsRef.current.length > 1) {
        removeHandles(mesh);
        return;
      }
      if (mesh.userData.handles?.userData.sourceGeometry === mesh.geometry) return;
      removeHandles(mesh);
      const { length, width, height } = dimensionsOf(model);
      const half = { x: length * MM / 2, y: height * MM / 2, z: width * MM / 2 };
      const group = new THREE.Group();
      group.userData.sourceGeometry = mesh.geometry;
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
      if (selectedIdsRef.current.includes(model.id)) {
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
        removeOutline(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        modelGroup.remove(mesh);
        meshes.delete(id);
      });
      models.forEach(syncMesh);
      const bounds = new THREE.Box3();
      meshes.forEach((mesh) => {
        mesh.updateMatrixWorld();
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
      });
      const specification = gridForBounds(bounds);
      if (specification.size > gridSize) {
        const visible = grid.visible;
        scene.remove(grid);
        grid.geometry.dispose();
        grid.material.dispose();
        grid = new THREE.GridHelper(specification.size, specification.divisions, '#9ca698', '#d6dcd3');
        grid.visible = visible;
        gridSize = specification.size;
        scene.add(grid);
      }
    };

    const select = (id) => {
      keyboardAxis = null;
      setKeyboardAxisHint(null);
      translationLatch = null;
      setTranslationSnapped(false);
      activeRotationAlignment = null;
      alignmentIndicators.forEach((indicator) => indicator.hide());
      const modelsById = new Map(objectsRef.current.map((model) => [model.id, model]));
      const selection = new Set(selectedIdsRef.current);
      meshes.forEach((mesh, meshId) => {
        const model = modelsById.get(meshId);
        if (!model) return;
        mesh.visible = true;
        if (selection.has(meshId)) {
          addOutline(mesh, true);
          addHandles(mesh, model);
        } else {
          addOutline(mesh, false);
          removeHandles(mesh);
        }
      });
      const mesh = id ? meshes.get(id) : null;
      if (mesh && currentMode !== 'scale') {
        updateGizmoAnchor(mesh);
        transform.attach(gizmoProxy);
      }
      else transform.detach();
    };

    transform.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
      if (event.value) historyActionsRef.current.onActionStart();
      else historyActionsRef.current.onActionEnd();
      const mesh = meshes.get(selectedIdRef.current);
      if (event.value && mesh) {
        gizmoDragStart = gizmoProxy.position.clone();
        modelDragStart = mesh.position.clone();
        groupDragSnapshot = selectedIdsRef.current.length > 1
          ? groupSnapshot(objectsRef.current.filter((object) => selectedIdsRef.current.includes(object.id))) : null;
        groupDragQuaternion = gizmoProxy.quaternion.clone();
      }
      if (event.value && ['X', 'Y', 'Z'].includes(transform.axis) && ['translate', 'rotate'].includes(currentMode)) {
        keyboardAxis = transform.axis;
        setKeyboardAxisHint(`${currentMode === 'rotate' ? 'Поворот' : 'Перемещение'} ${keyboardAxis}: ← ↓ / → ↑ · Shift — крупный шаг`);
      }
      translationLatch = null;
      setTranslationSnapped(false);
      previousTranslationPosition = event.value && transform.getMode() === 'translate'
        ? mesh?.position.clone() ?? null : null;
      if (event.value && transform.getMode() === 'rotate' && mesh) {
        transformStartRotation = mesh.rotation.clone();
      }
      if (event.value) transformWasDragging = true;
      if (!event.value) transformStartRotation = null;
    });
    transform.addEventListener('objectChange', () => {
      const mesh = meshes.get(selectedIdRef.current);
      const id = mesh?.userData.designObjectId;
      if (!id) return;
      if (groupDragSnapshot && transform.dragging) {
        const translation = transform.getMode() === 'translate'
          ? gizmoProxy.position.clone().sub(gizmoDragStart).multiplyScalar(gizmoMovementScale) : new THREE.Vector3();
        const rotation = transform.getMode() === 'rotate'
          ? new THREE.Quaternion().slerp(gizmoProxy.quaternion.clone().multiply(groupDragQuaternion.clone().invert()), 0.35) : new THREE.Quaternion();
        onChangeManyRef.current(transformGroup(groupDragSnapshot, translation, rotation));
        return;
      }
      if (transform.getMode() === 'translate' && gizmoDragStart && modelDragStart) {
        mesh.position.copy(gizmoProxy.position).sub(gizmoDragStart).multiplyScalar(gizmoMovementScale).add(modelDragStart);
      } else if (transform.getMode() === 'rotate') {
        mesh.quaternion.copy(gizmoProxy.quaternion);
      }
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
      if (transform.getMode() === 'rotate') {
        const targets = objectsRef.current
          .filter((object) => object.id !== id && shapeOf(object) !== 'sphere' && meshes.has(object.id))
          .map((object) => ({ mesh: meshes.get(object.id), name: object.name, dimensions: dimensionsOf(object) }));
        const alignment = shapeOf(model) === 'sphere' ? null : snapRotation(mesh, transform.axis, targets);
        activeRotationAlignment = alignment;
      }
      if (transform.getMode() === 'translate' && shapeOf(model) !== 'sphere') {
        const targets = objectsRef.current
          .filter((object) => object.id !== id && shapeOf(object) !== 'sphere' && meshes.has(object.id))
          .map((object) => ({ mesh: meshes.get(object.id), dimensions: dimensionsOf(object) }));
        const rawPosition = mesh.position.clone();
        const axis = transform.axis?.toLowerCase();
        let snapped = false;
        if (translationLatch && ['x', 'y', 'z'].includes(axis)) {
          if (Math.abs(rawPosition[axis] - translationLatch[axis]) <= 0.03) {
            mesh.position[axis] = translationLatch[axis];
            snapped = true;
          } else {
            // Release once the pointer clearly leaves the magnetic zone.
            translationLatch = null;
          }
        } else {
          snapped = snapTranslation(mesh, dimensions, transform.axis, targets, previousTranslationPosition);
          if (snapped) translationLatch = mesh.position.clone();
        }
        setTranslationSnapped(snapped);
        previousTranslationPosition = rawPosition;
      }
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
      setPointer(event);
      // Refresh the gizmo hit before deciding whether this is a canvas click.
      // Hover state can otherwise refer to the previous pointer position.
      if (transform.enabled && !transform.dragging) transform.pointerHover({ x: pointer.x, y: pointer.y, button: event.button });
      // Each click is independent of the previous transform gesture.
      transformWasDragging = transform.dragging;
      if (transform.axis !== null || transform.dragging) {
        setHoveredHandle(null);
        pointerStart = null;
        return;
      }
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      // Pick actual model surfaces only: edge lines and transparent resize helpers
      // must never extend an object's clickable area.
      const surface = raycaster.intersectObjects(modelGroup.children, false)[0];
      const intersections = currentMode === 'scale' && surface
        ? raycaster.intersectObject(surface.object, true) : [];
      const handleHit = intersections.find((result) => result.object.userData.resizeHandle);
      const interactive = handleHit?.object;
      pointerStart = { x: event.clientX, y: event.clientY, objectId: surface?.object.userData.designObjectId, additive: event.ctrlKey || event.metaKey };
      if (currentMode === 'scale' && interactive?.userData.resizeHandle) {
        setHoveredHandle(interactive);
        const id = interactive.parent?.parent?.userData.designObjectId;
        const object = objectsRef.current.find((item) => item.id === id);
        if (!object) return;
        const axis = interactive.userData.resizeHandle.normal;
        const direction = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
        direction.applyQuaternion(meshes.get(id).quaternion);
        // A plane containing the face normal maps pointer movement onto that normal in world space.
        const planeNormal = camera.getWorldDirection(new THREE.Vector3());
        planeNormal.addScaledVector(direction, -planeNormal.dot(direction));
        if (planeNormal.lengthSq() < 0.000001) return;
        planeNormal.normalize();
        const hit = handleHit;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, hit.point);
        historyActionsRef.current.onActionStart();
        resizeDrag = {
          id, handle: interactive.userData.resizeHandle, start: pointerStart, dimensions: dimensionsOf(object),
          position: positionOf(object), rotation: rotationOf(object),
          direction, plane, startPoint: hit.point.clone(),
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
        const surface = raycaster.intersectObjects(modelGroup.children, false)[0];
        const handleHit = currentMode === 'scale' && surface
          ? raycaster.intersectObject(surface.object, true).find((result) => result.object.userData.resizeHandle) : null;
        setHoveredHandle(handleHit?.object ?? null);
        return;
      }
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const point = raycaster.ray.intersectPlane(resizeDrag.plane, new THREE.Vector3());
      if (!point) return;
      const distance = point.sub(resizeDrag.startPoint).dot(resizeDrag.direction) / MM;
      const next = { ...resizeDrag.dimensions };
      const centerOffset = new THREE.Vector3();
      resizeDrag.handle.axes.forEach(({ axis, sign }) => {
        const delta = distance * sign;
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
      historyActionsRef.current.onActionEnd();
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
        const id = pointerStart.objectId;
        if (!id) {
          setHoveredHandle(null);
          alignmentIndicators.forEach((indicator) => indicator.hide());
          setRotationAlignment(null);
          transform.detach();
        }
        onSelectRef.current(id || null, pointerStart.additive);
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
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
        if (transform.dragging || resizeDrag) return;
        if (event.code === 'KeyZ') {
          event.preventDefault();
          if (!event.repeat) historyActionsRef.current.onUndo();
          return;
        }
        if (event.code === 'KeyC' || event.key.toLowerCase() === 'c') {
          const model = objectsRef.current.find((object) => object.id === selectedIdRef.current);
          if (model) {
            event.preventDefault();
            copiedObject = structuredClone(model);
            pasteCount = 0;
          }
          return;
        }
        if ((event.code === 'KeyV' || event.key.toLowerCase() === 'v') && copiedObject) {
          event.preventDefault();
          if (!event.repeat) onPasteObjectRef.current(copiedObject, ++pasteCount * 100);
          return;
        }
      }
      if (!selectedIdRef.current) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) {
        if (!keyboardAxis || transform.dragging || !['translate', 'rotate'].includes(currentMode)) return;
        const model = objectsRef.current.find((object) => object.id === selectedIdRef.current);
        if (!model) return;
        event.preventDefault();
        const sign = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1;
        const axis = keyboardAxis.toLowerCase();
        if (selectedIdsRef.current.length > 1) {
          const snapshot = groupSnapshot(objectsRef.current.filter((object) => selectedIdsRef.current.includes(object.id)));
          const direction = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
          const translation = currentMode === 'translate' ? direction.clone().multiplyScalar(sign * (event.shiftKey ? 10 : 1) * MM) : new THREE.Vector3();
          const rotation = currentMode === 'rotate'
            ? new THREE.Quaternion().setFromAxisAngle(direction, THREE.MathUtils.degToRad(sign * (event.shiftKey ? 15 : 1))) : new THREE.Quaternion();
          onChangeManyRef.current(transformGroup(snapshot, translation, rotation));
          return;
        }
        if (currentMode === 'translate') {
          const position = positionOf(model);
          position[axis] += sign * (event.shiftKey ? 10 : 1);
          onChangeRef.current(model.id, { position });
        } else {
          const rotation = rotationOf(model);
          const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...['x', 'y', 'z'].map((key) => THREE.MathUtils.degToRad(rotation[key]))));
          const direction = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
          quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(direction, THREE.MathUtils.degToRad(sign * (event.shiftKey ? 15 : 1))));
          const result = new THREE.Euler().setFromQuaternion(quaternion);
          onChangeRef.current(model.id, { rotation: { x: THREE.MathUtils.radToDeg(result.x), y: THREE.MathUtils.radToDeg(result.y), z: THREE.MathUtils.radToDeg(result.z) } });
        }
        return;
      }
      if (event.key !== 'Delete') return;
      if (transform.dragging || resizeDrag) return;
      event.preventDefault();
      onDeleteRef.current(selectedIdsRef.current);
    };

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(360, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      // TransformControls already compensates for camera distance. Also compensate
      // for viewport height so the visible axis length stays about 150 pixels.
      transform.setSize(640 / height);
      axisLines.forEach((line) => line.material.resolution.set(width, height));
      alignmentIndicators.forEach((indicator) => indicator.resize(width, height));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    renderer.domElement.addEventListener('pointerdown', handlePointerDown, true);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp, true);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointercancel', handlePointerCancel);
    renderer.domElement.addEventListener('lostpointercapture', handlePointerCancel);
    renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('keydown', handleKeyDown);
    let frameId;
    const render = () => {
      frameId = requestAnimationFrame(render);
      controls.update();
      if (axisWidgetRef.current) {
        const inverseCamera = camera.quaternion.clone().invert();
        const directions = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
        directions.forEach((direction, index) => {
          direction.applyQuaternion(inverseCamera);
          const group = axisWidgetRef.current.children[index];
          const x = 48 + direction.x * 29;
          const y = 48 - direction.y * 29;
          group.children[0].setAttribute('x2', x);
          group.children[0].setAttribute('y2', y);
          group.children[1].setAttribute('x', 48 + direction.x * 39);
          group.children[1].setAttribute('y', 48 - direction.y * 39);
        });
      }
      const selectedMesh = meshes.get(selectedIdRef.current);
      if (selectedMesh && currentMode !== 'scale') updateGizmoAnchor(selectedMesh);
      const isRotating = currentMode === 'rotate' && transform.dragging;
      const alignments = isRotating && selectedMesh && selectedMesh.userData.shapeType !== 'sphere'
        ? coordinateAlignments(selectedMesh) : [];
      if (!alignments.length && isRotating && selectedMesh && activeRotationAlignment) alignments.push(activeRotationAlignment);
      alignmentIndicators.forEach((indicator, index) => indicator.show(alignments[index] ?? null, selectedMesh));
      const label = alignments.map((alignment) => alignment.label).join(' / ') || null;
      if (label !== displayedAlignmentLabel) {
        displayedAlignmentLabel = label;
        setRotationAlignment(label);
      }
      renderer.render(scene, camera);
    };
    render();

    sceneApiRef.current = { sync, select, capture: () => {
      const hidden = [transformHelper, ...[...meshes.values()].map((mesh) => mesh.userData.handles).filter(Boolean)];
      const visibility = hidden.map((object) => object.visible);
      hidden.forEach((object) => { object.visible = false; });
      alignmentIndicators.forEach((indicator) => indicator.hide());
      try {
        // Render and read in the same task; no persistent drawing buffer is needed.
        renderer.render(scene, camera);
        return new Promise((resolve, reject) => renderer.domElement.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Не удалось сформировать PNG-снимок.'));
        }, 'image/png'));
      } finally {
        hidden.forEach((object, index) => { object.visible = visibility[index]; });
      }
    }, frameSelection: () => {
      const bounds = new THREE.Box3();
      selectedIdsRef.current.forEach((id) => {
        const mesh = meshes.get(id);
        if (mesh) bounds.union(new THREE.Box3().setFromObject(mesh));
      });
      if (bounds.isEmpty()) return;
      const center = bounds.getCenter(new THREE.Vector3());
      const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
      const direction = camera.position.clone().sub(controls.target).normalize();
      const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
      camera.position.copy(center).addScaledVector(direction, radius / Math.sin(halfFov) * 1.15);
      controls.target.copy(center);
      controls.update();
    }, setDisplay: (options) => {
      grid.visible = options.grid;
      axes.visible = options.axes;
    }, setMode: (mode) => {
      finishPointerDrag();
      setHoveredHandle(null);
      currentMode = mode;
      activeRotationAlignment = null;
      transform.enabled = mode !== 'scale';
      if (mode !== 'scale') transform.setMode(mode);
      select(selectedIdRef.current);
    } };
    sync(objectsRef.current);
    select(selectedIdRef.current);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown, true);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp, true);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
      renderer.domElement.removeEventListener('lostpointercapture', handlePointerCancel);
      window.removeEventListener('keydown', handleKeyDown);
      transform.dispose();
      scene.remove(transformHelper);
      alignmentIndicators.forEach((indicator) => indicator.dispose());
      axes.traverse((part) => { part.geometry?.dispose(); part.material?.dispose(); });
      grid.geometry.dispose();
      grid.material.dispose();
      controls.dispose();
      meshes.forEach((mesh) => { removeHandles(mesh); removeOutline(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer.dispose();
      mount.replaceChildren();
      sceneApiRef.current = null;
    };
  }, []);

  return <section className="design-editor">
    <div className="design-create-toolbar" aria-label="Создание объектов">
      <div className="design-create-tools">
        <button type="button" className="admin-button design-tool-button" aria-label="Добавить бассейн 3×3 м, глубина 2 м" title="Бассейн 3×3 м внутри, глубина 2 м, стенки 20 см" onClick={() => { frameNextAdditionRef.current = true; onAddPool(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 8 9-4 9 4-9 4-9-4ZM3 8v9l9 4 9-4V8M12 12v9M7 10v5l5 2 5-2v-5" /></svg></button>
        <button type="button" className="admin-button design-tool-button" aria-label="Сохранить снимок канвы" onClick={() => void saveScreenshot()} disabled={isScreenshotSaving} title={isScreenshotSaving ? 'Сохраняем снимок…' : 'Сохранить PNG в папку screenshots'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h4l2-3h6l2 3h4v13H3Z" /><circle cx="12" cy="13" r="4" /></svg></button>
        <button type="button" className="admin-button design-tool-button" aria-label="Каркас мастерской 6×8 м" onClick={() => { frameNextAdditionRef.current = true; onAddWorkshopFrame(); }} title="Эскиз металлического каркаса 6×8 м: двускатная крыша, ворота, дверь и окна"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V9l9-6 9 6v12M3 9h18M3 21h18M7 21V12h6v9M16 12h3v4h-3zM3 9l9 12 9-12M12 3v6" /></svg></button>
        <button type="button" className="admin-button design-tool-button" onClick={() => onAddObject('box')} title="Добавить параллелепипед" aria-label="Добавить параллелепипед"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 8-4 8 4-8 4-8-4Zm0 1 8 4v7l-8-4V9Zm16 0v7l-8 4v-7l8-4Z" /></svg></button>
        <button type="button" className="admin-button design-tool-button" onClick={() => onAddObject('cube')} title="Добавить куб" aria-label="Добавить куб"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 7 7-4 7 4-7 4-7-4Zm0 2 7 4v8l-7-4V9Zm14 0v8l-7 4v-8l7-4Z" /></svg></button>
        <button type="button" className="admin-button design-tool-button" onClick={() => onAddObject('sphere')} title="Добавить шар" aria-label="Добавить шар"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3.5 3 12.5 0 16M12 4c-3 3.5-3 12.5 0 16" /></svg></button>
        <button type="button" className="admin-button design-tool-button design-table-button" aria-label="Журнальный стол" onClick={onAddCoffeeTable} title="Создать журнальный стол 1000×500×500 мм"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 12-3 6 4-12 3-6-4ZM3 7v3l6 4 12-3V8M5 11v9M9 14v7M18 12v7M20 11v7" /></svg></button>
        <button type="button" className="admin-button design-tool-button" aria-label="Комплект мебели у костра" onClick={() => { frameNextAdditionRef.current = true; onAddFirepitFurniture(); }} title="Четыре кресла и стол 1000×500×300 мм вокруг места для костра"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 15c-2-2 0-4 2-6 0 2 3 3 3 5a3 3 0 0 1-5 1ZM2 4l2 6h4M4 10v6M8 10v6M22 4l-2 6h-4M20 10v6M16 10v6M7 20h10M9 20v2M15 20v2" /></svg></button>
      </div>
    </div>
    {screenshotStatus && <p className="design-screenshot-status" role="status">{screenshotStatus}</p>}
    {screenshotError && <p className="admin-error design-screenshot-status" role="alert">{screenshotError}</p>}
    <div className="design-canvas-area">
    {keyboardAxisHint && <div className="design-keyboard-hint">{keyboardAxisHint}</div>}
    {(displayOptions.axes || displayOptions.labels) && <svg ref={axisWidgetRef} className="design-axis-widget" viewBox="0 0 96 96" role="img" aria-label="Направления координатных осей X, Y, Z">
      {['X', 'Y', 'Z'].map((axis, index) => <g key={axis} fill={['#b83c32', '#368341', '#326cbb'][index]} stroke={['#b83c32', '#368341', '#326cbb'][index]}>
        <line x1="48" y1="48" x2="48" y2="48" strokeWidth="1.5" visibility={displayOptions.axes ? 'visible' : 'hidden'} />
        <text x="48" y="48" stroke="none" textAnchor="middle" dominantBaseline="central" visibility={displayOptions.labels ? 'visible' : 'hidden'}>{axis}</text>
      </g>)}
    </svg>}
    {translationSnapped && <div className="design-alignment-hint" role="status">⌖ Привязка к плоскости — потяните дальше, чтобы отпустить</div>}
    {rotationAlignment && <div className="design-alignment-hint" role="status">∥ Грань параллельна: {rotationAlignment}</div>}
    <div className="design-toolbar" aria-label="Инструменты сцены">
      <div className="design-mode-switch" role="group" aria-label="Режим трансформации">
        <button type="button" className="design-tool-button" title={`Отменить последнее действие (Ctrl+Z) · ${undoCount}/10`} aria-label="Отменить последнее действие" disabled={!undoCount || undoDisabled} onClick={onUndo}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 3 11l6 6M3 11h11a7 7 0 0 1 7 7" /></svg></button>
        <button type="button" className="design-tool-button" title="Снять выделение" aria-label="Снять выделение" onClick={() => { setRotationAlignment(null); onSelect(null); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 3 14 9-7 1-3 7-4-17Z" /></svg></button>
        <button type="button" className={`design-tool-button${transformMode === 'translate' ? ' is-active' : ''}`} aria-pressed={transformMode === 'translate'} title="Перемещение" aria-label="Перемещение" onClick={() => setTransformMode('translate')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></svg></button>
        <button type="button" className={`design-tool-button${transformMode === 'rotate' ? ' is-active' : ''}`} aria-pressed={transformMode === 'rotate'} title="Поворот" aria-label="Поворот" onClick={() => setTransformMode('rotate')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6" /><circle cx="12" cy="12" r="2" /></svg></button>
        <button type="button" className={`design-tool-button${transformMode === 'scale' ? ' is-active' : ''}`} aria-pressed={transformMode === 'scale'} title="Масштабирование — потяните за грань" aria-label="Масштабирование" onClick={() => setTransformMode('scale')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-8 8M10 20H4v-6M4 20l8-8" /><path d="M4 10V4h6M20 14v6h-6" /></svg></button>
      </div>
      <div className="design-display-switch" role="group" aria-label="Отображение сцены">
        <button type="button" className={`design-tool-button${displayOptions.labels ? ' is-active' : ''}`} aria-pressed={displayOptions.labels} title="Подписи осей X/Y/Z" aria-label="Подписи осей X/Y/Z" onClick={() => setDisplayOptions((current) => ({ ...current, labels: !current.labels }))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 5 6 8M9 5l-6 8M13 5l3 4 3-4M16 9v5M13 18h7l-7 4h7" /></svg></button>
        <button type="button" className={`design-tool-button${displayOptions.grid ? ' is-active' : ''}`} aria-pressed={displayOptions.grid} title="Сетка" aria-label="Сетка" onClick={() => setDisplayOptions((current) => ({ ...current, grid: !current.grid }))}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg></button>
        <button type="button" className={`design-tool-button${displayOptions.axes ? ' is-active' : ''}`} aria-pressed={displayOptions.axes} title="Координатные оси" aria-label="Координатные оси" onClick={() => setDisplayOptions((current) => ({ ...current, axes: !current.axes }))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17V3M4 6l3-3 3 3M7 17h14M18 14l3 3-3 3M7 17l-4 4M3 18v3h3" /></svg></button>
      </div>
    </div>
    <div className="design-viewport" ref={mountRef} />
    </div>
  </section>;
}

export default DesignEditor;
