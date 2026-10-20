/**
 * Shared procedural scenery builders.
 *
 * A station composes these pieces (platform, canopy, track bed, trees, city
 * blocks...) inside its own group, then returns colliders and a surface-height
 * query to the player controller.
 */
import * as THREE from 'three';
import {
  canvasTexture,
  createAsphaltTexture,
  createBallastTexture,
  createBuildingTexture,
  createConcreteTexture,
  createCrossingSignTexture,
  createDappleTexture,
  createGrassTexture,
  createHazardTexture,
  createPlatformTexture,
  createPosterTexture,
  createRoofTexture,
  createStationSignTexture,
  createTactileTexture,
  createTimetableTexture,
  createWoodTexture
} from './textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function standardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.88,
    metalness: options.metalness ?? 0,
    map: options.map ?? null,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    flatShading: options.flatShading ?? false
  });
}

export function addBox(parent, width, height, depth, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
  mesh.castShadow = options.cast ?? true;
  mesh.receiveShadow = options.receive ?? true;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
}

export function addPlane(parent, width, height, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(options.rx ?? -Math.PI / 2, options.ry ?? 0, options.rz ?? 0);
  mesh.castShadow = options.cast ?? false;
  mesh.receiveShadow = options.receive ?? true;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
}

export function addCylinder(parent, radiusTop, radiusBottom, height, material, x, y, z, options = {}) {
  const geometry = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    options.radialSegments ?? 10,
    options.heightSegments ?? 1,
    options.openEnded ?? false
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
  mesh.castShadow = options.cast ?? true;
  mesh.receiveShadow = options.receive ?? true;
  parent.add(mesh);
  return mesh;
}

export function addSphere(parent, radius, material, x, y, z, options = {}) {
  const geometry = new THREE.SphereGeometry(radius, options.segments ?? 12, options.segments ?? 8);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(options.sx ?? 1, options.sy ?? 1, options.sz ?? 1);
  mesh.castShadow = options.cast ?? true;
  mesh.receiveShadow = options.receive ?? false;
  parent.add(mesh);
  return mesh;
}

export function addCylinderBetween(parent, start, end, radius, material, radialSegments = 6) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length < 1e-5) return null;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, radialSegments),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/* -------------------------------------------------------------------------- */
/* Railway infrastructure                                                     */
/* -------------------------------------------------------------------------- */

export function createTracks(parent, {
  nearZ = -2.4,
  farZ = -6.0,
  xMin = -115,
  xMax = 115,
  sleeperSpacing = 0.72,
  ballastWidth = 9.1
} = {}) {
  const length = xMax - xMin;
  const centerX = (xMin + xMax) / 2;
  const centerZ = (nearZ + farZ) / 2;

  const ballastTexture = createBallastTexture(Math.max(4, Math.round(length / 5)), 2);
  const ballastMaterial = standardMaterial(0xffffff, { map: ballastTexture, roughness: 1 });
  const ballast = addPlane(parent, length, ballastWidth, ballastMaterial, centerX, 0.015, centerZ, {
    receive: true
  });
  ballast.name = 'Ballast';

  // A dark shoulder keeps the bed visually grounded.
  const shoulderMat = standardMaterial(0x5b574f, { roughness: 1 });
  addPlane(parent, length, 0.9, shoulderMat, centerX, 0.011, nearZ + 3.1, { receive: true });
  addPlane(parent, length, 0.7, shoulderMat, centerX, 0.011, farZ - 3.1, { receive: true });

  const sleeperGeometry = new THREE.BoxGeometry(0.27, 0.12, 1.9);
  const sleeperMaterial = standardMaterial(0xffffff, { roughness: 0.94 });
  const sleepersPerTrack = Math.floor(length / sleeperSpacing);
  const sleepers = new THREE.InstancedMesh(
    sleeperGeometry,
    sleeperMaterial,
    sleepersPerTrack * 2
  );
  sleepers.castShadow = true;
  sleepers.receiveShadow = true;
  sleepers.name = 'Sleepers';
  let sleeperIndex = 0;
  const sleeperColors = [0x66584a, 0x746452, 0x5b5145, 0x7b6c58];
  for (const z of [nearZ, farZ]) {
    for (let i = 0; i < sleepersPerTrack; i += 1) {
      const x = xMin + i * sleeperSpacing + sleeperSpacing / 2;
      _dummy.position.set(x, 0.09, z);
      _dummy.rotation.set(0, 0, (i % 7 === 0 ? 0.01 : -0.008));
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      sleepers.setMatrixAt(sleeperIndex, _dummy.matrix);
      _color.setHex(sleeperColors[i % sleeperColors.length]);
      sleepers.setColorAt(sleeperIndex, _color);
      sleeperIndex += 1;
    }
  }
  sleepers.instanceMatrix.needsUpdate = true;
  if (sleepers.instanceColor) sleepers.instanceColor.needsUpdate = true;
  sleepers.computeBoundingSphere();
  parent.add(sleepers);

  const railMaterial = standardMaterial(0x8a8982, { roughness: 0.34, metalness: 0.62 });
  const railHeadMaterial = standardMaterial(0xb4b2a8, { roughness: 0.23, metalness: 0.78 });
  for (const z of [nearZ, farZ]) {
    for (const offset of [-0.72, 0.72]) {
      addBox(parent, length, 0.12, 0.1, railMaterial, centerX, 0.2, z + offset, {
        cast: false,
        receive: true
      });
      addBox(parent, length, 0.035, 0.085, railHeadMaterial, centerX, 0.277, z + offset, {
        cast: false,
        receive: true
      });
    }
  }

  const troughMaterial = standardMaterial(0x8f887a, { roughness: 0.94 });
  addBox(parent, length, 0.24, 0.3, troughMaterial, centerX, 0.16, farZ - 2.5, {
    cast: false,
    receive: true
  });

  return { nearZ, farZ, railY: 0.28, centerZ };
}

