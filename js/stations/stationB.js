/**
 * Station B — Aonagi (青凪駅)
 * A busier city platform: a wide canopy, glass station frontage, an overhead
 * concourse, denser signage and taller buildings in the warm midday haze.
 */
import * as THREE from 'three';
import { StationBase } from './base.js';
import {
  addBox,
  addCylinder,
  addPlane,
  createBench,
  createBillboard,
  createBuildingTextureSet,
  createCanopy,
  createCatenaryGantry,
  createCityBuilding,
  createDapplePatches,
  createFallenLeaves,
  createFence,
  createGrassTufts,
  createLamp,
  createPlatform,
  createPlatformNumber,
  createPosterPanel,
  createSagWire,
  createSpeakerPole,
  createStationSign,
  createTimetableBoard,
  createTracks,
  createTreeCluster,
  createVerticalSign,
  DriftingLeaves,
  makeGround,
  standardMaterial
} from '../world.js';
import {
  createAsphaltTexture,
  createBillboardTexture,
  createGrassTexture,
  createLedBoardTexture,
  createVerticalSignTexture
} from '../textures.js';
import { VendingMachine } from '../vending.js';
import { RailwayCrossing } from '../crossing.js';

const TRACK_NEAR_Z = -2.4;
const TRACK_FAR_Z = -6.0;
const PLATFORM_TOP = 1.0;
const BOUNDS = { xMin: -34, xMax: 34, zMin: 0, zMax: 9.4 };

export class StationB extends StationBase {
  constructor() {
    super({
      id: 'stationB',
      nameJP: '青凪駅',
      nameEN: 'Aonagi Station',
      platformTop: PLATFORM_TOP,
      platformBounds: BOUNDS,
      spawn: { x: 12.2, z: 4.95, yaw: -0.04 },
      arrivalDelay: 38,
      crossingReleaseDelay: 1.8,
      mood: {
        skyTop: 0xa5c8e1,
        skyHorizon: 0xf1e7d4,
        fogColor: 0xeee8de,
        fogDensity: 0.0049,
        sunColor: 0xfff0d5,
        sunIntensity: 2.65,
        hemiSky: 0xdcebf3,
        hemiGround: 0xb9a287,
        hemiIntensity: 1.42,
        exposure: 1.1,
        cloudOpacity: 0.64
      }
    });
    this.trackZ = TRACK_NEAR_Z;
  }

  buildStation() {
    this._buildGround();
    this._buildTracks();
    this._buildPlatform();
    this._buildStationBuilding();
    this._buildCanopyAndSigns();
    this._buildCrossing();
    this._buildOverpass();
    this._buildProps();
    this._buildCatenary();
    this._buildCity();
    this._buildVegetation();
    this._buildCollision();
  }

  _buildGround() {
    makeGround(this.group, {
      size: 320,
      texture: createGrassTexture(30, 30)
    });

    const roadMat = standardMaterial(0xffffff, {
      map: createAsphaltTexture(3, 7),
      roughness: 0.98
    });
    addPlane(this.group, 9, 34, roadMat, -42, 0.014, 18, { receive: true });

    const cityRoad = standardMaterial(0xffffff, {
      map: createAsphaltTexture(10, 1),
      roughness: 1
    });
    addPlane(this.group, 180, 6.5, cityRoad, 0, 0.018, -13.5, { receive: true });
    addPlane(this.group, 180, 5.5, cityRoad, 0, 0.018, -30.5, { receive: true });
  }

  _buildTracks() {
    createTracks(this.group, {
      nearZ: TRACK_NEAR_Z,
      farZ: TRACK_FAR_Z,
      xMin: -150,
      xMax: 150,
      sleeperSpacing: 0.7
    });
  }

