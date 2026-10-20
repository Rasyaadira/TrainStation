/**
 * Hirusagari — A Small Station at Noon
 *
 * Entry point. Wires the renderer, atmosphere, player, interactions, audio,
 * two station modules and the shared train together.
 */
import * as THREE from 'three';
import { SceneSystem } from './js/scene.js';
import { Atmosphere } from './js/lighting.js';
import { Player } from './js/player.js';
import { AudioEngine } from './js/audio.js';
import { UI } from './js/ui.js';
import { InteractionSystem } from './js/interaction.js';
import { TrainSystem } from './js/train.js';
import { DRINK_MENU } from './js/vending.js';
import { StationA } from './js/stations/stationA.js';
import { StationB } from './js/stations/stationB.js';

const STATION_ORDER = {
  stationA: 'stationB',
  stationB: 'stationA'
};

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatClock(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.sceneSystem = new SceneSystem(this.container);
    this.scene = this.sceneSystem.scene;
    this.camera = this.sceneSystem.camera;

    this.sound = new AudioEngine();
    this.atmosphere = new Atmosphere(this.scene);
    this.stations = {
      stationA: new StationA(),
      stationB: new StationB()
    };
    this.currentKey = 'stationA';
    this.currentStation = null;
    this.stationEnv = null;
    this.activeVendingMachines = [];
    this.activeVending = null;
    this.inventory = new Map();
    this.isTraveling = false;
    this.started = false;
    this.clockMinutes = 12 * 60 + 43;
    this.statusTimer = 0;
    this.elapsed = 0;

    this.ui = new UI(DRINK_MENU, {
      onStart: () => this._startExperience(),
      onVendingSelect: (index) => this._chooseDrink(index),
      onVendingClose: (reason) => this._closeVending(reason),
      onMute: () => this._toggleMute()
    });

    this.player = new Player(this.camera, document.body, {
      onInteract: () => this._handleInteraction(),
      onFootstep: (step) => this.sound.footstep(step),
      onMute: () => this._toggleMute()
    });
    this.player.setMovementEnabled(false);

    this.interaction = new InteractionSystem(this.ui);
    this.interaction.setEnabled(false);

    this.train = new TrainSystem(this.scene, {
      onEvent: (event) => this._handleTrainEvent(event)
    });

    this._bindEvents();
    this._loadStation('stationA', { initial: true });

    this.ui.setMuted(this.sound.muted);
    this.ui.setInventory(this.inventory);
    this.ui.setClock(formatClock(this.clockMinutes));
    this.ui.showTitle(false);

    this.clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _bindEvents() {
    this.player.controls.addEventListener('lock', () => this._onPointerLock());
    this.player.controls.addEventListener('unlock', () => this._onPointerUnlock());
    document.addEventListener('pointerlockerror', () => {
      if (!this.ui.vendingOpen && !this.isTraveling) {
        this.ui.showTitle(true);
      }
    });

    // Browsers already handle Escape for pointer lock; doing it explicitly also
    // keeps the pause overlay consistent in embedded browsers and test tools.
    document.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape') return;
      if (this.player.controls.isLocked && !this.ui.vendingOpen) {
        this.player.controls.unlock();
      }
    });

    // Clicking the paused background is a convenient second resume target.
    this.container.addEventListener('click', () => {
      if (
        this.started &&
        !this.player.controls.isLocked &&
        !this.ui.vendingOpen &&
        !this.isTraveling
      ) {
        this.sound.init();
        this.player.controls.lock();
      }
    });
  }

  _startExperience() {
    this.sound.init();
    this.player.controls.lock();
  }

  _onPointerLock() {
    this.started = true;
    this.sound.resume();
    this.ui.hideTitle();
    this.ui.showHud();
    if (!this.ui.vendingOpen && !this.isTraveling) {
      this.player.setMovementEnabled(true);
      this.interaction.setEnabled(true);
    }
  }

  _onPointerUnlock() {
    this.player.resetKeys();
    this.player.setMovementEnabled(false);
    this.interaction.setEnabled(false);
    this.interaction.clear();
    if (this.ui.vendingOpen || this.isTraveling) return;
    this.ui.showTitle(true);
  }

  _toggleMute() {
    this.sound.init();
    const muted = this.sound.toggleMute();
    this.ui.setMuted(muted);
    this.ui.showToast(muted ? 'Sound muted' : 'Sound on', 1600);
  }

  _loadStation(key, { initial = false } = {}) {
    if (!this.stations[key]) return;

    if (this.currentStation) {
      this.currentStation.unload(this.scene);
    }

    this.currentKey = key;
    this.currentStation = this.stations[key];
    this.stationEnv = this.currentStation.load(this.scene);
    const env = this.stationEnv;
    this.activeVendingMachines = env.vendingMachines;
    this.activeVending = null;

    this.player.setEnvironment(env.colliders, env.getSurfaceHeight);
    this.player.setSpawn(env.spawn.x, env.spawn.z, env.spawn.yaw);
    this.atmosphere.applyMood(env.mood, true);

    this.ui.setStation({
      nameJP: this.currentStation.nameJP,
      nameEN: this.currentStation.nameEN
    });
    this.ui.setPrompt(null, false);

    const destinationKey = STATION_ORDER[key];
    const destination = this.stations[destinationKey];
    this.train.setStation({
      crossing: env.crossing,
      destination: {
        nameJP: destination.nameJP,
        nameEN: destination.nameEN
      },
      trackZ: -2.4,
      platformEdgeZ: env.platformEdgeZ,
      initialDelay: env.arrivalDelay,
      crossingReleaseDelay: env.crossingReleaseDelay
    });

    this.interaction.setProviders([...env.vendingMachines, this.train]);
    this.interaction.setEnabled(
      this.player.controls.isLocked && !this.ui.vendingOpen && !this.isTraveling
    );
    this.ui.setInventory(this.inventory);
    this._updateTrainStatus(true);

    if (initial) {
      this.ui.setClock(formatClock(this.clockMinutes));
    }
  }

  _handleInteraction() {
    if (this.isTraveling || this.ui.vendingOpen) return;
    const interaction = this.interaction.getCurrent();
    if (!interaction) return;

    if (interaction.type === 'use-vending') {
      this._openVending(interaction.vm);
      return;
    }

    if (interaction.type === 'pickup-drink') {
      const machine = interaction.vm;
      const drink = machine.collectDrink();
      if (!drink) return;
      this.sound.pickupCan();
      const count = (this.inventory.get(drink.nameEN) || 0) + 1;
      this.inventory.set(drink.nameEN, count);
      this.ui.setInventory(this.inventory);
      this.ui.showToast(`Got: ${drink.nameEN} — ${drink.note}`, 4200);
      return;
    }

    if (interaction.type === 'board-train') {
      this._startTravel();
    }
  }

  _openVending(machine) {
    if (!machine || this.isTraveling || this.ui.vendingOpen) return;
    if (machine.state !== 'idle') {
      this.ui.showToast('Please take the drink in the pickup slot first.', 2200);
      return;
    }
    this.activeVending = machine;
    this.player.setMovementEnabled(false);
    this.interaction.setEnabled(false);
    this.sound.init();
    this.sound.vendingBeep();
    this.ui.openVending();
    this.player.controls.unlock();
  }

  _chooseDrink(index) {
    const machine = this.activeVending;
    const drink = DRINK_MENU[index];
    if (!machine || !drink) {
      this.ui.showToast('That selection is unavailable.', 2200);
      this.player.controls.lock();
      return;
    }
    if (machine.state !== 'idle') {
      if (machine.state === 'ready') {
        this.ui.showToast('Take the drink already in the pickup slot.', 2400);
      }
      this.player.controls.lock();
      return;
    }

    const accepted = machine.purchase(drink);
    if (!accepted) {
      this.player.setMovementEnabled(true);
      this.interaction.setEnabled(true);
      this.player.controls.lock();
      return;
    }

    this.sound.init();
    this.sound.coinInsert();
    this.sound.vendingBeep();
    this.ui.showToast(`Coins accepted — ¥${drink.price}. Dispensing ${drink.nameEN}…`, 2600);
    this.activeVending = null;

    this.player.setMovementEnabled(true);
    this.interaction.setEnabled(true);
    this.player.controls.lock();

    window.setTimeout(() => {
      if (this.isTraveling) return;
      this.sound.canDrop();
    }, 930);

    window.setTimeout(() => {
      if (this.isTraveling || this.ui.vendingOpen) return;
      if (machine.state === 'ready') {
        this.ui.showToast('Your drink is waiting in the pickup slot.', 2600);
      }
    }, 1650);
  }

  _closeVending(reason) {
    this.activeVending = null;

    if (reason === 'pause') {
      this.player.setMovementEnabled(false);
      this.interaction.setEnabled(false);
      this.ui.showTitle(true);
      return;
    }

    this.player.setMovementEnabled(true);
    this.interaction.setEnabled(true);
    this.player.controls.lock();
  }

  async _startTravel() {
    if (this.isTraveling || this.ui.vendingOpen) return;

    const nextKey = STATION_ORDER[this.currentKey];
    const destination = this.stations[nextKey];
    if (!destination) return;

    this.isTraveling = true;
    this.player.setMovementEnabled(false);
    this.interaction.setEnabled(false);
    this.ui.setPrompt(null, false);
    this.sound.stationMelody();

    await this.ui.fadeToBlack(950);
    this.ui.showTravel({
      nameJP: destination.nameJP,
      nameEN: destination.nameEN
    });
    this.sound.startRide();
    await this.ui.fadeFromBlack(900);
    await wait(3100);
    await this.ui.fadeToBlack(950);

    this._loadStation(nextKey);
    this.ui.hideTravel();
    this.clockMinutes += 4;
    this.ui.setClock(formatClock(this.clockMinutes));
    await this.ui.fadeFromBlack(950);

    this.sound.stopRide();
    this.isTraveling = false;
    const pointerLocked = this.player.controls.isLocked;
    this.player.setMovementEnabled(pointerLocked);
    this.interaction.setEnabled(pointerLocked);
    if (!pointerLocked) {
      this.ui.showTitle(true);
    } else {
      this.ui.showToast(
        `Arrived at ${destination.nameEN} — ${destination.nameJP}`,
        3800
      );
    }
  }

  _handleTrainEvent(event) {
    if (event === 'approach') {
      this.sound.crossingBell(0.22);
      if (!this.isTraveling) {
        this.ui.showToast('A local train is approaching. The crossing bell rings.', 3000);
      }
    } else if (event === 'doorsOpen') {
      this.sound.doorChime();
      window.setTimeout(() => this.sound.doorsSlide(true), 150);
      if (!this.isTraveling) {
        this.ui.showToast('The local has stopped. The doors are open.', 2600);
      }
    } else if (event === 'doorsClose') {
      this.sound.doorsSlide(false);
    } else if (event === 'depart') {
      this.sound.crossingBell(0.15);
    }
  }

  _nearestVendingDistance() {
    if (!this.activeVendingMachines.length) return 99;
    let nearest = 99;
    const position = this.player.position;
    for (const machine of this.activeVendingMachines) {
      const distance = Math.hypot(
        position.x - machine.position.x,
        position.z - machine.position.z
      );
      if (distance < nearest) nearest = distance;
    }
    return nearest;
  }

  _updateTrainStatus(force = false) {
    const now = performance.now();
    if (!force && now - this.statusTimer < 180) return;
    this.statusTimer = now;
    const status = this.train.getStatusInfo();
    this.ui.setTrainStatus(status.text, status.mode);
  }

  _animate() {
    requestAnimationFrame(this._animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    this.player.update(dt);

    if (this.currentStation) {
      this.currentStation.update(dt, this.elapsed);
    }

    for (const machine of this.activeVendingMachines) {
      machine.update(dt, this.elapsed);
    }

    const trainMetrics = this.train.update(dt, this.player.position);
    this._updateTrainStatus();

    if (
      this.player.controls.isLocked &&
      !this.ui.vendingOpen &&
      !this.isTraveling
    ) {
      this.interaction.update(this.player.position);
    }

    this.sound.update(dt, {
      ...trainMetrics,
      vendingDistance: this._nearestVendingDistance(),
      isTraveling: this.isTraveling
    });

    this.atmosphere.update(dt, this.elapsed, this.camera);
    this.sceneSystem.render(this.elapsed);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new Game();
  } catch (error) {
    console.error(error);
    const message = document.createElement('div');
    message.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:999',
      'display:grid',
      'place-items:center',
      'padding:30px',
      'background:#f3ecdf',
      'color:#4b4337',
      'font:16px/1.6 Georgia,serif',
      'text-align:center'
    ].join(';');
    message.textContent =
      'The station could not be opened. Please check the browser console and make sure the project is served over a local HTTP server.';
    document.body.append(message);
  }
});
