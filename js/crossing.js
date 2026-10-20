/**
 * A small Japanese fumikiri (railway level crossing).
 *
 * Visual state only. The train system drives setActive(); the audio engine
 * rings the kan-kan-kan bell from the same active flag.
 */
import * as THREE from 'three';
import {
  addBox,
  addCylinder,
  addPlane,
  createHazardBarrierMaterial,
  standardMaterial,
  createSagWire
} from './world.js';
import { createCrossingRoadTexture, createCrossingSignTexture } from './textures.js';

export class RailwayCrossing {
  constructor(parent, {
    x = 34,
    nearTrackZ = -2.4,
    farTrackZ = -6.0,
    roadWidth = 7.2
  } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'Fumikiri';
    this.group.position.x = x;
    parent.add(this.group);
    this.position = new THREE.Vector3(x, 0, (nearTrackZ + farTrackZ) / 2);

    this.roadWidth = roadWidth;
    this.trackZs = [nearTrackZ, farTrackZ];
    this.active = false;
    this.raiseDelay = 0;
    this.gates = [];
    this.lampMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0x42110c,
        roughness: 0.28,
        metalness: 0.15,
        emissive: 0xff2a1f,
        emissiveIntensity: 0.04
      }),
      new THREE.MeshStandardMaterial({
        color: 0x42110c,
        roughness: 0.28,
        metalness: 0.15,
        emissive: 0xff2a1f,
        emissiveIntensity: 0.04
      })
    ];
    this.lampMeshes = [];

    this._buildRoad();
    this._buildDecking();
    this._buildSignals();
    this._buildGates();
    this._buildWires(nearTrackZ, farTrackZ);
    this._setRaised(true);
  }

  _buildRoad() {
    const roadTexture = createCrossingRoadTexture();
    roadTexture.wrapS = THREE.ClampToEdgeWrapping;
    roadTexture.wrapT = THREE.ClampToEdgeWrapping;
    addPlane(
      this.group,
      this.roadWidth + 0.8,
      41,
      standardMaterial(0xffffff, { map: roadTexture, roughness: 0.97 }),
      0,
      0.012,
      -8.5,
      { receive: true }
    );

    const lineMaterial = standardMaterial(0xe9e4d7, { roughness: 0.85 });
    addBox(this.group, this.roadWidth * 0.47, 0.012, 0.2, lineMaterial, -1.8, 0.03, 3.75, {
      cast: false,
      receive: true
    });
    addBox(this.group, this.roadWidth * 0.47, 0.012, 0.2, lineMaterial, 1.8, 0.03, -10.5, {
      cast: false,
      receive: true
    });

    // Roadside concrete kerbs.
    const kerbMat = standardMaterial(0xa7a193, { roughness: 1 });
    for (const side of [-1, 1]) {
      addBox(this.group, 0.18, 0.16, 39, kerbMat, side * (this.roadWidth / 2 + 0.44), 0.08, -8.5, {
        cast: false,
        receive: true
      });
    }
  }

  _buildDecking() {
    const deckMaterial = standardMaterial(0x4d4942, { roughness: 0.95 });
    const edgeMaterial = standardMaterial(0x7b7467, { roughness: 0.96 });
    this.trackZs.forEach((z) => {
      addBox(this.group, this.roadWidth + 0.55, 0.06, 0.88, deckMaterial, 0, 0.26, z, {
        cast: false,
        receive: true
      });
      addBox(this.group, this.roadWidth + 0.55, 0.07, 0.18, edgeMaterial, 0, 0.255, z - 1.14, {
        cast: false,
        receive: true
      });
      addBox(this.group, this.roadWidth + 0.55, 0.07, 0.18, edgeMaterial, 0, 0.255, z + 1.14, {
        cast: false,
        receive: true
      });
    });
  }

  _buildSignals() {
    this._makeSignal(3.55, 0);
    this._makeSignal(-10.25, Math.PI);
  }

  _makeSignal(z, rotation) {
    const group = new THREE.Group();
    group.position.set(-this.roadWidth / 2 - 0.9, 0, z);
    group.rotation.y = rotation;
    this.group.add(group);

    const poleMat = standardMaterial(0xaeb0a7, { roughness: 0.44, metalness: 0.5 });
    const darkMat = standardMaterial(0x2f302c, { roughness: 0.65, metalness: 0.25 });
    const whiteMat = standardMaterial(0xeee9dd, { roughness: 0.6 });
    const yellowMat = standardMaterial(0xd3b341, { roughness: 0.65 });

    addCylinder(group, 0.075, 0.1, 3.2, poleMat, 0, 1.6, 0, { radialSegments: 8 });
    addCylinder(group, 0.36, 0.32, 0.08, darkMat, 0, 0.045, 0, { radialSegments: 10 });

    // Crossbuck, with a slight dark outline.
    addBox(group, 1.55, 0.17, 0.055, darkMat, 0, 2.45, 0.03, { cast: true, rz: Math.PI / 4 });
    addBox(group, 1.55, 0.17, 0.055, darkMat, 0, 2.45, 0.03, { cast: true, rz: -Math.PI / 4 });
    addBox(group, 1.43, 0.1, 0.06, whiteMat, 0, 2.45, 0.06, { cast: false, rz: Math.PI / 4 });
    addBox(group, 1.43, 0.1, 0.06, whiteMat, 0, 2.45, 0.06, { cast: false, rz: -Math.PI / 4 });
    addBox(group, 0.76, 0.13, 0.058, darkMat, 0, 2.45, 0.09, { cast: false, rz: Math.PI / 4 });
    addBox(group, 0.76, 0.13, 0.058, darkMat, 0, 2.45, 0.09, { cast: false, rz: -Math.PI / 4 });

    // Warning sign.
    addBox(group, 0.82, 1.04, 0.06, darkMat, 0, 1.3, 0.06, { cast: true });
    const signMat = new THREE.MeshStandardMaterial({
      map: createCrossingSignTexture(),
      roughness: 0.72
    });
    addPlane(group, 0.72, 0.92, signMat, 0, 1.3, 0.095, { rx: 0, receive: false });

    // Flashing light housing.
    addBox(group, 0.74, 0.32, 0.21, darkMat, 0, 2.92, 0.03, { cast: true });
    for (const side of [-1, 1]) {
      addCylinder(group, 0.09, 0.1, 0.13, darkMat, side * 0.19, 2.92, 0.17, {
        rx: Math.PI / 2,
        radialSegments: 10,
        cast: false
      });
      const lensMaterial = this.lampMaterials[side === -1 ? 0 : 1];
      const lensGeometry = new THREE.SphereGeometry(0.085, 12, 8);
      const lens = new THREE.Mesh(lensGeometry, lensMaterial);
      lens.position.set(side * 0.19, 2.92, 0.245);
      lens.scale.z = 0.55;
      lens.castShadow = false;
      group.add(lens);
      this.lampMeshes.push(lens);
      // A black hood above each lens.
      addBox(group, 0.22, 0.04, 0.2, darkMat, side * 0.19, 3.04, 0.19, {
        cast: false,
        rz: side * 0.18
      });
    }

    addCylinder(group, 0.16, 0.16, 0.12, yellowMat, 0, 2.2, 0.09, {
      rx: Math.PI / 2,
      radialSegments: 10,
      cast: false
    });
    addBox(group, 0.42, 0.12, 0.07, darkMat, 0, 0.8, 0.1, { cast: false });
  }

  _buildGates() {
    const gateZPositions = [4.05, -10.75];
    for (const z of gateZPositions) {
      this._makeGate(-this.roadWidth / 2 - 0.15, z, 1);
      this._makeGate(this.roadWidth / 2 + 0.15, z, -1);
    }
  }

  _makeGate(x, z, direction) {
    const mount = new THREE.Group();
    mount.position.set(x, 0, z);
    this.group.add(mount);

    const baseMat = standardMaterial(0xbdab78, { roughness: 0.72, metalness: 0.2 });
    const darkMat = standardMaterial(0x4a4b46, { roughness: 0.7, metalness: 0.2 });
    addBox(mount, 0.55, 0.83, 0.55, baseMat, 0, 0.63, 0, { cast: true, receive: true });
    addCylinder(mount, 0.09, 0.09, 0.14, darkMat, 0, 1.14, 0, { radialSegments: 8 });

    const pivot = new THREE.Group();
    pivot.position.set(0, 1.13, 0);
    mount.add(pivot);

    const armLength = this.roadWidth / 2 - 0.2;
    const armMaterial = createHazardBarrierMaterial();
    const arm = addBox(
      pivot,
      armLength,
      0.14,
      0.12,
      armMaterial,
      direction * armLength / 2,
      0,
      0,
      { cast: true, receive: true }
    );
    arm.name = 'CrossingBarrier';
    addBox(pivot, 0.48, 0.18, 0.18, darkMat, direction * 0.3, 0, 0, { cast: true });
    addBox(pivot, 0.15, 0.32, 0.16, darkMat, -direction * 0.23, 0.08, 0, { cast: true });

    // Small reflector at the tip.
    addBox(
      pivot,
      0.16,
      0.18,
      0.14,
      standardMaterial(0xbb4b3d, {
        roughness: 0.4,
        emissive: 0xff2d20,
        emissiveIntensity: 0.45
      }),
      direction * (armLength - 0.1),
      0,
      0,
      { cast: false }
    );

    this.gates.push({
      pivot,
      direction,
      currentAngle: direction * Math.PI / 2,
      targetAngle: direction * Math.PI / 2
    });
  }

  _buildWires(nearTrackZ, farTrackZ) {
    // Utility wires continue past the crossing, giving it depth.
    const anchors = [
      [-5.7, 4.9, 8],
      [5.9, 4.9, 8],
      [-5.7, 4.9, -22],
      [5.9, 4.9, -22]
    ];
    for (const [x, y, z] of anchors) {
      addCylinder(
        this.group,
        0.055,
        0.08,
        5,
        standardMaterial(0x77766d, { roughness: 0.75 }),
        x,
        2.5,
        z,
        { radialSegments: 7, cast: false }
      );
    }
    createSagWire(this.group, new THREE.Vector3(-5.8, 4.3, 7.2), new THREE.Vector3(5.8, 4.3, 7.2), 0.75);
  }

  _setRaised(raised) {
    for (const gate of this.gates) {
      gate.currentAngle = raised ? gate.direction * Math.PI / 2 : 0;
      gate.targetAngle = gate.currentAngle;
      gate.pivot.rotation.z = gate.currentAngle;
    }
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    if (active) {
      this.raiseDelay = 0;
      for (const gate of this.gates) {
        gate.targetAngle = 0;
      }
    } else {
      this.raiseDelay = 1.25;
    }
  }

  update(dt, elapsed) {
    let blinking = false;
    if (this.active) {
      blinking = true;
    } else if (this.raiseDelay > 0) {
      this.raiseDelay -= dt;
      blinking = true;
      if (this.raiseDelay <= 0) {
        for (const gate of this.gates) {
          gate.targetAngle = gate.direction * Math.PI / 2;
        }
      }
    }

    const flash = Math.floor(elapsed * 2.35) % 2;
    this.lampMaterials[0].emissiveIntensity = blinking && flash === 0 ? 4.2 : 0.025;
    this.lampMaterials[1].emissiveIntensity = blinking && flash === 1 ? 4.2 : 0.025;

    for (const gate of this.gates) {
      const difference = gate.targetAngle - gate.currentAngle;
      if (Math.abs(difference) > 0.0005) {
        gate.currentAngle += difference * Math.min(1, dt * 1.35);
        gate.pivot.rotation.z = gate.currentAngle;
      }
    }
  }

  get activeState() {
    return this.active;
  }
}