  _buildPlatform() {
    createPlatform(this.group, {
      length: BOUNDS.xMax - BOUNDS.xMin,
      depth: BOUNDS.zMax - BOUNDS.zMin,
      zStart: BOUNDS.zMin,
      height: PLATFORM_TOP
    });

    // End barriers read as maintenance-gate panels.
    const gateMat = standardMaterial(0x70766f, { roughness: 0.62, metalness: 0.2 });
    for (const side of [-1, 1]) {
      addBox(this.group, 0.1, 1.15, 8.8, gateMat, side * 33.7, PLATFORM_TOP + 0.57, 4.7, {
        cast: true,
        receive: true
      });
      for (let i = 0; i < 4; i += 1) {
        addBox(this.group, 0.14, 1.15, 0.14, gateMat, side * 33.7, PLATFORM_TOP + 0.57, 0.8 + i * 2.5, {
          cast: true,
          receive: true
        });
      }
    }

    createFence(this.group, {
      xStart: -34,
      xEnd: -20,
      z: 9.05,
      y: PLATFORM_TOP,
      height: 1.0,
      color: 0xb9b3a5
    });
    createFence(this.group, {
      xStart: 21,
      xEnd: 34,
      z: 9.05,
      y: PLATFORM_TOP,
      height: 1.0,
      color: 0xb9b3a5
    });
  }

  _buildStationBuilding() {
    const wall = standardMaterial(0xd8d2c5, { roughness: 0.82 });
    const wallDark = standardMaterial(0xb9b2a4, { roughness: 0.9 });
    const trim = standardMaterial(0xe7e1d4, { roughness: 0.78 });
    const roof = standardMaterial(0x787c75, { roughness: 0.8, metalness: 0.14 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x556e73,
      roughness: 0.16,
      metalness: 0.2,
      emissive: 0xffe4b2,
      emissiveIntensity: 0.12
    });
    const dark = standardMaterial(0x3e4541, { roughness: 0.55, metalness: 0.25 });

    // A long low station building behind the platform.
    addBox(this.group, 42, 5.4, 4.6, wall, -2, 3.7, 11.55, {
      cast: true,
      receive: true
    });
    addBox(this.group, 42.5, 0.25, 5.0, trim, -2, 6.5, 11.55, {
      cast: true,
      receive: true
    });
    addBox(this.group, 42.8, 0.18, 5.2, roof, -2, 6.7, 11.55, {
      cast: true,
      receive: true
    });
    addBox(this.group, 40.5, 0.14, 1.6, wallDark, -2, 1.7, 9.28, {
      cast: true,
      receive: true
    });

    // Glazed frontage with mullions.
    addBox(this.group, 35, 2.35, 0.08, glass, -2, 3.55, 9.235, {
      cast: false,
      receive: true
    });
    for (let x = -19.4; x <= 15.4; x += 3.2) {
      addBox(this.group, 0.1, 2.5, 0.12, dark, x, 3.55, 9.22, {
        cast: false,
        receive: true
      });
    }
    addBox(this.group, 35.2, 0.1, 0.13, dark, -2, 2.32, 9.22, { cast: false });
    addBox(this.group, 35.2, 0.1, 0.13, dark, -2, 4.76, 9.22, { cast: false });

    // Entrance doors.
    addBox(this.group, 3.6, 2.4, 0.1, standardMaterial(0x4a5856, { roughness: 0.24, metalness: 0.18 }), -2, 3.08, 9.17, {
      cast: false,
      receive: true
    });
    addBox(this.group, 0.08, 2.3, 0.16, trim, -3.8, 3.05, 9.12, { cast: false });
    addBox(this.group, 0.08, 2.3, 0.16, trim, -0.2, 3.05, 9.12, { cast: false });
    addBox(this.group, 3.0, 0.06, 0.2, trim, -2, 1.84, 9.1, { cast: false });

    // Awning over the doors.
    addBox(this.group, 46, 0.18, 1.55, trim, -2, 5.1, 8.65, {
      cast: true,
      receive: true
    });
    addBox(this.group, 46, 0.08, 0.1, dark, -2, 5.0, 7.9, { cast: false });

    // Roof signage.
    createStationSign(this.group, {
      x: -2,
      y: 6.0,
      z: 9.2,
      ry: Math.PI,
      nameJP: '青凪',
      nameEN: 'Aonagi',
      lineColor: '#617f82',
      prevJP: '昼下がり',
      nextJP: '海辺',
      width: 4.5
    });

    // Wall clock.
    addCylinder(this.group, 0.36, 0.36, 0.07, trim, 17.7, 4.85, 9.14, {
      rx: Math.PI / 2,
      radialSegments: 24,
      cast: false
    });
    addCylinder(this.group, 0.3, 0.3, 0.075, standardMaterial(0xf3eee3, { roughness: 0.7 }), 17.7, 4.85, 9.1, {
      rx: Math.PI / 2,
      radialSegments: 24,
      cast: false
    });
    addBox(this.group, 0.02, 0.17, 0.03, dark, 17.7, 4.91, 9.06, { cast: false });
    addBox(this.group, 0.12, 0.02, 0.03, dark, 17.76, 4.85, 9.06, {
      cast: false,
      rz: -0.45
    });

    // Warm ticket-machine glow glimpsed through the glass.
    addBox(this.group, 0.9, 1.5, 0.16, standardMaterial(0xe8dcc5, {
      roughness: 0.38,
      emissive: 0xffd798,
      emissiveIntensity: 0.42
    }), 10.5, 2.55, 9.06, { cast: false });
  }

