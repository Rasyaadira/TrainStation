/**
 * Station A — Hirusagari (昼下がり駅)
 * A quiet, open-air suburban platform under a small canopy. Wide rooftops,
 * utility wires, autumn trees and a level crossing at the west end.
 */
import * as THREE from 'three';
import { StationBase } from './base.js';
import {
  addBox,
  addCylinder,
  addPlane,
  createBench,
  createBicycle,
  createBillboard,
  createBuildingTextureSet,
  createCanopy,
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
  createSuburbanHouse,
  createTimetableBoard,
  createTracks,
  createTreeCluster,
  createUtilityPole,
  createVerticalSign,
  DriftingLeaves,
  makeGround,
  standardMaterial
} from '../world.js';
import {
  createAsphaltTexture,
  createBillboardTexture,
  createGrassTexture,
  createVerticalSignTexture
} from '../textures.js';
import { VendingMachine } from '../vending.js';
import { RailwayCrossing } from '../crossing.js';

const TRACK_NEAR_Z = -2.4;
const TRACK_FAR_Z = -6.0;
const PLATFORM_TOP = 1.0;
const BOUNDS = { xMin: -30, xMax: 30, zMin: 0, zMax: 8.2 };

export class StationA extends StationBase {
  constructor() {
    super({
      id: 'stationA',
      nameJP: '昼下がり駅',
      nameEN: 'Hirusagari Station',
      platformTop: PLATFORM_TOP,
      platformBounds: BOUNDS,
      spawn: { x: 6.4, z: 4.75, yaw: -0.09 },
      arrivalDelay: 18,
      crossingReleaseDelay: 1.8,
      mood: {
        skyTop: 0xa8cbe3,
        skyHorizon: 0xf5efdd,
        fogColor: 0xf0ebe1,
        fogDensity: 0.0039,
        sunColor: 0xfff3d9,
        sunIntensity: 2.8,
        hemiSky: 0xe0edf4,
        hemiGround: 0xc3aa8a,
        hemiIntensity: 1.52,
        exposure: 1.12,
        cloudOpacity: 0.8
      }
    });
    this.trackZ = TRACK_NEAR_Z;
  }

  buildStation() {
    this._buildGround();
    this._buildTracks();
    this._buildPlatform();
    this._buildCanopy();
    this._buildCrossing();
    this._buildPlatformProps();
    this._buildPolesAndWires();
    this._buildSurroundings();
    this._buildCity();
    this._buildVegetation();
    this._buildCollision();
  }

  _buildGround() {
    makeGround(this.group, {
      size: 300,
      texture: createGrassTexture(34, 34)
    });

    const roadMat = standardMaterial(0xffffff, {
      map: createAsphaltTexture(3, 8),
      roughness: 0.97
    });
    addPlane(this.group, 8, 34, roadMat, -38.5, 0.014, 20, { receive: true });

    // A small forecourt path behind the station.
    const pathTexture = createAsphaltTexture(2, 4);
    addPlane(
      this.group,
      4.2,
      18,
      standardMaterial(0xffffff, { map: pathTexture, roughness: 0.98 }),
      0,
      0.013,
      17,
      { receive: true }
    );

    // Grass verge along the station fence.
    addBox(this.group, 62, 0.12, 1.4, standardMaterial(0x6f794b, { roughness: 1 }), 0, 0.06, 9.1, {
      cast: false,
      receive: true
    });
  }

  _buildTracks() {
    createTracks(this.group, {
      nearZ: TRACK_NEAR_Z,
      farZ: TRACK_FAR_Z,
      xMin: -145,
      xMax: 145,
      sleeperSpacing: 0.72
    });

    // A thin contact wire above each track hints at the electrified line.
    createSagWire(
      this.group,
      new THREE.Vector3(-145, 5.35, TRACK_NEAR_Z),
      new THREE.Vector3(145, 5.35, TRACK_NEAR_Z),
      0.15,
      0x4d4c45,
      0.48
    );
    createSagWire(
      this.group,
      new THREE.Vector3(-145, 5.35, TRACK_FAR_Z),
      new THREE.Vector3(145, 5.35, TRACK_FAR_Z),
      0.15,
      0x4d4c45,
      0.48
    );
  }

