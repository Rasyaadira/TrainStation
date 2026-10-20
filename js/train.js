/**
 * Three-car local train, arrival schedule, sliding doors and boarding checks.
 *
 * State machine:
 *   waiting -> arriving -> boarding (20 s) -> closing -> departing -> waiting
 *
 * The level crossing is activated for the whole arrival/stop/departure window.
 * Station modules provide the crossing and destination names when setStation()
 * is called, so the same train can serve any number of stations.
 */
import * as THREE from 'three';
import {
  addBox,
  addCylinder,
  addCylinderBetween,
  standardMaterial
} from './world.js';
import { createTrainDestinationTexture } from './textures.js';

const CAR_OFFSETS = [-12.3, 0, 12.3];
const DOOR_LOCAL_X = 2.4;
const DOOR_LOCAL_Z = 1.445;
const BODY_Z = 0;
const BOARDING_TIME = 20;
const MAX_APPROACH_DISTANCE = 130;

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();

export class TrainSystem {
  constructor(scene, { onEvent = () => {} } = {}) {
    this.scene = scene;
    this.onEvent = onEvent;
    this.group = new THREE.Group();
    this.group.name = 'LocalTrain';
    this.group.visible = false;
    this.scene.add(this.group);

    this.trackZ = -2.4;
    this.platformEdgeZ = 0;
    this.crossing = null;
    this.crossingReleaseDelay = 4.4;
    this.destination = { nameJP: '青凪駅', nameEN: 'Aonagi Station' };
    this.state = 'waiting';
    this.stateTime = 0;
    this.waitTime = 18;
    this.boardingTimer = BOARDING_TIME;
    this.doorOpen = 0;
    this.previousX = -MAX_APPROACH_DISTANCE;
    this.speedRatio = 0;
    this.doors = [];
    this.destinationMaterials = [];
    this.destinationTextures = [];
    this.crossingActiveLastFrame = false;

    this._buildTrain();
    this._setDestination(this.destination);
    this.group.position.set(-MAX_APPROACH_DISTANCE - 30, 0, this.trackZ);
  }

  setStation({
    crossing = null,
    destination = null,
    trackZ = -2.4,
    platformEdgeZ = 0,
    initialDelay = 42,
    crossingReleaseDelay = 4.4
  } = {}) {
    this.crossing?.setActive(false);
    this.crossing = crossing;
    this.crossingReleaseDelay = crossingReleaseDelay;
    this.trackZ = trackZ;
    this.platformEdgeZ = platformEdgeZ;
    this.group.position.set(-MAX_APPROACH_DISTANCE - 30, 0, trackZ);
    this.group.visible = false;
    this.state = 'waiting';
    this.stateTime = 0;
    this.waitTime = Math.max(8, initialDelay);
    this.boardingTimer = BOARDING_TIME;
    this.doorOpen = 0;
    this.previousX = -MAX_APPROACH_DISTANCE - 30;
    this.speedRatio = 0;
    this._applyDoorPositions();
    if (destination) this._setDestination(destination);
  }

  _setDestination(destination) {
    this.destination = destination;
    const texture = createTrainDestinationTexture(destination.nameJP, destination.nameEN);
    for (const material of this.destinationMaterials) {
      const oldMap = material.map;
      material.map = texture;
      material.emissiveMap = texture;
      material.needsUpdate = true;
      if (oldMap && oldMap !== texture) oldMap.dispose();
    }
    this.destinationTextures.push(texture);
    // Keep only the current texture; old maps are disposed above.
    this.destinationTextures = [texture];
  }