  _buildCanopyAndSigns() {
    this.canopy = createCanopy(this.group, {
      x: -1,
      z: 1.9,
      length: 36,
      depth: 6.1,
      baseY: PLATFORM_TOP,
      height: 3.5,
      columns: 5,
      roofColor: 0xd0cabb,
      undersideColor: 0x9a8a74
    });

    createStationSign(this.group, {
      x: -13.5,
      y: 3.2,
      z: 3.3,
      nameJP: '青凪',
      nameEN: 'Aonagi',
      lineColor: '#617f82',
      prevJP: '昼下がり',
      nextJP: '海辺',
      hanging: true,
      roofY: PLATFORM_TOP + 3.5
    });

    // LED departure board suspended under the canopy.
    const boardGroup = new THREE.Group();
    boardGroup.position.set(-5.2, 3.55, 3.15);
    this.group.add(boardGroup);
    const darkMat = standardMaterial(0x282c29, { roughness: 0.55, metalness: 0.25 });
    addBox(boardGroup, 2.9, 1.0, 0.14, darkMat, 0, 0, 0, { cast: true, receive: true });
    const ledTexture = createLedBoardTexture({
      title: 'DEPARTURES · 発車標',
      rows: [
        { time: '12:43', dest: '各停  昼下がり', track: '1' },
        { time: '12:58', dest: '各停  海辺', track: '2' },
        { time: '13:12', dest: '快速  港町', track: '2' }
      ]
    });
    const ledMat = new THREE.MeshStandardMaterial({
      map: ledTexture,
      emissiveMap: ledTexture,
      emissive: 0xffc97a,
      emissiveIntensity: 1.0,
      roughness: 0.55
    });
    addPlane(boardGroup, 2.7, 0.84, ledMat, 0, 0, 0.076, { rx: 0, receive: false });
    const rodMat = standardMaterial(0x55574f, { roughness: 0.6 });
    for (const x of [-1.1, 1.1]) {
      addCylinder(boardGroup, 0.025, 0.025, 1.1, rodMat, x, 0.97, 0, {
        radialSegments: 6,
        cast: false
      });
    }

    // Wayfinding signs beneath the canopy.
    const directionSign = new THREE.Group();
    directionSign.position.set(12.5, 3.5, 4.0);
    this.group.add(directionSign);
    addBox(directionSign, 2.1, 0.48, 0.08, standardMaterial(0x405e60, { roughness: 0.6 }), 0, 0, 0, {
      cast: true,
      receive: true
    });
    const dirTexture = createLedBoardTexture({
      title: '↑  CENTRAL EXIT    ↑',
      rows: [{ time: '12:43', dest: '改札・出口', track: 'EAST' }]
    });
    const dirMat = new THREE.MeshStandardMaterial({
      map: dirTexture,
      emissiveMap: dirTexture,
      emissive: 0xf1dab0,
      emissiveIntensity: 0.22,
      roughness: 0.6
    });
    addPlane(directionSign, 1.95, 0.35, dirMat, 0, 0, 0.05, { rx: 0, receive: false });
    for (const x of [-0.7, 0.7]) {
      addCylinder(directionSign, 0.02, 0.02, 1.2, rodMat, x, 0.85, 0, {
        radialSegments: 6,
        cast: false
      });
    }
  }

