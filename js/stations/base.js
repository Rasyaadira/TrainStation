/**
 * Shared station lifecycle and collision surface.
 * Subclasses implement buildStation() and may override update().
 */
import * as THREE from 'three';
import { disposeObject } from '../world.js';

export class StationBase {
  constructor({
    id,
    nameJP,
    nameEN,
    platformTop = 1.0,
    platformBounds = { xMin: -30, xMax: 30, zMin: 0, zMax: 8.2 },
    mood = {},
    spawn = { x: 0, z: 5.2, yaw: 0 },
    arrivalDelay = 18,
    crossingReleaseDelay = 4.4
  }) {
    this.id = id;
    this.nameJP = nameJP;
    this.nameEN = nameEN;
    this.platformTop = platformTop;
    this.platformBounds = platformBounds;
    this.mood = mood;
    this.spawn = spawn;
    this.arrivalDelay = arrivalDelay;
    this.crossingReleaseDelay = crossingReleaseDelay;

    this.group = null;
    this.colliders = [];
    this.vendingMachines = [];
    this.crossing = null;
    this.driftingLeaves = null;
    this.scene = null;
  }

  load(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = `${this.id}_Root`;
    this.colliders = [];
    this.vendingMachines = [];
    this.crossing = null;
    this.driftingLeaves = null;

    this.buildStation();

    scene.add(this.group);

    return {
      colliders: this.colliders,
      getSurfaceHeight: (x, z) => this.getSurfaceHeight(x, z),
      spawn: { ...this.spawn },
      vendingMachines: this.vendingMachines,
      crossing: this.crossing,
      mood: this.mood,
      platformEdgeZ: this.platformBounds.zMin,
      arrivalDelay: this.arrivalDelay,
      crossingReleaseDelay: this.crossingReleaseDelay
    };
  }

  buildStation() {
    // Implemented by each station.
  }

  getSurfaceHeight(x, z) {
    const b = this.platformBounds;
    if (x >= b.xMin && x <= b.xMax && z >= b.zMin && z <= b.zMax) {
      return this.platformTop;
    }
    return 0;
  }

  addCollider(minX, maxX, minZ, maxZ) {
    this.colliders.push({ minX, maxX, minZ, maxZ });
  }

  addCenteredCollider(x, z, halfWidth, halfDepth) {
    this.addCollider(x - halfWidth, x + halfWidth, z - halfDepth, z + halfDepth);
  }

  addPlatformBoundaryWalls({ xMin, xMax, zMin, zMax }) {
    // Thick invisible walls with a tiny overlap prevent tunnelling at corners.
    this.addCollider(xMin - 1.2, xMin - 0.12, zMin - 1.2, zMax + 1.2);
    this.addCollider(xMax + 0.12, xMax + 1.2, zMin - 1.2, zMax + 1.2);
    this.addCollider(xMin - 1.2, xMax + 1.2, zMin - 1.2, zMin + 0.34);
    this.addCollider(xMin - 1.2, xMax + 1.2, zMax - 0.12, zMax + 1.2);
  }

  update(dt, elapsed) {
    if (this.crossing) this.crossing.update(dt, elapsed);
    if (this.driftingLeaves) this.driftingLeaves.update(dt, elapsed);
  }

  unload(scene) {
    if (!this.group) return;
    scene.remove(this.group);
    disposeObject(this.group);
    this.group.clear();
    this.group = null;
    this.colliders = [];
    this.vendingMachines = [];
    this.crossing = null;
    this.driftingLeaves = null;
    this.scene = null;
  }
}