  _buildPlatform() {
    createPlatform(this.group, {
      length: BOUNDS.xMax - BOUNDS.xMin,
      depth: BOUNDS.zMax - BOUNDS.zMin,
      zStart: BOUNDS.zMin,
      height: PLATFORM_TOP
    });

    // Platform end ramps read as a subtle transition to the street.
    const endMat = standardMaterial(0xaaa495, { roughness: 1 });
    for (const side of [-1, 1]) {
      addBox(this.group, 1.5, 0.22, 8.2, endMat, side * 30.7, 0.11, 4.1, {
        cast: true,
        receive: true
      });
    }

    createFence(this.group, {
      xStart: -30,
      xEnd: 30,
      z: 8.05,
      y: PLATFORM_TOP,
      height: 1.02,
      color: 0xcfc9ba
    });
  }

  _buildCanopy() {
    this.canopy = createCanopy(this.group, {
      x: -1,
      z: 2.15,
      length: 20.5,
      depth: 4.55,
      baseY: PLATFORM_TOP,
      height: 3.3,
      columns: 4,
      roofColor: 0xd7d0c0,
      undersideColor: 0xa28c72
    });

    const hanging = createStationSign(this.group, {
      x: -9.4,
      y: 3.46,
      z: 3.25,
      nameJP: '昼下がり',
      nameEN: 'Hirusagari',
      lineColor: '#6f8f7f',
      prevJP: '青凪',
      nextJP: '海辺',
      hanging: true,
      roofY: PLATFORM_TOP + 3.3
    });
    this.hangingSign = hanging;

    // A second, standing station name board at the eastern end.
    const standingX = 19.4;
    const standingZ = 7.25;
    createStationSign(this.group, {
      x: standingX,
      y: 2.45,
      z: standingZ,
      ry: 0,
      nameJP: '昼下がり',
      nameEN: 'Hirusagari',
      lineColor: '#6f8f7f',
      prevJP: '青凪',
      nextJP: '海辺',
      width: 3.25
    });
    const postMat = standardMaterial(0x615b4e, { roughness: 0.66 });
    for (const offset of [-1.35, 1.35]) {
      addCylinder(this.group, 0.045, 0.055, 1.12, postMat, standingX + offset, 1.54, standingZ, {
        radialSegments: 6
      });
    }
  }

  _buildCrossing() {
    this.crossing = new RailwayCrossing(this.group, {
      x: -38.5,
      nearTrackZ: TRACK_NEAR_Z,
      farTrackZ: TRACK_FAR_Z,
      roadWidth: 7.2
    });
  }