  _buildCrossing() {
    this.crossing = new RailwayCrossing(this.group, {
      x: -42,
      nearTrackZ: TRACK_NEAR_Z,
      farTrackZ: TRACK_FAR_Z,
      roadWidth: 7.6
    });
  }

  _buildOverpass() {
    const x = 26.0;
    const zCenter = -4.2;
    const concrete = standardMaterial(0xb9b4a8, { roughness: 0.9 });
    const steel = standardMaterial(0x686f6a, { roughness: 0.48, metalness: 0.4 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x83999b,
      roughness: 0.2,
      metalness: 0.15,
      transparent: true,
      opacity: 0.45
    });
    const darkGlass = new THREE.MeshStandardMaterial({
      color: 0x4d6064,
      roughness: 0.18,
      metalness: 0.2,
      emissive: 0xffe1ac,
      emissiveIntensity: 0.06
    });

    // Enclosed footbridge crossing both tracks.
    addBox(this.group, 3.4, 0.38, 23, concrete, x, 6.35, zCenter, {
      cast: true,
      receive: true
    });
    addBox(this.group, 3.0, 2.25, 22.4, darkGlass, x, 7.65, zCenter, {
      cast: true,
      receive: true
    });
    addBox(this.group, 3.55, 0.2, 23.2, steel, x, 8.8, zCenter, {
      cast: true,
      receive: true
    });
    for (const side of [-1, 1]) {
      addBox(this.group, 0.08, 2.4, 22.8, glass, x + side * 1.72, 7.75, zCenter, {
        cast: false,
        receive: false
      });
      for (let z = -14; z <= 8; z += 2.4) {
        addBox(this.group, 0.12, 2.5, 0.1, steel, x + side * 1.76, 7.75, z, {
          cast: false,
          receive: false
        });
      }
    }
    for (const z of [8.3, -16.7]) {
      addBox(this.group, 2.8, 6.4, 1.2, concrete, x, 3.2, z, {
        cast: true,
        receive: true
      });
    }

    // Stair tower softening the junction with the station roof.
    addBox(this.group, 4.0, 5.5, 4.2, concrete, x + 3.4, 3.75, 11.8, {
      cast: true,
      receive: true
    });
    addBox(this.group, 4.2, 0.25, 4.4, steel, x + 3.4, 6.6, 11.8, {
      cast: true,
      receive: true
    });
    createFence(this.group, {
      xStart: x - 8,
      xEnd: x - 2,
      z: 9.0,
      y: PLATFORM_TOP,
      height: 1.0,
      color: 0xa7a296
    });
  }