export function createPlatform(parent, {
  x = 0,
  length = 60,
  depth = 8.2,
  zStart = 0,
  height = 1.0
} = {}) {
  const concreteTexture = createConcreteTexture(Math.max(2, Math.round(length / 7)), 1);
  const body = addBox(
    parent,
    length,
    height,
    depth,
    standardMaterial(0xb5afa2, { map: concreteTexture, roughness: 1 }),
    x,
    height / 2,
    zStart + depth / 2,
    { cast: true, receive: true, name: 'PlatformBody' }
  );
  body.name = 'Platform';

  const platformTexture = createPlatformTexture(Math.max(2, Math.round(length / 4.5)), Math.max(1, depth / 4.5));
  addPlane(
    parent,
    length,
    depth,
    standardMaterial(0xffffff, { map: platformTexture, roughness: 0.97 }),
    x,
    height + 0.008,
    zStart + depth / 2,
    { receive: true }
  );

  // White platform edge and yellow tactile strip.
  addBox(
    parent,
    length,
    0.026,
    0.13,
    standardMaterial(0xede8dc, { roughness: 0.8 }),
    x,
    height + 0.022,
    zStart + 0.17,
    { cast: false, receive: true }
  );
  const tactile = addPlane(
    parent,
    length,
    0.34,
    standardMaterial(0xffffff, {
      map: createTactileTexture(),
      roughness: 0.82
    }),
    x,
    height + 0.024,
    zStart + 0.72,
    { receive: true }
  );
  tactile.material.map.repeat.set(Math.max(2, length / 0.62), 1);
  tactile.material.map.needsUpdate = true;

  // A thin shadow-gap under the coping makes the platform read from track level.
  addBox(
    parent,
    length,
    0.12,
    0.07,
    standardMaterial(0x766f62, { roughness: 1 }),
    x,
    height - 0.04,
    zStart + 0.04,
    { cast: false, receive: true }
  );

  // Fine expansion joints across the platform.
  const jointMaterial = standardMaterial(0x8d877b, { roughness: 1 });
  const jointCount = Math.max(3, Math.round(length / 8));
  for (let i = 1; i < jointCount; i += 1) {
    const jx = x - length / 2 + (length / jointCount) * i;
    addBox(parent, 0.034, 0.006, depth - 0.2, jointMaterial, jx, height + 0.016, zStart + depth / 2, {
      cast: false,
      receive: true
    });
  }

  return { height, zStart, depth, length, x };
}

export function createCanopy(parent, {
  x = 0,
  z = 2.4,
  length = 20,
  depth = 4.9,
  baseY = 1.0,
  height = 3.25,
  columns = 4,
  roofColor = 0xd8d1c1,
  undersideColor = 0x958169,
  lightColor = 0xffe1ae
} = {}) {
  const group = new THREE.Group();
  group.name = 'PlatformCanopy';
  parent.add(group);

  const postMaterial = standardMaterial(0x665d50, { roughness: 0.72, metalness: 0.12 });
  const roofTexture = createRoofTexture(Math.max(2, Math.round(length / 4)), 2);
  const roofMaterial = standardMaterial(roofColor, { map: roofTexture, roughness: 0.78 });
  const fasciaMaterial = standardMaterial(0x8e7d67, { roughness: 0.9 });
  const undersideMaterial = standardMaterial(undersideColor, {
    roughness: 0.95,
    emissive: 0x5b4a36,
    emissiveIntensity: 0.16
  });
  const postPositions = [];

  for (let i = 0; i < columns; i += 1) {
    const px = x - length / 2 + (length / (columns - 1)) * i;
    for (const pz of [z + 0.3, z + depth - 0.4]) {
      addCylinder(group, 0.09, 0.12, height, postMaterial, px, baseY + height / 2, pz, {
        radialSegments: 10
      });
      postPositions.push({ x: px, z: pz, radius: 0.16 });
    }
  }

  const roofY = baseY + height;
  addBox(group, length + 0.65, 0.22, depth + 0.65, undersideMaterial, x, roofY, z + depth / 2, {
    cast: true,
    receive: true
  });
  addBox(group, length + 0.3, 0.09, depth + 0.3, roofMaterial, x, roofY + 0.145, z + depth / 2, {
    cast: true,
    receive: true
  });
  addBox(group, length + 0.75, 0.17, 0.12, fasciaMaterial, x, roofY - 0.08, z - 0.06, {
    cast: true,
    receive: true
  });
  addBox(group, length + 0.75, 0.17, 0.12, fasciaMaterial, x, roofY - 0.08, z + depth + 0.06, {
    cast: true,
    receive: true
  });

  // Rafters.
  const rafterCount = Math.max(5, Math.round(length / 2.4));
  for (let i = 0; i < rafterCount; i += 1) {
    const px = x - length / 2 + (length / (rafterCount - 1)) * i;
    addBox(group, 0.075, 0.12, depth, fasciaMaterial, px, roofY - 0.14, z + depth / 2, {
      cast: false,
      receive: false
    });
  }

  const lampMaterial = standardMaterial(0xfff3d8, {
    roughness: 0.4,
    emissive: lightColor,
    emissiveIntensity: 0.7
  });
  const lampCount = Math.max(2, Math.round(length / 4.5));
  for (let i = 0; i < lampCount; i += 1) {
    const px = x - length / 2 + 2 + (length - 4) * (lampCount === 1 ? 0.5 : i / (lampCount - 1));
    addPlane(group, 0.7, 0.18, lampMaterial, px, roofY - 0.19, z + depth / 2, {
      rx: Math.PI / 2,
      receive: false
    });
  }

  // Two soft, shadowless interior fills keep the canopy ceiling cosy rather
  // than turning it into a heavy black slab at midday.
  for (const offset of [-0.22, 0.22]) {
    const fill = new THREE.PointLight(0xffdfb1, 5.6, 12, 2);
    fill.position.set(x + length * offset, roofY - 0.65, z + depth / 2);
    fill.castShadow = false;
    group.add(fill);
  }

  return { group, postPositions, roofY };
}