  _buildTrain() {
    const cream = standardMaterial(0xe8e3d7, { roughness: 0.54, metalness: 0.08 });
    const creamDark = standardMaterial(0xd3cdc0, { roughness: 0.62, metalness: 0.08 });
    const green = standardMaterial(0x668478, { roughness: 0.48, metalness: 0.14 });
    const orange = standardMaterial(0xc08057, { roughness: 0.48, metalness: 0.12 });
    const roof = standardMaterial(0x8f938d, { roughness: 0.78, metalness: 0.18 });
    const darkMetal = standardMaterial(0x3e423f, { roughness: 0.52, metalness: 0.38 });
    const rubber = standardMaterial(0x292c29, { roughness: 0.85 });
    const silver = standardMaterial(0xc6c8c1, { roughness: 0.34, metalness: 0.5 });
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x536b6e,
      roughness: 0.18,
      metalness: 0.22,
      emissive: 0xffe7b5,
      emissiveIntensity: 0.16
    });
    const warmInterior = new THREE.MeshStandardMaterial({
      color: 0x95846b,
      roughness: 0.86,
      emissive: 0xffdba5,
      emissiveIntensity: 1.15
    });
    const interiorSeat = standardMaterial(0x68766c, { roughness: 0.94 });
    const interiorFloor = standardMaterial(0x47463f, { roughness: 0.9 });

    this.carGroups = [];
    const wheelTransforms = [];

    CAR_OFFSETS.forEach((carOffset, carIndex) => {
      const car = new THREE.Group();
      car.position.set(carOffset, 0, BODY_Z);
      car.name = `TrainCar_${carIndex + 1}`;
      this.group.add(car);
      this.carGroups.push(car);

      // Main body and lower skirt.
      addBox(car, 11.7, 2.78, 2.82, cream, 0, 2.48, 0, {
        cast: true,
        receive: true
      });
      addBox(car, 11.55, 0.55, 2.62, creamDark, 0, 1.16, 0, {
        cast: true,
        receive: true
      });
      addBox(car, 11.48, 0.2, 2.55, darkMetal, 0, 0.86, 0, {
        cast: true,
        receive: true
      });

      // Roof cap and equipment.
      addBox(car, 11.6, 0.2, 2.72, roof, 0, 3.94, 0, {
        cast: true,
        receive: true
      });
      addBox(car, 11.1, 0.07, 2.25, roof, 0, 4.075, 0, {
        cast: true,
        receive: true
      });
      for (const acX of [-2.8, 2.8]) {
        addBox(car, 1.9, 0.28, 1.12, standardMaterial(0xb0b2aa, { roughness: 0.72 }), acX, 4.2, 0, {
          cast: true,
          receive: true
        });
      }

      // Route band.
      addBox(car, 11.72, 0.16, 0.055, green, 0, 1.67, 1.436, {
        cast: false,
        receive: false
      });
      addBox(car, 11.72, 0.055, 0.054, orange, 0, 1.55, 1.437, {
        cast: false,
        receive: false
      });
      addBox(car, 11.72, 0.075, 0.055, creamDark, 0, 1.28, 1.436, {
        cast: false,
        receive: false
      });

      // Windows on the platform-facing side.
      const windowXs = [-4.8, -3.7, -2.6, -1.5, -0.4, 0.72];
      for (const wx of windowXs) {
        addBox(car, 0.92, 0.74, 0.04, rubber, wx, 2.88, 1.435, {
          cast: false,
          receive: false
        });
        addBox(car, 0.82, 0.65, 0.045, windowMaterial, wx, 2.88, 1.448, {
          cast: false,
          receive: false
        });
        addBox(car, 0.035, 0.65, 0.05, rubber, wx, 2.88, 1.455, {
          cast: false,
          receive: false
        });
      }
      // A last small window to the right of the door.
      addBox(car, 0.64, 0.74, 0.04, rubber, 4.65, 2.88, 1.435, {
        cast: false,
        receive: false
      });
      addBox(car, 0.55, 0.65, 0.045, windowMaterial, 4.65, 2.88, 1.448, {
        cast: false,
        receive: false
      });

      // Doors on the platform side.
      const doorCenter = new THREE.Group();
      doorCenter.position.set(DOOR_LOCAL_X, 1.07, DOOR_LOCAL_Z);
      car.add(doorCenter);

      // The warm interior sits just proud of the body so it is visible when
      // the two door leaves slide apart. Frame pieces border, not cover, it.
      addBox(doorCenter, 1.18, 2.04, 0.035, warmInterior, 0, 1.02, 0.004, {
        cast: false,
        receive: false
      });
      addBox(doorCenter, 1.12, 0.12, 0.045, interiorFloor, 0, 0.06, 0.025, {
        cast: false,
        receive: false
      });
      for (const side of [-1, 1]) {
        addBox(doorCenter, 0.24, 0.46, 0.04, interiorSeat, side * 0.45, 0.47, 0.03, {
          cast: false,
          receive: false
        });
        addBox(doorCenter, 0.04, 0.78, 0.05, interiorSeat, side * 0.43, 0.76, 0.055, {
          cast: false,
          receive: false
        });
        addBox(doorCenter, 0.065, 2.14, 0.085, rubber, side * 0.645, 1.02, 0.03, {
          cast: false,
          receive: false
        });
        addCylinder(doorCenter, 0.018, 0.018, 1.55, silver, side * 0.37, 1.05, 0.025, {
          radialSegments: 6,
          cast: false
        });
      }
      addBox(doorCenter, 1.22, 0.08, 0.085, rubber, 0, 2.05, 0.03, {
        cast: false,
        receive: false
      });
      addBox(doorCenter, 1.22, 0.1, 0.085, rubber, 0, 0.0, 0.03, {
        cast: false,
        receive: false
      });
      addBox(
        doorCenter,
        0.32,
        0.06,
        0.04,
        standardMaterial(0xfff0cf, {
          roughness: 0.3,
          emissive: 0xffdfa8,
          emissiveIntensity: 1.3
        }),
        0,
        1.9,
        0.04,
        { cast: false, receive: false }
      );

      const leftDoor = new THREE.Group();
      const rightDoor = new THREE.Group();
      doorCenter.add(leftDoor, rightDoor);
      for (const [doorGroup, side] of [[leftDoor, -1], [rightDoor, 1]]) {
        doorGroup.position.x = side * 0.29;
        addBox(doorGroup, 0.57, 2.02, 0.05, silver, 0, 1.02, 0.075, {
          cast: true,
          receive: true
        });
        addBox(doorGroup, 0.46, 0.62, 0.05, windowMaterial, 0, 1.47, 0.105, {
          cast: false,
          receive: false
        });
        addBox(doorGroup, 0.49, 0.04, 0.05, darkMetal, 0, 0.74, 0.112, {
          cast: false,
          receive: false
        });
        addBox(doorGroup, 0.03, 0.06, 0.06, darkMetal, -side * 0.24, 1.05, 0.112, {
          cast: false,
          receive: false
        });
      }
      this.doors.push({
        car,
        center: doorCenter,
        left: leftDoor,
        right: rightDoor,
        closedLeftX: -0.29,
        closedRightX: 0.29,
        localX: DOOR_LOCAL_X
      });

      // Destination panel above the doors.
      const signMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.45,
        emissive: 0xffffff,
        emissiveIntensity: 0.64
      });
      addBox(car, 1.68, 0.42, 0.035, darkMetal, DOOR_LOCAL_X, 3.47, 1.445, {
        cast: false,
        receive: false
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.34), signMaterial);
      sign.position.set(DOOR_LOCAL_X, 3.47, 1.468);
      car.add(sign);
      this.destinationMaterials.push(signMaterial);

      // Small car-end doors and couplers.
      addBox(car, 0.1, 2.0, 1.05, creamDark, 5.84, 2.35, 0, {
        cast: false,
        receive: false
      });
      addBox(car, 0.1, 2.0, 1.05, creamDark, -5.84, 2.35, 0, {
        cast: false,
        receive: false
      });
      addCylinder(car, 0.13, 0.13, 0.75, darkMetal, 6.1, 1.0, 0, {
        rx: 0,
        rz: Math.PI / 2,
        radialSegments: 8,
        cast: false
      });
      addCylinder(car, 0.13, 0.13, 0.75, darkMetal, -6.1, 1.0, 0, {
        rx: 0,
        rz: Math.PI / 2,
        radialSegments: 8,
        cast: false
      });

      // Bogies and axle positions.
      for (const bogieX of [-3.7, 3.7]) {
        addBox(car, 2.2, 0.38, 1.9, darkMetal, bogieX, 0.64, 0, {
          cast: true,
          receive: true
        });
        for (const axleX of [-0.72, 0.72]) {
          for (const wheelZ of [-0.98, 0.98]) {
            wheelTransforms.push({
              x: carOffset + bogieX + axleX,
              y: 0.46,
              z: wheelZ
            });
          }
        }
      }

    });

    // Leading cab face and lights on the +X car.
    const cabCar = this.carGroups[this.carGroups.length - 1];
    const cabGlass = new THREE.MeshStandardMaterial({
      color: 0x283638,
      roughness: 0.13,
      metalness: 0.28,
      emissive: 0xffe4b1,
      emissiveIntensity: 0.08
    });
    addBox(cabCar, 0.035, 1.05, 2.18, cabGlass, 5.89, 2.94, 0, {
      cast: false,
      receive: false
    });
    for (const z of [-0.82, 0.82]) {
      addBox(
        cabCar,
        0.04,
        0.2,
        0.3,
        standardMaterial(0xfff4d4, {
          roughness: 0.3,
          emissive: 0xffe7b0,
          emissiveIntensity: 1.6
        }),
        5.905,
        1.55,
        z,
        { cast: false, receive: false }
      );
    }
    addBox(cabCar, 0.12, 0.17, 2.6, darkMetal, 5.89, 1.05, 0, {
      cast: false,
      receive: false
    });

    // Wheels as one instanced draw call.
    const wheelGeometry = new THREE.CylinderGeometry(0.33, 0.33, 0.17, 12);
    wheelGeometry.rotateX(Math.PI / 2);
    const wheelMaterial = standardMaterial(0x2f312f, { roughness: 0.58, metalness: 0.34 });
    const wheels = new THREE.InstancedMesh(wheelGeometry, wheelMaterial, wheelTransforms.length);
    wheels.castShadow = true;
    wheels.receiveShadow = true;
    const dummy = new THREE.Object3D();
    wheelTransforms.forEach((position, index) => {
      dummy.position.set(position.x, position.y, position.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      wheels.setMatrixAt(index, dummy.matrix);
    });
    wheels.instanceMatrix.needsUpdate = true;
    wheels.computeBoundingSphere();
    wheels.name = 'TrainWheels';
    this.group.add(wheels);

    // Simple pantograph on the centre car.
    const pantoMat = standardMaterial(0x545852, { roughness: 0.54, metalness: 0.6 });
    const centre = this.carGroups[1];
    addBox(centre, 1.3, 0.08, 0.8, pantoMat, 0, 4.24, 0, { cast: false });
    addCylinderBetween(
      centre,
      new THREE.Vector3(-0.45, 4.25, -0.28),
      new THREE.Vector3(0.05, 5.12, 0.05),
      0.025,
      pantoMat,
      5
    );
    addCylinderBetween(
      centre,
      new THREE.Vector3(0.45, 4.25, 0.28),
      new THREE.Vector3(-0.05, 5.12, -0.05),
      0.025,
      pantoMat,
      5
    );
    addBox(centre, 1.55, 0.035, 0.06, pantoMat, 0, 5.15, 0, { cast: false });

    this._applyDoorPositions();
  }

  _applyDoorPositions() {
    for (const door of this.doors) {
      const spread = this.doorOpen * 0.56;
      door.left.position.x = door.closedLeftX - spread;
      door.right.position.x = door.closedRightX + spread;
    }
  }

  _enterWaiting() {
    this.state = 'waiting';
    this.stateTime = 0;
    // A complete arrival-to-arrival cycle is roughly 60–90 seconds:
    // 9 s approach + 20 s doors + 1 s closing + 8.5 s departure + 22–49 s wait.
    this.waitTime = 22 + Math.random() * 27;
    this.group.visible = false;
    this.group.position.x = -MAX_APPROACH_DISTANCE - 30;
    this.doorOpen = 0;
    this._applyDoorPositions();
    this.crossing?.setActive(false);
  }

  _enterArriving() {
    this.state = 'arriving';
    this.stateTime = 0;
    this.group.visible = true;
    this.group.position.x = -MAX_APPROACH_DISTANCE;
    this.previousX = -MAX_APPROACH_DISTANCE;
    this.doorOpen = 0;
    this._applyDoorPositions();
    this.crossing?.setActive(true);
    this.onEvent('approach');
  }

  _enterBoarding() {
    this.state = 'boarding';
    this.stateTime = 0;
    this.boardingTimer = BOARDING_TIME;
    this.doorOpen = 0.04;
    this.crossing?.setActive(true);
    this.onEvent('doorsOpen');
  }

  _enterClosing() {
    this.state = 'closing';
    this.stateTime = 0;
    this.onEvent('doorsClose');
  }

  _enterDeparting() {
    this.state = 'departing';
    this.stateTime = 0;
    this.onEvent('depart');
  }

  update(dt, playerPosition) {
    if (!playerPosition) return this._metrics(playerPosition);
    this.stateTime += dt;
    const previousPositionX = this.group.position.x;

    if (this.state === 'waiting') {
      this.waitTime -= dt;
      this.doorOpen = Math.max(0, this.doorOpen - dt * 3.5);
      this._applyDoorPositions();
      if (this.waitTime <= 0) this._enterArriving();
    } else if (this.state === 'arriving') {
      const duration = 9.2;
      const p = Math.min(1, this.stateTime / duration);
      this.group.position.x = -MAX_APPROACH_DISTANCE * (1 - p) * (1 - p);
      this.doorOpen = 0;
      if (p >= 1) {
        this.group.position.x = 0;
        this._enterBoarding();
      }
    } else if (this.state === 'boarding') {
      this.group.position.x = 0;
      this.doorOpen = Math.min(1, this.doorOpen + dt * 1.25);
      this.boardingTimer -= dt;
      this._applyDoorPositions();
      if (this.boardingTimer <= 0) this._enterClosing();
    } else if (this.state === 'closing') {
      this.doorOpen = Math.max(0, this.doorOpen - dt * 1.15);
      this._applyDoorPositions();
      if (this.doorOpen <= 0) this._enterDeparting();
    } else if (this.state === 'departing') {
      const duration = 8.5;
      const p = Math.min(1, this.stateTime / duration);
      this.group.position.x = 150 * p * p;
      this.doorOpen = 0;
      if (this.crossing && this.stateTime > this.crossingReleaseDelay) {
        this.crossing.setActive(false);
      }
      if (p >= 1) this._enterWaiting();
    }

    const distance = Math.hypot(
      this.group.position.x - playerPosition.x,
      this.trackZ - playerPosition.z
    );
    const moved = Math.abs(this.group.position.x - previousPositionX) / Math.max(dt, 0.0001);
    this.speedRatio = THREE.MathUtils.clamp(moved / 28, 0, 1);

    const crossingDistance = this.crossing
      ? Math.hypot(
          this.crossing.position.x - playerPosition.x,
          this.crossing.position.z - playerPosition.z
        )
      : 140;

    return {
      state: this.state,
      crossingActive: this.crossing?.activeState ?? false,
      crossingDistance,
      trainDistance: distance,
      trainSpeedRatio: this.speedRatio,
      doorsOpen: this.doorOpen,
      position: this.group.position,
      boardingTimer: this.boardingTimer
    };
  }

  _metrics(playerPosition) {
    return {
      state: this.state,
      crossingActive: this.crossing?.activeState ?? false,
      crossingDistance: 140,
      trainDistance: 160,
      trainSpeedRatio: 0,
      doorsOpen: this.doorOpen,
      position: this.group.position,
      boardingTimer: this.boardingTimer
    };
  }

  getInteraction(playerPosition) {
    if (this.state !== 'boarding' || this.doorOpen < 0.78) return null;
    if (playerPosition.z > this.platformEdgeZ + 2.35 || playerPosition.z < this.platformEdgeZ - 0.15) {
      return null;
    }

    let nearest = null;
    let nearestDistance = Infinity;
    for (const carOffset of CAR_OFFSETS) {
      const doorWorldX = this.group.position.x + carOffset + DOOR_LOCAL_X;
      const dx = Math.abs(playerPosition.x - doorWorldX);
      if (dx > 1.55) continue;
      const zGap = Math.abs(playerPosition.z - (this.trackZ + DOOR_LOCAL_Z));
      const distance = Math.hypot(dx, zGap);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = doorWorldX;
      }
    }

    if (nearest === null || nearestDistance > 2.9) return null;
    return {
      type: 'board-train',
      prompt: `Board the local for ${this.destination.nameEN}`,
      distance: nearestDistance,
      target: this
    };
  }

  getStatusInfo() {
    if (this.state === 'waiting') {
      const seconds = Math.max(0, Math.ceil(this.waitTime));
      const minutes = Math.floor(seconds / 60);
      const remainder = String(seconds % 60).padStart(2, '0');
      return {
        text: seconds > 0 ? `Next local in ${minutes}:${remainder}` : 'Local arriving',
        mode: 'normal'
      };
    }
    if (this.state === 'arriving') {
      return { text: 'Local approaching · please stand back', mode: 'warning' };
    }
    if (this.state === 'boarding') {
      if (this.doorOpen < 0.7) return { text: 'Doors opening', mode: 'boarding' };
      return {
        text: `Doors open · ${Math.max(0, Math.ceil(this.boardingTimer))}s to board`,
        mode: 'boarding'
      };
    }
    if (this.state === 'closing') {
      return { text: 'Doors closing · stand clear', mode: 'warning' };
    }
    if (this.state === 'departing') {
      return { text: 'Local departing', mode: 'warning' };
    }
    return { text: 'Local line', mode: 'normal' };
  }
}