  _buildProps() {
    const y = PLATFORM_TOP;

    createBench(this.group, { x: -16.5, z: 5.7, y, ry: Math.PI });
    createBench(this.group, { x: -9.2, z: 5.7, y, ry: Math.PI });
    createBench(this.group, { x: 8.2, z: 6.1, y, ry: Math.PI });
    createBench(this.group, { x: 17.4, z: 5.7, y, ry: Math.PI });

    for (const x of [-29, -19, 4, 28]) {
      createLamp(this.group, { x, z: 1.2, y, height: 3.8 });
    }

    createPlatformNumber(this.group, {
      x: -27,
      y: y + 1.9,
      z: 1.3,
      number: 1,
      color: '#5d7a79'
    });
    createPlatformNumber(this.group, {
      x: 22,
      y: y + 1.9,
      z: 1.3,
      number: 2,
      color: '#5d7a79'
    });

    // Two machines make the city platform feel a little more used.
    const vendingA = new VendingMachine(this.group, {
      x: -13.7,
      z: 8.5,
      y,
      ry: Math.PI,
      accent: 0x52736e
    });
    const vendingB = new VendingMachine(this.group, {
      x: 15.6,
      z: 8.5,
      y,
      ry: Math.PI,
      accent: 0x806552
    });
    this.vendingMachines.push(vendingA, vendingB);

    for (const x of [-11.9, 17.4]) {
      addBox(
        this.group,
        0.55,
        0.9,
        0.5,
        standardMaterial(0x63716b, { roughness: 0.55, metalness: 0.2 }),
        x,
        y + 0.45,
        8.6,
        { cast: true, receive: true }
      );
      addBox(
        this.group,
        0.49,
        0.08,
        0.44,
        standardMaterial(0x3e4843, { roughness: 0.7 }),
        x,
        y + 0.92,
        8.6,
        { cast: false, receive: true }
      );
    }

    createTimetableBoard(this.group, {
      x: 3.4,
      y: 2.55,
      z: 8.7,
      ry: Math.PI
    });

    // Poster light boxes along the station frontage.
    const posterData = [
      { x: 5.8, title: '海辺', subtitle: 'SEASIDE', bg: '#c9b18d', accent: '#54747a', motif: 'sun' },
      { x: -22.0, title: '書店', subtitle: 'BOOKS & DAYS', bg: '#b2bcb1', accent: '#705c4c', motif: 'mountain' },
      { x: 20.8, title: '珈琲', subtitle: 'CITY COFFEE', bg: '#bfa888', accent: '#6c4f3d', motif: 'cup' }
    ];
    posterData.forEach((poster) => {
      createPosterPanel(this.group, {
        x: poster.x,
        y: 2.2,
        z: 9.02,
        ry: Math.PI,
        width: 0.95,
        height: 1.4,
        title: poster.title,
        subtitle: poster.subtitle,
        bg: poster.bg,
        accent: poster.accent,
        motif: poster.motif
      });
    });

    createSpeakerPole(this.group, { x: 23.2, z: 4.7, y, height: 3.1 });

    // Information kiosk with a softly lit screen.
    addBox(this.group, 1.0, 1.7, 0.34, standardMaterial(0xc9c2b3, { roughness: 0.75 }), 1.0, y + 0.85, 8.55, {
      cast: true,
      receive: true
    });
    addBox(this.group, 0.7, 0.5, 0.04, standardMaterial(0x5c7779, {
      roughness: 0.25,
      emissive: 0xaed1c9,
      emissiveIntensity: 0.35
    }), 1.0, y + 1.25, 8.36, { cast: false });

    // Raised planters with small autumn trees.
    for (const x of [-30.4, 29.5]) {
      addBox(this.group, 2.4, 0.55, 2.1, standardMaterial(0xa8a194, { roughness: 1 }), x, y + 0.275, 6.4, {
        cast: true,
        receive: true
      });
      addBox(this.group, 2.2, 0.08, 1.9, standardMaterial(0x514536, { roughness: 1 }), x, y + 0.57, 6.4, {
        cast: false,
        receive: true
      });
    }
  }

  _buildCatenary() {
    for (const x of [-31, 2, 33]) {
      createCatenaryGantry(this.group, {
        x,
        zTrack1: TRACK_NEAR_Z,
        zTrack2: TRACK_FAR_Z,
        height: 6.4
      });
    }

    createSagWire(
      this.group,
      new THREE.Vector3(-150, 5.15, TRACK_NEAR_Z),
      new THREE.Vector3(150, 5.15, TRACK_NEAR_Z),
      0.1,
      0x3e403c,
      0.58
    );
    createSagWire(
      this.group,
      new THREE.Vector3(-150, 5.15, TRACK_FAR_Z),
      new THREE.Vector3(150, 5.15, TRACK_FAR_Z),
      0.1,
      0x3e403c,
      0.58
    );
  }