  _buildPlatformProps() {
    const y = PLATFORM_TOP;

    // Benches under the canopy.
    createBench(this.group, { x: -4.5, z: 5.85, y, ry: Math.PI });
    createBench(this.group, { x: 3.3, z: 5.85, y, ry: Math.PI });

    // Lamps at the open ends of the platform.
    for (const x of [-26, -16, 16, 26]) {
      createLamp(this.group, { x, z: 1.15, y, height: 3.75 });
    }

    // Timetable and posters, mounted at the back fence.
    createTimetableBoard(this.group, {
      x: -7.2,
      y: 2.65,
      z: 7.52,
      ry: Math.PI
    });
    createPosterPanel(this.group, {
      x: 19.1,
      y: 2.2,
      z: 7.88,
      ry: Math.PI,
      width: 1.0,
      height: 1.45,
      title: '秋の旅',
      subtitle: 'AUTUMN JOURNEY',
      bg: '#d7b894',
      accent: '#6f806b',
      motif: 'train'
    });
    createPosterPanel(this.group, {
      x: 21.0,
      y: 2.2,
      z: 7.88,
      ry: Math.PI,
      width: 1.0,
      height: 1.45,
      title: '珈琲',
      subtitle: 'SLOW AFTERNOON',
      bg: '#c8b89a',
      accent: '#7c5e45',
      motif: 'cup'
    });

    // The vending machine and its recycling bin.
    const vending = new VendingMachine(this.group, {
      x: 8.6,
      z: 7.25,
      y,
      ry: Math.PI,
      accent: 0x9b604b
    });
    this.vendingMachines.push(vending);

    addBox(
      this.group,
      0.62,
      0.92,
      0.55,
      standardMaterial(0x68746d, { roughness: 0.55, metalness: 0.22 }),
      11.2,
      y + 0.46,
      7.3,
      { cast: true, receive: true }
    );
    addBox(
      this.group,
      0.54,
      0.08,
      0.46,
      standardMaterial(0x3f4944, { roughness: 0.7 }),
      11.2,
      y + 0.95,
      7.3,
      { cast: false, receive: true }
    );

    // Parked bicycle.
    const bicycle = createBicycle(this.group, {
      x: -23.4,
      z: 6.65,
      y,
      ry: 0.12,
      color: 0x6e8077
    });
    bicycle.rotation.z = 0.07;

    // Platform number paddles near the tactile strip.
    createPlatformNumber(this.group, {
      x: -22.2,
      y: y + 1.9,
      z: 1.3,
      number: 1,
      color: '#638276'
    });
    createPlatformNumber(this.group, {
      x: 21.6,
      y: y + 1.9,
      z: 1.3,
      number: 2,
      color: '#638276'
    });

    // Small speaker on the canopy post.
    createSpeakerPole(this.group, { x: 7.1, z: 5.8, y: y, height: 3.0 });

    // A little planted edge softens the back fence.
    const shrubMat = standardMaterial(0x75814e, { roughness: 1, flatShading: true });
    for (const [x, scale] of [[-28.4, 1.1], [-27.1, 0.8], [27.2, 0.9], [28.5, 1.2]]) {
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 * scale, 1), shrubMat);
      shrub.position.set(x, y + 0.42 * scale, 7.55);
      shrub.scale.set(1.2, 0.8, 1);
      shrub.castShadow = true;
      this.group.add(shrub);
    }
  }

  _buildPolesAndWires() {
    const xs = [-52, -27, -2, 23, 48, 73];
    const poles = [];
    for (let i = 0; i < xs.length; i += 1) {
      poles.push(
        createUtilityPole(this.group, {
          x: xs[i],
          z: -11.5,
          height: 9.0 + (i % 2) * 0.5,
          transformer: i === 2
        })
      );
    }

    for (let i = 0; i < poles.length - 1; i += 1) {
      const anchorsA = poles[i].anchors;
      const anchorsB = poles[i + 1].anchors;
      for (let wire = 0; wire < Math.min(anchorsA.length, anchorsB.length); wire += 1) {
        createSagWire(
          this.group,
          anchorsA[wire],
          anchorsB[wire],
          0.68 + wire * 0.035,
          wire < 3 ? 0x353733 : 0x444640,
          0.72
        );
      }
    }

    // A pole on the near side by the crossing road.
    const nearPole = createUtilityPole(this.group, {
      x: -42.3,
      z: 11.0,
      height: 8.3,
      transformer: false
    });
    createSagWire(
      this.group,
      nearPole.anchors[0],
      poles[3].anchors[0],
      0.9,
      0x353733,
      0.6
    );
  }

  _buildSurroundings() {
    const houses = [
      { x: -23, z: 16.5, width: 7.2, depth: 6.2, height: 4.2, wall: 0xddd5c6, roof: 0x60645d, ry: -0.06 },
      { x: -12.5, z: 20.5, width: 8.1, depth: 6.0, height: 4.3, wall: 0xd2cbbd, roof: 0x67706a, ry: 0.05 },
      { x: 1.5, z: 16.8, width: 6.4, depth: 5.7, height: 3.9, wall: 0xd9d0c0, roof: 0x5c5b52, ry: 0.02 },
      { x: 14.0, z: 20.0, width: 7.8, depth: 6.3, height: 4.6, wall: 0xcac3b5, roof: 0x62665f, ry: -0.04 },
      { x: 26.5, z: 16.0, width: 6.8, depth: 5.6, height: 4.0, wall: 0xe0d8c9, roof: 0x696a61, ry: 0.08 },
      { x: -34.0, z: 22.0, width: 7.0, depth: 6.0, height: 4.2, wall: 0xd7cfbf, roof: 0x5d625b, ry: 0.12 }
    ];
    houses.forEach((house) => {
      createSuburbanHouse(this.group, {
        x: house.x,
        z: house.z,
        width: house.width,
        depth: house.depth,
        height: house.height,
        wallColor: house.wall,
        roofColor: house.roof,
        ry: house.ry
      });
    });

    // Garden walls and small fences behind the platform.
    const wallMat = standardMaterial(0xb4ad9e, { roughness: 1 });
    for (const x of [-28, -17, -5, 7, 20, 30]) {
      addBox(this.group, 0.3, 0.5, 8, wallMat, x, 0.25, 12.0, {
        cast: true,
        receive: true,
        ry: 0.02
      });
    }

    // Street furniture near the crossing approach.
    createBench(this.group, { x: -43.6, z: 12.4, y: 0, ry: 0.1 });
    createSpeakerPole(this.group, { x: 31.8, z: 5.5, y: 0, height: 4.1 });
  }

  _buildCity() {
    const facades = createBuildingTextureSet(11);
    const tints = [0xf3f0e8, 0xe6e3da, 0xf0ebe1, 0xdcdcd5, 0xefebe2];

    const nearBuildings = [
      [-56, -24, 13, 10, 7.2, 1, false],
      [-41, -22, 9.5, 8, 9.4, 0, false],
      [-27, -27, 13, 11, 6.4, 2, true],
      [-13, -23, 9, 8.5, 9.8, 3, false],
      [2, -28, 12.5, 10, 7.8, 1, true],
      [17, -24, 8.5, 8, 10.8, 4, false],
      [33, -28, 12, 10, 7.0, 0, true],
      [49, -23, 11, 9, 9.2, 2, false],
      [65, -27, 10, 9, 6.2, 3, false]
    ];

    nearBuildings.forEach(([x, z, width, depth, height, style, near], index) => {
      createCityBuilding(this.group, {
        x,
        z,
        width,
        depth,
        height,
        texture: facades[style],
        tint: tints[index % tints.length],
        rotation: (index % 2 === 0 ? -1 : 1) * 0.018,
        rooftop: true,
        near
      });
    });

    // Smaller pitched-roof houses sit between the road and the apartment blocks.
    const cityHouses = [
      [-49, -16.2, 6.4, 4.7, 3.8, 0xdfd8c9, 0x5c615d, -0.04],
      [-3.5, -16.5, 5.9, 4.4, 3.6, 0xd3cbbb, 0x666b63, 0.05],
      [25.5, -16.8, 6.3, 4.8, 3.9, 0xe1d8c7, 0x5a5b53, -0.02],
      [42.0, -16.0, 5.6, 4.3, 3.5, 0xd9d2c3, 0x64685f, 0.08]
    ];
    cityHouses.forEach(([x, z, width, depth, height, wallColor, roofColor, ry]) => {
      createSuburbanHouse(this.group, {
        x,
        z,
        width,
        depth,
        height,
        wallColor,
        roofColor,
        ry
      });
    });

    const midBuildings = [
      [-46, -40, 15, 13, 20, 4],
      [-25, -43, 13, 12, 17, 1],
      [-4, -38, 12, 13, 24, 0],
      [18, -44, 16, 12, 19, 3],
      [41, -39, 13, 13, 22, 2],
      [62, -46, 18, 14, 17, 4]
    ];
    midBuildings.forEach(([x, z, width, depth, height, style], index) => {
      createCityBuilding(this.group, {
        x,
        z,
        width,
        depth,
        height,
        texture: facades[style],
        tint: 0xeee7d9,
        rotation: index % 2 ? 0.02 : -0.01,
        rooftop: true,
        near: false
      });
    });

    // Distant apartment towers, hazed by the warm fog.
    const towers = [
      [-63, -67, 10, 10, 34],
      [-31, -72, 12, 11, 41],
      [2, -68, 9, 9, 31],
      [29, -73, 11, 10, 39],
      [57, -68, 13, 12, 36],
      [83, -74, 10, 10, 30]
    ];
    towers.forEach(([x, z, width, depth, height], index) => {
      createCityBuilding(this.group, {
        x,
        z,
        width,
        depth,
        height,
        texture: facades[(index + 2) % facades.length],
        tint: 0xdedacf,
        rotation: 0.015,
        rooftop: true,
        near: false
      });
    });

    // Low-rise rooftops and little roads.
    const roadMat = standardMaterial(0xffffff, {
      map: createAsphaltTexture(10, 1),
      roughness: 1
    });
    addPlane(this.group, 150, 4.5, roadMat, 0, 0.02, -14, { receive: true });
    addPlane(this.group, 150, 4.0, roadMat, 0, 0.02, -33, { receive: true });

    // Rooftop and shop signage.
    createBillboard(this.group, {
      x: 31.5,
      y: 10.9,
      z: -20.0,
      width: 7,
      height: 3.5,
      texture: createBillboardTexture({
        text: '青凪',
        subtext: 'AONAGI · EVERYDAY GOODS',
        bg: '#6f7e70',
        fg: '#f4eddc'
      })
    });

    createVerticalSign(this.group, {
      x: 20.2,
      y: 6.8,
      z: -16.7,
      width: 1.15,
      height: 4.1,
      texture: createVerticalSignTexture({
        text: '喫茶',
        bg: '#6a5a46',
        fg: '#f4e9d2',
        sub: 'COFFEE'
      })
    });

    // Roof water tank silhouettes are already added by createCityBuilding.
    // A few bird-size specks in the pale sky are simple distant silhouettes.
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x5f615a, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i += 1) {
      const bird = new THREE.Group();
      const left = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.08), birdMat);
      const right = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.08), birdMat);
      left.position.x = -0.24;
      right.position.x = 0.24;
      left.rotation.z = 0.28;
      right.rotation.z = -0.28;
      bird.add(left, right);
      bird.position.set(-32 + i * 13, 27 + (i % 3) * 2.5, -58 - (i % 2) * 7);
      bird.rotation.y = 0.25;
      this.group.add(bird);
    }
  }

  _buildVegetation() {
    const autumnA = [0x6f7c4f, 0x8a824a, 0xab6f3e, 0xc08a45, 0x9b5f39];
    const autumnB = [0x718252, 0x7c844c, 0xb1783f, 0xd0a150, 0x8e6c41];

    const treeSpecs = [
      { x: -25, z: 13.2, scale: 1.45, palette: autumnA },
      { x: -19.0, z: 24.0, scale: 1.3, palette: autumnB },
      { x: -8.5, z: 12.3, scale: 1.1, palette: autumnA },
      { x: 5.8, z: 23.0, scale: 1.35, palette: autumnB },
      { x: 18.5, z: 13.2, scale: 1.2, palette: autumnA },
      { x: 25.2, z: 24.0, scale: 1.55, palette: autumnB },
      { x: 34.5, z: 19.0, scale: 1.1, palette: autumnA },
      { x: -37.0, z: 14.0, scale: 1.2, palette: autumnB },
      // A soft row of autumn trees between the tracks and the city.
      { x: -49.0, z: -11.5, scale: 1.55, palette: autumnA },
      { x: -37.5, z: -12.0, scale: 1.25, palette: autumnB },
      { x: -20.0, z: -11.4, scale: 1.65, palette: autumnA },
      { x: -7.0, z: -12.1, scale: 1.2, palette: autumnB },
      { x: 13.0, z: -11.6, scale: 1.45, palette: autumnA },
      { x: 27.0, z: -12.0, scale: 1.15, palette: autumnB },
      { x: 45.0, z: -11.5, scale: 1.5, palette: autumnA },
      { x: 63.0, z: -12.5, scale: 1.15, palette: autumnB },
      { x: -69.0, z: -13.5, scale: 1.0, palette: autumnA }
    ];
    createTreeCluster(this.group, treeSpecs, 0);

    createGrassTufts(this.group, {
      count: 320,
      baseY: 0.02,
      areas: [
        { xMin: -80, xMax: 80, zMin: -14.5, zMax: -9.2 },
        { xMin: -38, xMax: 40, zMin: 9.0, zMax: 32.0 },
        { xMin: 36, xMax: 60, zMin: -11, zMax: 15 }
      ]
    });

    createFallenLeaves(this.group, {
      count: 330,
      areas: [
        { xMin: -29.4, xMax: 29.4, zMin: 0.5, zMax: 7.9, y: PLATFORM_TOP },
        { xMin: -38, xMax: 38, zMin: 9.0, zMax: 16.0, y: 0.02 },
        { xMin: -35, xMax: 35, zMin: -10.0, zMax: -8.6, y: 0.02 }
      ]
    });

    this.driftingLeaves = new DriftingLeaves(this.group, {
      count: 38,
      baseY: PLATFORM_TOP,
      seed: 41,
      bounds: {
        xMin: -28,
        xMax: 29,
        zMin: -1.5,
        zMax: 8,
        yMax: PLATFORM_TOP + 7.2
      }
    });

    createDapplePatches(this.group, {
      patches: [
        { x: -17.5, y: PLATFORM_TOP + 0.018, z: 4.2, sizeX: 6.5, sizeZ: 5.0, rotation: 0.15 },
        { x: 20.5, y: PLATFORM_TOP + 0.018, z: 3.4, sizeX: 5.2, sizeZ: 4.3, rotation: -0.35 },
        { x: -22, y: 0.03, z: 12.4, sizeX: 8, sizeZ: 7, rotation: 0.5 }
      ]
    });

    // Low shrubs dotted along the nearby gardens.
    const shrubMat = standardMaterial(0x6f7c4d, { roughness: 1, flatShading: true });
    const shrubPositions = [
      [-29, 14.5, 0.65], [-5.5, 14.0, 0.7], [9.5, 18.8, 0.8],
      [22.8, 14.2, 0.6], [35, 12.8, 0.72], [-39, 18.0, 0.8]
    ];
    for (const [x, z, size] of shrubPositions) {
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), shrubMat);
      shrub.position.set(x, size * 0.6, z);
      shrub.scale.y = 0.75;
      shrub.castShadow = true;
      shrub.receiveShadow = true;
      this.group.add(shrub);
    }
  }

  _buildCollision() {
    this.addPlatformBoundaryWalls(BOUNDS);

    for (const post of this.canopy.postPositions) {
      this.addCenteredCollider(post.x, post.z, 0.18, 0.18);
    }

    this.addCenteredCollider(-4.5, 5.85, 1.1, 0.48);
    this.addCenteredCollider(3.3, 5.85, 1.1, 0.48);
    this.addCenteredCollider(-7.2, 7.52, 0.65, 0.14);
    this.addCenteredCollider(8.6, 7.25, 0.68, 0.56);
    this.addCenteredCollider(11.2, 7.3, 0.38, 0.34);
    this.addCenteredCollider(-23.4, 6.65, 0.85, 0.36);
    this.addCenteredCollider(7.1, 5.8, 0.18, 0.18);

    for (const x of [-26, -16, 16, 26]) {
      this.addCenteredCollider(x, 1.15, 0.18, 0.18);
    }
    this.addCenteredCollider(-22.2, 1.3, 0.12, 0.12);
    this.addCenteredCollider(21.6, 1.3, 0.12, 0.12);
    for (const offset of [-1.35, 1.35]) {
      this.addCenteredCollider(19.4 + offset, 7.25, 0.13, 0.13);
    }
    this.addCenteredCollider(19.4, 7.25, 1.38, 0.11);

    // Small shrubs are not walkable, but their visual footprint is minimal.
    // The fence at the rear is already covered by the boundary wall.
  }
}