export function createBench(parent, { x, z, y = 1, ry = 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'Bench';
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);

  const woodTexture = createWoodTexture(1.5, 1);
  const wood = standardMaterial(0xffffff, { map: woodTexture, roughness: 0.72 });
  const metal = standardMaterial(0x4f504b, { roughness: 0.55, metalness: 0.25 });

  for (let i = 0; i < 5; i += 1) {
    addBox(group, 1.92, 0.055, 0.085, wood, 0, 0.46, -0.2 + i * 0.1, {
      cast: true,
      receive: true
    });
  }
  for (let i = 0; i < 4; i += 1) {
    addBox(group, 1.92, 0.06, 0.075, wood, 0, 0.62 + i * 0.115, -0.32, {
      cast: true,
      receive: true,
      rx: -0.12
    });
  }
  for (const lx of [-0.72, 0.72]) {
    addBox(group, 0.075, 0.48, 0.075, metal, lx, 0.23, 0.08, { cast: true, receive: true });
    addBox(group, 0.075, 0.48, 0.075, metal, lx, 0.23, -0.3, { cast: true, receive: true });
    addBox(group, 0.07, 0.85, 0.065, metal, lx, 0.55, -0.36, { cast: true, receive: true });
    addBox(group, 0.07, 0.55, 0.07, metal, lx, 0.73, -0.18, {
      cast: true,
      receive: true,
      rx: 0.26
    });
  }
  addBox(group, 1.72, 0.055, 0.07, metal, 0, 0.16, 0.06, { cast: true, receive: true });
  return group;
}

export function createLamp(parent, { x, z, y = 1, height = 3.8, warm = true } = {}) {
  const group = new THREE.Group();
  group.name = 'PlatformLamp';
  group.position.set(x, y, z);
  parent.add(group);

  const metal = standardMaterial(0x53564e, { roughness: 0.5, metalness: 0.32 });
  addCylinder(group, 0.065, 0.095, height, metal, 0, height / 2, 0, { radialSegments: 8 });
  addBox(group, 0.64, 0.06, 0.08, metal, 0.27, height - 0.1, 0, { cast: true });
  addBox(group, 0.18, 0.13, 0.2, metal, 0.55, height - 0.18, 0, { cast: true });
  const globe = addBox(
    group,
    0.26,
    0.25,
    0.27,
    standardMaterial(0xfff3d5, {
      roughness: 0.35,
      emissive: warm ? 0xffd59a : 0xffe8ca,
      emissiveIntensity: 0.6
    }),
    0.55,
    height - 0.35,
    0,
    { cast: false }
  );
  globe.name = 'LampGlow';
  addBox(group, 0.3, 0.04, 0.31, metal, 0.55, height - 0.23, 0, { cast: true });
  addCylinder(group, 0.16, 0.2, 0.08, metal, 0, 0.04, 0, { radialSegments: 8 });
  return group;
}

export function createFence(parent, {
  xStart,
  xEnd,
  z,
  y = 1,
  height = 1.05,
  color = 0xd6d1c3,
  spacing = 2.25
} = {}) {
  const material = standardMaterial(color, { roughness: 0.7, metalness: 0.08 });
  const length = Math.abs(xEnd - xStart);
  const direction = Math.sign(xEnd - xStart) || 1;
  const posts = Math.max(2, Math.floor(length / spacing) + 1);
  const postGeometry = new THREE.BoxGeometry(0.065, height, 0.065);
  const instanced = new THREE.InstancedMesh(postGeometry, material, posts);
  instanced.castShadow = false;
  instanced.receiveShadow = true;
  for (let i = 0; i < posts; i += 1) {
    _dummy.position.set(xStart + direction * (length / (posts - 1)) * i, y + height / 2, z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    instanced.setMatrixAt(i, _dummy.matrix);
  }
  instanced.instanceMatrix.needsUpdate = true;
  instanced.computeBoundingSphere();
  parent.add(instanced);

  for (const railY of [y + height * 0.35, y + height * 0.75]) {
    addBox(parent, length, 0.038, 0.045, material, xStart + (xEnd - xStart) / 2, railY, z, {
      cast: false,
      receive: true
    });
  }
  return instanced;
}

export function createStationSign(parent, {
  x,
  y,
  z,
  ry = 0,
  nameJP,
  nameEN,
  lineColor = '#6f8f7f',
  prevJP = '',
  nextJP = '',
  width = 3.45,
  hanging = false,
  roofY = 4.2
} = {}) {
  const group = new THREE.Group();
  group.name = 'StationSign';
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);

  const frameMaterial = standardMaterial(0x5b564c, { roughness: 0.62, metalness: 0.14 });
  addBox(group, width + 0.1, 0.92, 0.075, frameMaterial, 0, 0, 0, {
    cast: true,
    receive: true
  });
  const signTexture = createStationSignTexture({ nameJP, nameEN, lineColor, prevJP, nextJP });
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissiveMap: signTexture,
    roughness: 0.74,
    emissive: 0xffffff,
    emissiveIntensity: 0.075
  });
  addPlane(group, width, 0.82, signMat, 0, 0, 0.041, { rx: 0, receive: false });
  addPlane(group, width, 0.82, signMat, 0, 0, -0.041, { rx: 0, ry: Math.PI, receive: false });

  if (hanging) {
    const rodMat = standardMaterial(0x595449, { roughness: 0.6, metalness: 0.2 });
    const rodLength = Math.max(0.2, roofY - (y + 0.45));
    addCylinder(group, 0.027, 0.027, rodLength, rodMat, -width * 0.36, 0.46 + rodLength / 2, 0, {
      radialSegments: 6,
      cast: false
    });
    addCylinder(group, 0.027, 0.027, rodLength, rodMat, width * 0.36, 0.46 + rodLength / 2, 0, {
      radialSegments: 6,
      cast: false
    });
  }
  return group;
}