  _buildCity() {
    const facades = createBuildingTextureSet(27);
    const tints = [0xdce6e4, 0xe8e4db, 0xdbe2e0, 0xd8d8d1, 0xe5dfd5];

    const nearBuildings = [
      [-59, -20, 15, 12, 18, 1],
      [-42, -17, 10, 9, 12, 2],
      [-27, -22, 12, 10, 16, 0],
      [-10, -18, 11, 9, 21, 3],
      [6, -23, 14, 11, 15, 4],
      [22, -19, 10, 9, 19, 1],
      [39, -22, 13, 12, 24, 2],
      [55, -18, 11, 9, 14, 0],
      [72, -23, 15, 11, 20, 3]
    ];
    nearBuildings.forEach(([x, z, width, depth, height, style], index) => {
      createCityBuilding(this.group, {
        x,
        z,
        width,
        depth,
        height,
        texture: facades[style],
        tint: tints[index % tints.length],
        rotation: index % 2 ? 0.012 : -0.012,
        rooftop: true,
        near: index > 1 && index < 8
      });
    });

    const midBuildings = [
      [-50, -39, 16, 15, 32, 4],
      [-30, -44, 15, 14, 38, 1],
      [-5, -40, 13, 13, 28, 0],
      [20, -46, 17, 14, 42, 3],
      [46, -41, 15, 15, 33, 2],
      [68, -48, 18, 15, 29, 1]
    ];
    midBuildings.forEach(([x, z, width, depth, height, style], index) => {
      createCityBuilding(this.group, {
        x,
        z,
        width,
        depth,
        height,
        texture: facades[style],
        tint: 0xe7e1d5,
        rotation: index % 2 ? -0.015 : 0.012,
        rooftop: true,
        near: false
      });
    });

    const towers = [
      [-42, -72, 12, 12, 58],
      [-8, -80, 14, 14, 66],
      [27, -74, 12, 12, 54],
      [59, -82, 15, 15, 62],
      [86, -75, 12, 12, 49]
    ];
    towers.forEach(([x, z, width, depth, height], index) => {
      createCityBuilding(this.group, {
        x,
        z,
        width,
        depth,
        height,
        texture: facades[(index + 1) % facades.length],
        tint: 0xdcd8ce,
        rotation: 0.012,
        rooftop: true,
        near: false
      });
    });

    // Ground-level shopfronts and awnings give the tall blocks a human scale.
    const shopData = [
      {
        x: -26.5, z: -16.82, width: 7.2, signY: 4.55, title: '商店街',
        sub: 'AONAGI SHOTENGAI', bg: '#8a5d4b', awning: 0x8f5a47
      },
      {
        x: 5.5, z: -17.32, width: 6.6, signY: 4.7, title: '青凪書房',
        sub: 'BOOKS · STATIONERY', bg: '#4d6e6b', awning: 0x536f68
      },
      {
        x: 39.0, z: -15.84, width: 6.8, signY: 4.4, title: '喫茶 灯',
        sub: 'COFFEE · LUNCH', bg: '#96724f', awning: 0x9d734e
      }
    ];

    shopData.forEach((shop) => {
      createBillboard(this.group, {
        x: shop.x,
        y: shop.signY,
        z: shop.z,
        width: shop.width,
        height: 1.45,
        texture: createBillboardTexture({
          text: shop.title,
          subtext: shop.sub,
          bg: shop.bg,
          fg: '#f5ecdc'
        })
      });

      addBox(
        this.group,
        shop.width + 0.4,
        0.09,
        1.0,
        standardMaterial(shop.awning, { roughness: 0.72 }),
        shop.x,
        3.62,
        shop.z + 0.5,
        { cast: true, receive: true }
      );
      addBox(
        this.group,
        shop.width + 0.42,
        0.035,
        0.08,
        standardMaterial(0xe9e0d0, { roughness: 0.75 }),
        shop.x,
        3.56,
        shop.z + 0.98,
        { cast: false, receive: false }
      );

      // Warm shop window below the awning.
      addBox(
        this.group,
        shop.width * 0.78,
        1.34,
        0.08,
        standardMaterial(0x4b5f5c, { roughness: 0.25, metalness: 0.12 }),
        shop.x,
        2.62,
        shop.z + 0.045,
        { cast: false, receive: true }
      );
      addBox(
        this.group,
        shop.width * 0.78,
        1.18,
        0.04,
        new THREE.MeshStandardMaterial({
          color: 0xc8b486,
          roughness: 0.45,
          emissive: 0xffdca1,
          emissiveIntensity: 0.28
        }),
        shop.x,
        2.58,
        shop.z + 0.1,
        { cast: false, receive: false }
      );
      for (let m = -2; m <= 2; m += 1) {
        addBox(
          this.group,
          0.055,
          1.22,
          0.055,
          standardMaterial(0x3f4844, { roughness: 0.6 }),
          shop.x + m * shop.width * 0.16,
          2.58,
          shop.z + 0.13,
          { cast: false, receive: false }
        );
      }

      // Books, cans or boxes glimpsed through the glass.
      const shelfColors = [0x6f8064, 0xb57758, 0xc4a15f, 0x54747a, 0x8c6a53, 0x8e9379];
      for (let item = 0; item < 9; item += 1) {
        const itemWidth = 0.07 + (item % 3) * 0.035;
        const itemHeight = 0.24 + ((item * 7) % 4) * 0.075;
        addBox(
          this.group,
          itemWidth,
          itemHeight,
          0.07,
          standardMaterial(shelfColors[(item + shopData.indexOf(shop)) % shelfColors.length], {
            roughness: 0.8
          }),
          shop.x - shop.width * 0.32 + item * (shop.width * 0.076),
          2.33 + itemHeight / 2,
          shop.z + 0.155,
          { cast: false, receive: false }
        );
      }
      addBox(
        this.group,
        0.22,
        0.05,
        0.05,
        standardMaterial(0xffe6b6, {
          roughness: 0.4,
          emissive: 0xffd79a,
          emissiveIntensity: 0.8
        }),
        shop.x,
        3.27,
        shop.z + 0.14,
        { cast: false, receive: false }
      );
    });

    // Dense commercial signage.
    createBillboard(this.group, {
      x: 6,
      y: 17.2,
      z: -16.8,
      width: 8.2,
      height: 4.2,
      texture: createBillboardTexture({
        text: '青凪',
        subtext: 'AONAGI CENTRAL',
        bg: '#5f7a75',
        fg: '#f3ead8'
      })
    });
    createBillboard(this.group, {
      x: 39.5,
      y: 26.5,
      z: -15.4,
      width: 7.5,
      height: 3.8,
      texture: createBillboardTexture({
        text: '灯',
        subtext: 'LIGHT · TEA · MUSIC',
        bg: '#8b634c',
        fg: '#f4e8d5'
      })
    });
    createBillboard(this.group, {
      x: -27,
      y: 18.5,
      z: -15.7,
      width: 7,
      height: 3.4,
      texture: createBillboardTexture({
        text: '海辺',
        subtext: 'SEASIDE LINE',
        bg: '#617b87',
        fg: '#efe8d7'
      })
    });

    const signs = [
      { x: -41.0, y: 8.2, z: -12.15, text: '喫茶', bg: '#7a5a43', sub: 'COFFEE' },
      { x: -9.0, y: 12.8, z: -13.1, text: '書店', bg: '#4d6662', sub: 'BOOKS' },
      { x: 9.8, y: 8.5, z: -16.9, text: '宿', bg: '#805b48', sub: 'HOTEL' },
      { x: 40.2, y: 14.0, z: -15.6, text: '青凪', bg: '#465f5e', sub: 'CITY' },
      { x: 55.8, y: 7.0, z: -13.0, text: '茶房', bg: '#786750', sub: 'TEA' }
    ];
    signs.forEach((sign) => {
      createVerticalSign(this.group, {
        x: sign.x,
        y: sign.y,
        z: sign.z,
        width: 1.2,
        height: 4.4,
        texture: createVerticalSignTexture({
          text: sign.text,
          bg: sign.bg,
          fg: '#f4e9d5',
          sub: sign.sub
        })
      });
    });

    // Street trees in the city blocks.
    createTreeCluster(this.group, [
      { x: -55, z: -12.6, scale: 0.9, palette: [0x6c794d, 0xa2753e, 0xbf934b] },
      { x: -37, z: -12.2, scale: 1.05, palette: [0x6c794d, 0xa2753e, 0xbf934b] },
      { x: -15, z: -12.5, scale: 0.78, palette: [0x72824f, 0x9e7042, 0xb18b4c] },
      { x: -2, z: -12.5, scale: 0.9, palette: [0x72824f, 0x9e7042, 0xb18b4c] },
      { x: 22, z: -12.1, scale: 0.85, palette: [0x6f7a4d, 0xa77a42, 0xc39c4e] },
      { x: 47, z: -12.3, scale: 1.0, palette: [0x6d7a4d, 0xa7793f, 0xc19a4b] }
    ], 0);
  }

