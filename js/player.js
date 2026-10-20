/**
 * First-person walker with lightweight circle-vs-AABB collision.
 * Eye height is 1.62 m. The camera itself is the PointerLockControls object.
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const WALK_SPEED = 3.05;
const RUN_SPEED = 5.15;
const EYE_HEIGHT = 1.62;
const RADIUS = 0.34;

export class Player {
  constructor(camera, domElement, callbacks = {}) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.controls.pointerSpeed = 0.88;
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.colliders = [];
    this.getSurfaceHeight = () => 0;
    this.eyeHeight = EYE_HEIGHT;
    this.radius = RADIUS;
    this.movementEnabled = true;
    this.manualDisabled = false;
    this.onInteract = callbacks.onInteract ?? (() => {});
    this.onFootstep = callbacks.onFootstep ?? (() => {});
    this.onMute = callbacks.onMute ?? (() => {});
    this.bobTime = 0;
    this.bobOffset = 0;
    this.stepTimer = 0;
    this.steps = 0;
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this.controls.addEventListener('unlock', () => this.resetKeys());
  }

  setEnvironment(colliders = [], getSurfaceHeight = () => 0) {
    this.colliders = colliders;
    this.getSurfaceHeight = getSurfaceHeight;
  }

  setSpawn(x, z, yaw = 0) {
    const surface = this.getSurfaceHeight(x, z);
    this.camera.position.set(x, surface + this.eyeHeight, z);
    this.camera.rotation.set(0, yaw, 0);
    this.velocity.set(0, 0, 0);
    this.bobTime = 0;
    this.bobOffset = 0;
    this.stepTimer = 0;
  }

  resetKeys() {
    this.keys.clear();
  }

  setMovementEnabled(enabled) {
    this.movementEnabled = enabled;
    if (!enabled) {
      this.velocity.set(0, 0, 0);
      this.resetKeys();
    }
  }

  _onKeyDown(event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.keys.add('Shift');
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      this.keys.add(event.code);
      if (event.code.startsWith('Key')) event.preventDefault();
    }

    if (event.code === 'KeyE' && !event.repeat) {
      if (this.controls.isLocked && this.movementEnabled) {
        this.onInteract();
      }
    }

    if (event.code === 'KeyM' && !event.repeat) {
      this.onMute();
    }
  }

  _onKeyUp(event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      this.keys.delete('Shift');
    }
    this.keys.delete(event.code);
  }

  _blocked(x, z) {
    const radius = this.radius;
    for (let i = 0; i < this.colliders.length; i += 1) {
      const box = this.colliders[i];
      if (
        x > box.minX - radius &&
        x < box.maxX + radius &&
        z > box.minZ - radius &&
        z < box.maxZ + radius
      ) {
        return true;
      }
    }
    return false;
  }

  _moveWithCollisions(dx, dz) {
    const position = this.camera.position;
    if (!this._blocked(position.x + dx, position.z)) {
      position.x += dx;
    }
    if (!this._blocked(position.x, position.z + dz)) {
      position.z += dz;
    }
  }

  update(dt) {
    if (!this.controls.isLocked || !this.movementEnabled) {
      this.velocity.multiplyScalar(Math.exp(-dt * 12));
      this.bobOffset += (0 - this.bobOffset) * Math.min(1, dt * 9);
      const surface = this.getSurfaceHeight(this.camera.position.x, this.camera.position.z);
      this.camera.position.y += (surface + this.eyeHeight - this.camera.position.y) * Math.min(1, dt * 10);
      return;
    }

    let inputX = 0;
    let inputZ = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inputZ += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inputZ -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inputX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inputX += 1;

    this.camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    if (this._forward.lengthSq() < 0.0001) this._forward.set(0, 0, -1);
    this._forward.normalize();
    this._right.crossVectors(this._forward, this._up).normalize();

    const desired = new THREE.Vector3()
      .addScaledVector(this._forward, inputZ)
      .addScaledVector(this._right, inputX);
    if (desired.lengthSq() > 1) desired.normalize();

    const speed = this.keys.has('Shift') ? RUN_SPEED : WALK_SPEED;
    desired.multiplyScalar(speed);

    const responsiveness = desired.lengthSq() > 0 ? 12.5 : 16;
    this.velocity.x += (desired.x - this.velocity.x) * Math.min(1, dt * responsiveness);
    this.velocity.z += (desired.z - this.velocity.z) * Math.min(1, dt * responsiveness);

    this._moveWithCollisions(this.velocity.x * dt, this.velocity.z * dt);

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.18) {
      this.bobTime += dt * (horizontalSpeed > 4 ? 10.2 : 7.4);
      const bobAmplitude = horizontalSpeed > 4 ? 0.032 : 0.022;
      this.bobOffset = Math.sin(this.bobTime) * bobAmplitude;
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = horizontalSpeed > 4 ? 0.34 : 0.51;
        this.steps += 1;
        this.onFootstep(this.steps);
      }
    } else {
      this.bobOffset += (0 - this.bobOffset) * Math.min(1, dt * 9);
    }

    const surface = this.getSurfaceHeight(this.camera.position.x, this.camera.position.z);
    const targetY = surface + this.eyeHeight + this.bobOffset;
    this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, dt * 14);
  }

  get position() {
    return this.camera.position;
  }
}