export function createTimetableBoard(parent, { x, y, z, ry = 0 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const frame = standardMaterial(0x625a4e, { roughness: 0.7 });
  addBox(group, 1.16, 1.72, 0.08, frame, 0, 0, 0, { cast: true, receive: true });
  const glass = new THREE.MeshStandardMaterial({
    map: createTimetableTexture(),
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0x2a251e,
    emissiveIntensity: 0.04
  });
  addPlane(group, 1.02, 1.56, glass, 0, 0, 0.047, { rx: 0, receive: false });
  const legMat = standardMaterial(0x585248, { roughness: 0.7 });
  addBox(group, 0.065, 1.0, 0.065, legMat, -0.42, -1.34, 0, { cast: true });
  addBox(group, 0.065, 1.0, 0.065, legMat, 0.42, -1.34, 0, { cast: true });
  return group;
}

export function createPosterPanel(parent, {
  x,
  y,
  z,
  ry = 0,
  width = 1.0,
  height = 1.45,
  title = '旅',
  subtitle = 'TRAVEL',
  bg = '#d4b993',
  accent = '#6e7f6d',
  motif = 'sun'
} = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const frame = standardMaterial(0x5d564b, { roughness: 0.55, metalness: 0.18 });
  addBox(group, width + 0.08, height + 0.08, 0.055, frame, 0, 0, 0, {
    cast: true,
    receive: true
  });
  const posterMat = new THREE.MeshStandardMaterial({
    map: createPosterTexture({ title, subtitle, bg, accent, motif }),
    roughness: 0.72
  });
  addPlane(group, width, height, posterMat, 0, 0, 0.035, { rx: 0, receive: false });
  return group;
}

/* -------------------------------------------------------------------------- */
/* Poles, wires, vegetation                                                   */
/* -------------------------------------------------------------------------- */

export function createUtilityPole(parent, {
  x,
  z,
  height = 9.2,
  concrete = true,
  transformer = false
} = {}) {
  const group = new THREE.Group();
  group.name = 'UtilityPole';
  group.position.set(x, 0, z);
  parent.add(group);

  const poleMaterial = standardMaterial(concrete ? 0x9b978c : 0x796b58, { roughness: 1 });
  addCylinder(group, 0.12, 0.2, height, poleMaterial, 0, height / 2, 0, {
    radialSegments: 9
  });
  addCylinder(group, 0.24, 0.24, 0.13, poleMaterial, 0, height - 0.4, 0, {
    radialSegments: 9
  });

  const armMaterial = standardMaterial(0x615f58, { roughness: 0.63, metalness: 0.3 });
  const insulatorMaterial = standardMaterial(0xd6d3c7, { roughness: 0.5 });
  const anchors = [];
  for (const [armY, armLength] of [[height - 0.8, 2.0], [height - 1.65, 1.5]]) {
    addBox(group, armLength, 0.08, 0.1, armMaterial, 0, armY, 0, { cast: false });
    for (const offset of [-armLength * 0.36, 0, armLength * 0.36]) {
      addCylinder(group, 0.055, 0.07, 0.2, insulatorMaterial, offset, armY + 0.12, 0, {
        radialSegments: 6,
        cast: false
      });
      anchors.push(new THREE.Vector3(x + offset, armY + 0.23, z));
    }
  }
  if (transformer) {
    addCylinder(group, 0.28, 0.28, 0.85, armMaterial, 0.48, height - 2.8, 0, {
      radialSegments: 10
    });
    addBox(group, 0.1, 0.1, 0.32, armMaterial, 0.48, height - 2.35, 0, { cast: false });
  }
  addBox(group, 0.44, 0.3, 0.04, standardMaterial(0xd6bd6f, { roughness: 0.68 }), 0, 2.7, 0.15, {
    cast: false
  });
  return { group, anchors };
}

export function createSagWire(parent, start, end, sag = 0.65, color = 0x353733, opacity = 0.78) {
  const points = [];
  const segments = 22;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = THREE.MathUtils.lerp(start.x, end.x, t);
    const z = THREE.MathUtils.lerp(start.z, end.z, t);
    const y = THREE.MathUtils.lerp(start.y, end.y, t) - sag * 4 * t * (1 - t);
    points.push(new THREE.Vector3(x, y, z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  parent.add(line);
  return line;
}

export function createTreeCluster(parent, specs, baseY = 0) {
  if (!specs.length) return null;
  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.19, 1, 6);
  const trunkMat = standardMaterial(0x6f5943, { roughness: 1, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, specs.length);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  trunks.name = 'TreeTrunks';

  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const blobMat = standardMaterial(0xffffff, { roughness: 0.95, flatShading: true });
  const totalBlobs = specs.length * 4;
  const leaves = new THREE.InstancedMesh(blobGeo, blobMat, totalBlobs);
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  leaves.name = 'AutumnTrees';

  let blobIndex = 0;
  specs.forEach((spec, index) => {
    const random = seededRandom(index + 83);
    const scale = spec.scale ?? 1;
    const trunkHeight = (3.1 + random() * 1.8) * scale;
    _dummy.position.set(spec.x, baseY + trunkHeight / 2, spec.z);
    _dummy.rotation.set(0, random() * Math.PI, 0);
    _dummy.scale.set(1.2 * scale, trunkHeight, 1.2 * scale);
    _dummy.updateMatrix();
    trunks.setMatrixAt(index, _dummy.matrix);

    const palette = spec.palette ?? [0x67764f, 0x7c854f, 0xa26b3e, 0xb78743];
    for (let blob = 0; blob < 4; blob += 1) {
      const angle = random() * Math.PI * 2;
      const spread = blob === 0 ? 0 : (0.35 + random() * 0.8) * scale;
      const size = (blob === 0 ? 1.25 : 0.78 + random() * 0.5) * scale;
      _dummy.position.set(
        spec.x + Math.cos(angle) * spread,
        baseY + trunkHeight * (blob === 0 ? 0.96 : 0.78 + random() * 0.22),
        spec.z + Math.sin(angle) * spread
      );
      _dummy.rotation.set(random() * 0.4, random() * Math.PI, random() * 0.4);
      _dummy.scale.set(size * (1.1 + random() * 0.35), size * (0.8 + random() * 0.2), size);
      _dummy.updateMatrix();
      leaves.setMatrixAt(blobIndex, _dummy.matrix);
      _color.setHex(palette[Math.floor(random() * palette.length)]);
      leaves.setColorAt(blobIndex, _color);
      blobIndex += 1;
    }
  });

  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  leaves.computeBoundingSphere();
  parent.add(trunks, leaves);
  return { trunks, leaves };
}

export function createFallenLeaves(parent, { count = 240, areas = [] } = {}) {
  if (!areas.length) return null;
  const geometry = leafGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'FallenLeaves';
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const random = seededRandom(788);
  const colors = [0xb26d38, 0xcf8b3f, 0x9b5c35, 0xd0a34d, 0x7d7545, 0xa94d34];
  for (let i = 0; i < count; i += 1) {
    const area = areas[Math.floor(random() * areas.length)];
    _dummy.position.set(
      THREE.MathUtils.lerp(area.xMin, area.xMax, random()),
      (area.y ?? 0) + 0.018 + random() * 0.012,
      THREE.MathUtils.lerp(area.zMin, area.zMax, random())
    );
    _dummy.rotation.set(
      (random() - 0.5) * 0.16,
      random() * Math.PI * 2,
      (random() - 0.5) * 0.2
    );
    const scale = 0.55 + random() * 0.85;
    _dummy.scale.set(scale, scale, scale);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    _color.setHex(colors[Math.floor(random() * colors.length)]);
    mesh.setColorAt(i, _color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

export function createGrassTufts(parent, { count = 260, areas = [], baseY = 0 } = {}) {
  if (!areas.length) return null;
  const geometry = new THREE.ConeGeometry(0.09, 0.38, 3);
  const material = standardMaterial(0xffffff, { roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'GrassTufts';
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const random = seededRandom(991);
  const colors = [0x7c8150, 0x8d8a50, 0x6e7849, 0xa2904f, 0x667347];
  for (let i = 0; i < count; i += 1) {
    const area = areas[Math.floor(random() * areas.length)];
    _dummy.position.set(
      THREE.MathUtils.lerp(area.xMin, area.xMax, random()),
      baseY + 0.18,
      THREE.MathUtils.lerp(area.zMin, area.zMax, random())
    );
    _dummy.rotation.set((random() - 0.5) * 0.3, random() * Math.PI * 2, (random() - 0.5) * 0.3);
    const scale = 0.5 + random() * 1.2;
    _dummy.scale.set(scale, 0.7 + random() * 1.4, scale);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    _color.setHex(colors[Math.floor(random() * colors.length)]);
    mesh.setColorAt(i, _color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

export class DriftingLeaves {
  constructor(parent, { count = 42, bounds = {}, baseY = 0, seed = 7 } = {}) {
    this.count = count;
    this.bounds = {
      xMin: bounds.xMin ?? -20,
      xMax: bounds.xMax ?? 20,
      yMin: baseY + 0.3,
      yMax: bounds.yMax ?? baseY + 8,
      zMin: bounds.zMin ?? -2,
      zMax: bounds.zMax ?? 8
    };
    this.baseY = baseY;
    this.random = seededRandom(seed);
    this.mesh = new THREE.InstancedMesh(
      leafGeometry(),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        side: THREE.DoubleSide
      }),
      count
    );
    this.mesh.name = 'DriftingLeaves';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    parent.add(this.mesh);

    const palette = [0xc27b37, 0xad5b35, 0xd6a64d, 0x8e7645, 0xc98d42];
    this.leaves = [];
    for (let i = 0; i < count; i += 1) {
      const leaf = {
        x: this._range(this.bounds.xMin, this.bounds.xMax),
        y: this._range(this.bounds.yMin, this.bounds.yMax),
        z: this._range(this.bounds.zMin, this.bounds.zMax),
        phase: this.random() * Math.PI * 2,
        fall: 0.13 + this.random() * 0.2,
        sway: 0.12 + this.random() * 0.32,
        spin: (this.random() - 0.5) * 1.2,
        rotation: this.random() * Math.PI * 2,
        tilt: (this.random() - 0.5) * 0.7,
        size: 0.55 + this.random() * 0.6
      };
      this.leaves.push(leaf);
      _color.setHex(palette[i % palette.length]);
      this.mesh.setColorAt(i, _color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this._writeMatrices(0);
  }

  _range(min, max) {
    return min + this.random() * (max - min);
  }

  update(dt, elapsed) {
    for (let i = 0; i < this.leaves.length; i += 1) {
      const leaf = this.leaves[i];
      leaf.y -= leaf.fall * dt;
      leaf.x += Math.sin(elapsed * 0.7 + leaf.phase) * leaf.sway * dt + dt * 0.025;
      leaf.z += Math.cos(elapsed * 0.4 + leaf.phase) * leaf.sway * 0.42 * dt;
      leaf.rotation += leaf.spin * dt;
      if (
        leaf.y < this.baseY + 0.18 ||
        leaf.x > this.bounds.xMax + 2 ||
        leaf.z > this.bounds.zMax + 2
      ) {
        leaf.y = this.bounds.yMax - this.random() * 1.5;
        leaf.x = this._range(this.bounds.xMin, this.bounds.xMax);
        leaf.z = this._range(this.bounds.zMin, this.bounds.zMax);
      }
    }
    this._writeMatrices(elapsed);
  }

  _writeMatrices(elapsed) {
    for (let i = 0; i < this.leaves.length; i += 1) {
      const leaf = this.leaves[i];
      _dummy.position.set(leaf.x, leaf.y, leaf.z);
      _dummy.rotation.set(
        leaf.tilt + Math.sin(elapsed * 0.8 + leaf.phase) * 0.25,
        leaf.rotation,
        Math.cos(elapsed * 0.6 + leaf.phase) * 0.22
      );
      _dummy.scale.set(leaf.size, leaf.size, leaf.size);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.14);
  shape.bezierCurveTo(0.1, 0.08, 0.1, -0.07, 0, -0.14);
  shape.bezierCurveTo(-0.1, -0.07, -0.1, 0.08, 0, 0.14);
  const geometry = new THREE.ShapeGeometry(shape, 5);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function createDapplePatches(parent, {
  patches = [],
  texture = createDappleTexture()
} = {}) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  for (const patch of patches) {
    const mesh = addPlane(
      parent,
      patch.sizeX ?? 5,
      patch.sizeZ ?? 4,
      material,
      patch.x,
      patch.y,
       patch.z,
      { receive: false }
    );
    mesh.renderOrder = 2;
    mesh.rotation.z = patch.rotation ?? 0;
  }
  return material;
}

/* -------------------------------------------------------------------------- */
/* Small props                                                                */
/* -------------------------------------------------------------------------- */

export function createBicycle(parent, { x, z, y = 1, ry = 0, color = 0x6d827a } = {}) {
  const group = new THREE.Group();
  group.name = 'ParkedBicycle';
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);

  const frameMat = standardMaterial(color, { roughness: 0.46, metalness: 0.42 });
  const darkMat = standardMaterial(0x3e403d, { roughness: 0.54, metalness: 0.3 });
  const rubberMat = standardMaterial(0x353633, { roughness: 0.9 });
  const silver = standardMaterial(0xb3b1a7, { roughness: 0.38, metalness: 0.55 });

  const wheelGeometry = new THREE.TorusGeometry(0.34, 0.022, 6, 20);
  for (const wx of [-0.57, 0.57]) {
    const wheel = new THREE.Mesh(wheelGeometry, rubberMat);
    wheel.position.set(wx, 0.34, 0);
    wheel.castShadow = true;
    wheel.receiveShadow = true;
    group.add(wheel);
    const hub = addCylinder(group, 0.045, 0.045, 0.06, silver, wx, 0.34, 0, {
      radialSegments: 8,
      rx: Math.PI / 2,
      cast: false
    });
    hub.name = 'BicycleHub';
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      addCylinderBetween(
        group,
        new THREE.Vector3(wx, 0.34, 0),
        new THREE.Vector3(wx + Math.cos(angle) * 0.31, 0.34 + Math.sin(angle) * 0.31, 0),
        0.0045,
        silver,
        4
      ).castShadow = false;
    }
  }

  const joints = {
    rear: new THREE.Vector3(-0.57, 0.34, 0),
    crank: new THREE.Vector3(-0.1, 0.35, 0),
    seat: new THREE.Vector3(-0.22, 0.82, 0),
    front: new THREE.Vector3(0.57, 0.34, 0),
    steer: new THREE.Vector3(0.41, 0.88, 0),
    bar: new THREE.Vector3(0.49, 0.95, 0)
  };
  addCylinderBetween(group, joints.rear, joints.crank, 0.022, frameMat);
  addCylinderBetween(group, joints.crank, joints.seat, 0.026, frameMat);
  addCylinderBetween(group, joints.seat, joints.rear, 0.021, frameMat);
  addCylinderBetween(group, joints.seat, joints.steer, 0.023, frameMat);
  addCylinderBetween(group, joints.front, joints.steer, 0.024, frameMat);
  addCylinderBetween(group, joints.crank, joints.front, 0.021, frameMat);
  addBox(group, 0.24, 0.045, 0.11, darkMat, -0.25, 0.9, 0, { cast: false });
  addCylinderBetween(
    group,
    new THREE.Vector3(0.41, 0.88, -0.2),
    new THREE.Vector3(0.41, 0.88, 0.2),
    0.016,
    silver
  );
  // Basket.
  addBox(group, 0.28, 0.2, 0.25, new THREE.MeshStandardMaterial({
    color: 0x8a887d,
    roughness: 0.6,
    metalness: 0.3,
    wireframe: true
  }), 0.61, 0.74, 0, { cast: false });
  // Kickstand.
  addCylinderBetween(
    group,
    new THREE.Vector3(-0.38, 0.22, 0.02),
    new THREE.Vector3(-0.48, -0.01, 0.16),
    0.012,
    darkMat
  );
  return group;
}

export function createBin(parent, { x, z, y = 1, ry = 0 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const metal = standardMaterial(0x777d75, { roughness: 0.5, metalness: 0.4 });
  const dark = standardMaterial(0x3d423f, { roughness: 0.7 });
  addBox(group, 0.48, 0.8, 0.46, metal, 0, 0.4, 0, { cast: true, receive: true });
  addBox(group, 0.53, 0.07, 0.51, dark, 0, 0.83, 0, { cast: true, receive: true });
  addBox(group, 0.3, 0.09, 0.03, dark, 0, 0.61, 0.235, { cast: false });
  addBox(group, 0.23, 0.16, 0.03, standardMaterial(0xd9d4c7, { roughness: 0.7 }), 0, 0.39, 0.235, {
    cast: false
  });
  return group;
}

export function createPlanter(parent, { x, z, y = 1, width = 2.1, depth = 0.8, height = 0.48 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const concrete = standardMaterial(0xaaa395, { roughness: 1 });
  addBox(group, width, height, depth, concrete, 0, height / 2, 0, { cast: true, receive: true });
  addBox(group, width - 0.12, 0.06, depth - 0.12, standardMaterial(0x4f4233, { roughness: 1 }), 0, height + 0.035, 0, {
    cast: false
  });
  const leafMat = standardMaterial(0x6e7a50, { roughness: 0.95, flatShading: true });
  const leafMat2 = standardMaterial(0x8b7143, { roughness: 0.95, flatShading: true });
  const random = seededRandom(Math.round(x * 23 + z * 7));
  const shrubCount = Math.max(3, Math.round(width / 0.45));
  for (let i = 0; i < shrubCount; i += 1) {
    const px = -width / 2 + 0.25 + (i / Math.max(1, shrubCount - 1)) * (width - 0.5);
    const radius = 0.18 + random() * 0.14;
    const sphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      i % 3 === 0 ? leafMat2 : leafMat
    );
    sphere.position.set(px, height + 0.22 + random() * 0.14, (random() - 0.5) * depth * 0.4);
    sphere.scale.y = 0.8;
    sphere.castShadow = true;
    group.add(sphere);
  }
  return group;
}

export function createSuburbanHouse(parent, {
  x,
  z,
  ry = 0,
  width = 7,
  depth = 6,
  height = 4.4,
  wallColor = 0xd7d1c2,
  roofColor = 0x5c625f
} = {}) {
  const group = new THREE.Group();
  group.name = 'SuburbanHouse';
  group.position.set(x, 0, z);
  group.rotation.y = ry;
  parent.add(group);

  const wallMat = standardMaterial(wallColor, { roughness: 0.95 });
  const trimMat = standardMaterial(0xe7e0d2, { roughness: 0.85 });
  const roofMat = standardMaterial(roofColor, { roughness: 0.75, metalness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x5f7478,
    roughness: 0.25,
    metalness: 0.15,
    emissive: 0x1d2422,
    emissiveIntensity: 0.1
  });

  addBox(group, width + 0.3, 0.25, depth + 0.3, standardMaterial(0x8e887b, { roughness: 1 }), 0, 0.125, 0, {
    cast: true,
    receive: true
  });
  addBox(group, width, height, depth, wallMat, 0, height / 2 + 0.2, 0, {
    cast: true,
    receive: true
  });
  addBox(group, width + 0.22, 0.13, depth + 0.22, trimMat, 0, height + 0.18, 0, {
    cast: true,
    receive: true
  });

  // Hipped roof made from a four-sided cone.
  const roofGeo = new THREE.ConeGeometry(1, 1.7, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, height + 1.12, 0);
  roof.scale.set((width + 1.3) / 2, 1, (depth + 1.3) / 2);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const windowY = height * 0.62;
  for (const side of [-1, 1]) {
    for (const wx of [-width * 0.25, width * 0.25]) {
      addBox(group, 0.92, 0.82, 0.06, trimMat, wx, windowY, side * (depth / 2 + 0.035), {
        cast: false
      });
      addBox(group, 0.78, 0.68, 0.07, glassMat, wx, windowY, side * (depth / 2 + 0.07), {
        cast: false
      });
      addBox(group, 0.035, 0.68, 0.075, trimMat, wx, windowY, side * (depth / 2 + 0.075), {
        cast: false
      });
    }
  }
  addBox(group, 1.0, 2.1, 0.07, standardMaterial(0x6f5843, { roughness: 0.8 }), 0, 1.34, depth / 2 + 0.055, {
    cast: false
  });
  addBox(group, 0.08, 0.08, 0.35, trimMat, 0.3, 1.48, depth / 2 + 0.18, { cast: false });
  addBox(group, 0.75, 0.24, 0.46, standardMaterial(0x746d60, { roughness: 0.9 }), 0, 0.32, depth / 2 + 0.34, {
    cast: true,
    receive: true
  });

  if (width > 6) {
    addBox(group, width * 0.42, 0.08, 1.1, trimMat, -width * 0.22, height * 0.52, depth / 2 + 0.55, {
      cast: true,
      receive: true
    });
    for (let i = 0; i < 4; i += 1) {
      addBox(group, 0.035, 0.58, 0.035, trimMat, -width * 0.4 + i * 0.34, height * 0.29, depth / 2 + 0.9, {
        cast: false
      });
    }
  }

  return group;
}

export function createCityBuilding(parent, {
  x,
  z,
  width = 12,
  depth = 12,
  height = 24,
  texture,
  tint = 0xffffff,
  rotation = 0,
  rooftop = true,
  antenna = false,
  near = false
} = {}) {
  const sideMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    color: tint,
    roughness: 0.9
  });
  const roofMaterial = standardMaterial(0x8b877b, { roughness: 0.98 });
  const materials = [
    sideMaterial, sideMaterial,
    roofMaterial, roofMaterial,
    sideMaterial, sideMaterial
  ];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials);
  mesh.position.set(x, height / 2, z);
  mesh.rotation.y = rotation;
  mesh.castShadow = near;
  mesh.receiveShadow = true;
  mesh.name = 'CityBuilding';
  parent.add(mesh);

  if (rooftop) {
    const random = seededRandom(Math.round(Math.abs(x) * 3 + z * 11 + height));
    const trim = standardMaterial(0xa49e91, { roughness: 1 });
    addBox(parent, width + 0.25, 0.28, depth + 0.25, trim, x, height + 0.14, z, {
      cast: near,
      receive: true,
      ry: rotation
    });
    if (random() > 0.35) {
      addBox(
        parent,
        width * 0.22,
        1.3 + random() * 2.1,
        depth * 0.22,
        standardMaterial(0xb9b3a6, { roughness: 1 }),
        x + (random() - 0.5) * width * 0.5,
        height + 1,
        z + (random() - 0.5) * depth * 0.45,
        { cast: near, receive: true, ry: rotation }
      );
    }
    if (random() > 0.56) {
      addCylinder(parent, 0.65, 0.65, 1.8, standardMaterial(0xc4c0b5, { roughness: 0.8 }), x - width * 0.2, height + 1.15, z + depth * 0.17, {
        radialSegments: 10,
        cast: near
      });
    }
    if (antenna || random() > 0.75) {
      addCylinder(parent, 0.035, 0.06, 5.5 + random() * 4, standardMaterial(0x6c6b64, { roughness: 0.5, metalness: 0.4 }), x + width * 0.24, height + 3.2, z - depth * 0.1, {
        radialSegments: 5,
        cast: false
      });
      for (let i = 0; i < 3; i += 1) {
        addBox(parent, 1.1, 0.035, 0.035, standardMaterial(0x6c6b64, { roughness: 0.5 }), x + width * 0.24, height + 4.7 + i * 1.1, z - depth * 0.1, {
          cast: false
        });
      }
    }

    // Balcony bands on nearer buildings.
    if (near) {
      const balconyMat = standardMaterial(0xb4aea1, { roughness: 0.95 });
      const bands = Math.min(6, Math.floor(height / 4));
      for (let i = 1; i <= bands; i += 1) {
        addBox(parent, width * 0.86, 0.08, 0.48, balconyMat, x, height * (i / (bands + 1)), z + depth / 2 + 0.2, {
          cast: false,
          receive: true,
          ry: rotation
        });
      }
    }
  }

  return mesh;
}

export function createBillboard(parent, {
  x,
  y,
  z,
  width = 8,
  height = 4,
  texture,
  ry = 0,
  legs = false
} = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const frame = standardMaterial(0x4f4c45, { roughness: 0.55, metalness: 0.3 });
  addBox(group, width + 0.18, height + 0.18, 0.16, frame, 0, 0, 0, {
    cast: true,
    receive: true
  });
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.72,
    emissive: 0x2e2a22,
    emissiveIntensity: 0.05
  });
  addPlane(group, width, height, material, 0, 0, 0.095, { rx: 0, receive: false });
  if (legs) {
    addBox(group, 0.12, y, 0.12, frame, -width * 0.32, -y / 2 - height / 2 + 0.4, 0, {
      cast: true
    });
    addBox(group, 0.12, y, 0.12, frame, width * 0.32, -y / 2 - height / 2 + 0.4, 0, {
      cast: true
    });
  }
  return group;
}

export function createVerticalSign(parent, {
  x,
  y,
  z,
  width = 1.4,
  height = 4.8,
  texture,
  ry = 0
} = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const frame = standardMaterial(0x3f433f, { roughness: 0.55, metalness: 0.3 });
  addBox(group, width + 0.1, height + 0.1, 0.18, frame, 0, 0, 0, {
    cast: true,
    receive: true
  });
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.68,
    emissive: 0x2b2923,
    emissiveIntensity: 0.08
  });
  addPlane(group, width, height, material, 0, 0, 0.1, { rx: 0, receive: false });
  addPlane(group, width, height, material, 0, 0, -0.1, { rx: 0, ry: Math.PI, receive: false });
  return group;
}

export function createShrub(parent, { x, y = 0, z, scale = 1, color = 0x6c7a4a } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const material = standardMaterial(color, { roughness: 0.95, flatShading: true });
  const random = seededRandom(Math.round(x * 13 + z * 17));
  for (let i = 0; i < 4; i += 1) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry((0.32 + random() * 0.3) * scale, 1), material);
    mesh.position.set((random() - 0.5) * 0.8 * scale, 0.32 * scale + random() * 0.3, (random() - 0.5) * 0.6 * scale);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

export function createCrossingRoad(parent) {
  const texture = createAsphaltTexture(2, 6);
  const mat = standardMaterial(0xffffff, { map: texture, roughness: 0.96 });
  addPlane(parent, 7.4, 42, mat, 0, 0.012, -2, { receive: true });
}

export function createCrossingSign(parent, { x, y, z, ry = 0 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  const poleMat = standardMaterial(0x5d5c55, { roughness: 0.6, metalness: 0.3 });
  addCylinder(group, 0.045, 0.055, 2.2, poleMat, 0, -0.9, 0, { radialSegments: 7 });
  addBox(group, 0.8, 1.0, 0.06, standardMaterial(0x59554b, { roughness: 0.6 }), 0, 0.45, 0, {
    cast: true
  });
  const face = new THREE.MeshStandardMaterial({
    map: createCrossingSignTexture(),
    roughness: 0.7
  });
  addPlane(group, 0.72, 0.9, face, 0, 0.45, 0.035, { rx: 0, receive: false });
  return group;
}

export function createHazardBarrierMaterial() {
  const texture = createHazardTexture();
  texture.repeat.set(3.2, 1);
  return standardMaterial(0xffffff, { map: texture, roughness: 0.62 });
}

export function createSpeakerPole(parent, { x, z, y = 1, height = 3.2 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const metal = standardMaterial(0x565a54, { roughness: 0.45, metalness: 0.4 });
  addCylinder(group, 0.04, 0.07, height, metal, 0, height / 2, 0, { radialSegments: 7 });
  addBox(group, 0.32, 0.22, 0.24, standardMaterial(0x8d8d84, { roughness: 0.5, metalness: 0.2 }), 0.16, height - 0.2, 0, {
    cast: true
  });
  addBox(group, 0.24, 0.15, 0.02, standardMaterial(0x3e423e, { roughness: 0.8 }), 0.16, height - 0.2, 0.13, {
    cast: false
  });
  return group;
}

export function makeGround(parent, {
  size = 280,
  texture = createGrassTexture(34, 34),
  color = 0xffffff
} = {}) {
  const material = standardMaterial(color, { map: texture, roughness: 1 });
  const ground = addPlane(parent, size, size, material, 0, 0, -8, {
    receive: true
  });
  ground.name = 'Ground';
  return ground;
}

export function makePlatformNumberTexture(number, color = '#607f74') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe3';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(65,58,48,.26)';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 10, 67, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8f1e4';
    ctx.font = '600 105px "Hiragino Mincho ProN", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), w / 2, h / 2 - 8);
    ctx.fillStyle = '#7b7365';
    ctx.font = '500 12px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('PLATFORM', w / 2, h - 28);
  });
}

export function createPlatformNumber(parent, { x, y, z, ry = 0, number = 1, color = '#607f74' }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);
  addCylinder(group, 0.035, 0.045, 1.7, standardMaterial(0x5b5c56, { roughness: 0.6, metalness: 0.2 }), 0, -0.85, 0, {
    radialSegments: 6
  });
  addBox(group, 0.62, 0.62, 0.05, standardMaterial(0x5b554a, { roughness: 0.7 }), 0, 0, 0, {
    cast: true
  });
  const face = new THREE.MeshStandardMaterial({
    map: makePlatformNumberTexture(number, color),
    roughness: 0.75
  });
  addPlane(group, 0.56, 0.56, face, 0, 0, 0.033, { rx: 0, receive: false });
  return group;
}

export function createCatenaryGantry(parent, { x, zTrack1, zTrack2, height = 6.2 } = {}) {
  const group = new THREE.Group();
  group.name = 'CatenaryGantry';
  parent.add(group);
  const metal = standardMaterial(0x6f716b, { roughness: 0.58, metalness: 0.36 });
  const half = Math.abs(zTrack2 - zTrack1) / 2 + 2;
  const center = (zTrack1 + zTrack2) / 2;
  for (const z of [center - half, center + half]) {
    addCylinder(group, 0.11, 0.15, height, metal, x, height / 2, z, { radialSegments: 8 });
  }
  addBox(group, 0.16, 0.16, half * 2, metal, x, height - 0.25, center, { cast: false });
  for (const z of [zTrack1, zTrack2]) {
    addBox(group, 0.14, 0.7, 0.14, metal, x, height - 0.65, z, { cast: false });
    createSagWire(
      parent,
      new THREE.Vector3(x - 24, height - 0.85, z),
      new THREE.Vector3(x, height - 0.85, z),
      0.32
    );
    createSagWire(
      parent,
      new THREE.Vector3(x, height - 0.85, z),
      new THREE.Vector3(x + 24, height - 0.85, z),
      0.32
    );
  }
  return group;
}

export function disposeObject(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => {
        if (!material) return;
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value && value.isTexture) textures.add(value);
        }
      });
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function seededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBuildingTextureSet(seed = 5) {
  return [
    createBuildingTexture(0, seed + 1),
    createBuildingTexture(1, seed + 2),
    createBuildingTexture(2, seed + 3),
    createBuildingTexture(3, seed + 4),
    createBuildingTexture(4, seed + 5)
  ];
}

export function addContactShadowBlob(parent, { x, y, z, width = 4, depth = 4, opacity = 0.16 }) {
  const texture = createDappleTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false
  });
  const mesh = addPlane(parent, width, depth, material, x, y + 0.015, z, { receive: false });
  mesh.renderOrder = 2;
  return mesh;
}