  _buildVegetation() {
    // Two small trees in raised planters on the platform.
    const planterTrees = [
      { x: -30.4, z: 6.4, scale: 0.58, palette: [0x7b7f49, 0xa7753f, 0xc29249] },
      { x: 29.5, z: 6.4, scale: 0.62, palette: [0x6f7c4d, 0xa96f3c, 0xb98d48] }
    ];
    createTreeCluster(this.group, planterTrees, PLATFORM_TOP + 0.52);

    createFallenLeaves(this.group, {
      count: 220,
      areas: [
        { xMin: -33.4, xMax: 33.4, zMin: 0.5, zMax: 9.0, y: PLATFORM_TOP },
        { xMin: -50, xMax: 50, zMin: -11.5, zMax: -8.7, y: 0.02 },
        { xMin: -55, xMax: 55, zMin: 10.0, zMax: 16.0, y: 0.02 }
      ]
    });

    this.driftingLeaves = new DriftingLeaves(this.group, {
      count: 26,
      baseY: PLATFORM_TOP,
      seed: 76,
      bounds: {
        xMin: -31,
        xMax: 32,
        zMin: -1.5,
        zMax: 9,
        yMax: PLATFORM_TOP + 6.5
      }
    });

    createDapplePatches(this.group, {
      patches: [
        { x: -28.5, y: PLATFORM_TOP + 0.022, z: 5.8, sizeX: 4.2, sizeZ: 3.8, rotation: 0.1 },
        { x: 27.5, y: PLATFORM_TOP + 0.022, z: 5.8, sizeX: 4.0, sizeZ: 3.6, rotation: -0.2 }
      ]
    });

    createGrassTufts(this.group, {
      count: 140,
      baseY: 0.02,
      areas: [
        { xMin: -95, xMax: 95, zMin: -11.8, zMax: -9.2 },
        { xMin: 38, xMax: 70, zMin: -10, zMax: 15 },
        { xMin: -58, xMax: -46, zMin: -11, zMax: 16 }
      ]
    });
  }

  _buildCollision() {
    this.addPlatformBoundaryWalls(BOUNDS);

    for (const post of this.canopy.postPositions) {
      this.addCenteredCollider(post.x, post.z, 0.18, 0.18);
    }

    this.addCenteredCollider(-16.5, 5.7, 1.1, 0.48);
    this.addCenteredCollider(-9.2, 5.7, 1.1, 0.48);
    this.addCenteredCollider(8.2, 6.1, 1.1, 0.48);
    this.addCenteredCollider(17.4, 5.7, 1.1, 0.48);

    this.addCenteredCollider(-13.7, 8.5, 0.68, 0.56);
    this.addCenteredCollider(15.6, 8.5, 0.68, 0.56);
    this.addCenteredCollider(-11.9, 8.6, 0.35, 0.32);
    this.addCenteredCollider(17.4, 8.6, 0.35, 0.32);
    this.addCenteredCollider(3.4, 8.7, 0.65, 0.14);
    this.addCenteredCollider(1.0, 8.55, 0.55, 0.25);
    this.addCenteredCollider(-30.4, 6.4, 1.25, 1.1);
    this.addCenteredCollider(29.5, 6.4, 1.25, 1.1);
    this.addCenteredCollider(23.2, 4.7, 0.16, 0.16);
    this.addCenteredCollider(26.0, 8.3, 1.5, 0.72);

    for (const x of [-29, -19, 4, 28]) {
      this.addCenteredCollider(x, 1.2, 0.18, 0.18);
    }
    this.addCenteredCollider(-27, 1.3, 0.12, 0.12);
    this.addCenteredCollider(22, 1.3, 0.12, 0.12);
  }
}
