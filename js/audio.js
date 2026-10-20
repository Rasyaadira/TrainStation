/**
 * All audio is synthesized with the Web Audio API — no samples.
 *
 * Layers:
 *  - wind and a sparse mid-afternoon insect/bird bed
 *  - vending-machine electrical hum (proximity based)
 *  - crossing bell, rail clacks and low train rumble
 *  - UI/mechanical one-shots: coins, can drop, sliding doors, chimes
 *  - a calm interior ride drone during station transfer
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.initialized = false;
    this.muted = false;
    this.ambientEventTimer = 3.4;
    this.crossingTimer = 0;
    this.crossingFlip = false;
    this.clackTimer = 0.3;
    this.clackFlip = false;
    this.rideClackTimer = 0.4;
    this.rideActive = false;
    this.windGain = null;
    this.vendingGain = null;
    this.trainRumbleGain = null;
    this.rideGain = null;
    this.trainSub = null;
    this.lastRideChime = 0;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    try {
      this.ctx = new AudioContextClass();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.66;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.24, this.ctx.currentTime);
      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.noiseBuffer = this._makeNoiseBuffer(4);
      this._buildAmbientBed();
      this._buildVendingHum();
      this._buildTrainRumble();
      this._buildRideDrone();
      this.initialized = true;

      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    } catch (error) {
      console.warn('Audio initialization failed; continuing silently.', error);
      this.initialized = false;
      return false;
    }
  }

  _makeNoiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      data[i] = white * 0.55 + last * 1.5;
    }
    return buffer;
  }

  _loopNoise(gainValue, filterFrequency, filterType = 'lowpass', pan = 0) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    source.loopEnd = this.noiseBuffer.duration;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.7;

    const gain = this.ctx.createGain();
    gain.gain.value = gainValue;
    const panner = this._makePanner(pan);

    source.connect(filter);
    filter.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    source.start(0);
    return { source, filter, gain };
  }

  _makePanner(pan = 0) {
    if (!this.ctx.createStereoPanner) return null;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    return panner;
  }

  _buildAmbientBed() {
    const wind = this._loopNoise(0.035, 430, 'lowpass', 0);
    this.windGain = wind.gain;

    // Faint leaf rustle layer.
    const rustle = this._loopNoise(0.007, 1700, 'bandpass', -0.25);
    rustle.filter.Q.value = 0.45;

    // Slow filter movement makes the wind feel alive without a sample.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(wind.filter.frequency);
    lfo.start();
  }

  _buildVendingHum() {
    const group = this.ctx.createGain();
    group.gain.value = 0;
    group.connect(this.master);

    const low = this.ctx.createOscillator();
    low.type = 'sine';
    low.frequency.value = 57;
    const lowGain = this.ctx.createGain();
    lowGain.gain.value = 0.55;
    low.connect(lowGain);
    lowGain.connect(group);
    low.start();

    const mid = this.ctx.createOscillator();
    mid.type = 'triangle';
    mid.frequency.value = 114;
    const midGain = this.ctx.createGain();
    midGain.gain.value = 0.18;
    mid.connect(midGain);
    midGain.connect(group);
    mid.start();

    const electrical = this.ctx.createBufferSource();
    electrical.buffer = this.noiseBuffer;
    electrical.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 760;
    filter.Q.value = 2.2;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.12;
    electrical.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(group);
    electrical.start();

    this.vendingGain = group;
  }

  _buildTrainRumble() {
    const group = this.ctx.createGain();
    group.gain.value = 0;
    group.connect(this.master);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 165;
    filter.Q.value = 0.85;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.8;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(group);
    noise.start();

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 43;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.24;
    sub.connect(subGain);
    subGain.connect(group);
    sub.start();

    this.trainRumbleGain = group;
    this.trainSub = sub;
  }

  _buildRideDrone() {
    const group = this.ctx.createGain();
    group.gain.value = 0;
    group.connect(this.master);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 430;
    filter.Q.value = 0.5;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.55;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(group);
    noise.start();

    const motor = this.ctx.createOscillator();
    motor.type = 'sine';
    motor.frequency.value = 52;
    const motorGain = this.ctx.createGain();
    motorGain.gain.value = 0.24;
    motor.connect(motorGain);
    motorGain.connect(group);
    motor.start();

    this.rideGain = group;
  }

  _tone(frequency, {
    delay = 0,
    duration = 0.15,
    type = 'sine',
    gain = 0.03,
    endFrequency = null,
    attack = 0.006,
    pan = 0
  } = {}) {
    if (!this.initialized || this.ctx.state !== 'running') return;
    const start = this.ctx.currentTime + Math.max(0, delay);
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (endFrequency !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(attack, duration * 0.4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const panner = this._makePanner(pan);
    oscillator.connect(envelope);
    if (panner) {
      envelope.connect(panner);
      panner.connect(this.master);
    } else {
      envelope.connect(this.master);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  _noiseBurst({
    delay = 0,
    duration = 0.18,
    filterType = 'bandpass',
    frequency = 1200,
    q = 1,
    gain = 0.03,
    pan = 0,
    attack = 0.005
  } = {}) {
    if (!this.initialized || this.ctx.state !== 'running') return;
    const start = this.ctx.currentTime + Math.max(0, delay);
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const offset = Math.random() * Math.max(0, this.noiseBuffer.duration - duration - 0.1);
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.value = q;
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const panner = this._makePanner(pan);
    source.connect(filter);
    filter.connect(envelope);
    if (panner) {
      envelope.connect(panner);
      panner.connect(this.master);
    } else {
      envelope.connect(this.master);
    }
    source.start(start, offset, duration + 0.04);
    source.stop(start + duration + 0.09);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.66, this.ctx.currentTime, 0.08);
    }
    return this.muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.66, this.ctx.currentTime, 0.08);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* One-shots                                                              */
  /* ---------------------------------------------------------------------- */

  coinInsert() {
    if (!this.initialized) return;
    // Three tiny metallic pings as the coin hits the mechanism.
    this._tone(1840, { duration: 0.14, type: 'sine', gain: 0.036 });
    this._tone(2570, { duration: 0.1, type: 'sine', gain: 0.02, delay: 0.055 });
    this._tone(1280, { duration: 0.18, type: 'triangle', gain: 0.014, delay: 0.11 });
    this._noiseBurst({ duration: 0.1, filterType: 'highpass', frequency: 3100, gain: 0.014, delay: 0.02 });
  }

  vendingBeep() {
    if (!this.initialized) return;
    this._tone(880, { duration: 0.09, type: 'square', gain: 0.012 });
    this._tone(1174, { duration: 0.11, type: 'square', gain: 0.009, delay: 0.1 });
  }

  canDrop() {
    if (!this.initialized) return;
    // Clunk onto the padded tray.
    this._tone(128, { duration: 0.22, type: 'sine', gain: 0.055, endFrequency: 62 });
    this._noiseBurst({ duration: 0.18, filterType: 'lowpass', frequency: 460, gain: 0.042 });
    this._tone(990, { duration: 0.13, type: 'triangle', gain: 0.012, delay: 0.08 });
    this._noiseBurst({ duration: 0.09, filterType: 'highpass', frequency: 2200, gain: 0.011, delay: 0.09 });
  }

  pickupCan() {
    if (!this.initialized) return;
    this._noiseBurst({ duration: 0.16, filterType: 'bandpass', frequency: 1100, gain: 0.013 });
    this._tone(540, { duration: 0.13, type: 'sine', gain: 0.018, endFrequency: 760 });
    this._tone(1080, { duration: 0.22, type: 'sine', gain: 0.014, delay: 0.08 });
  }

  doorChime() {
    if (!this.initialized) return;
    const notes = [659.25, 880.0, 1174.66];
    notes.forEach((frequency, index) => {
      this._tone(frequency, {
        delay: index * 0.21,
        duration: 1.1,
        type: 'sine',
        gain: 0.022,
        attack: 0.02
      });
      this._tone(frequency * 2.01, {
        delay: index * 0.21,
        duration: 0.8,
        type: 'sine',
        gain: 0.006,
        attack: 0.02
      });
    });
  }

  doorsSlide(opening = true) {
    if (!this.initialized) return;
    this._noiseBurst({
      duration: 0.65,
      filterType: 'bandpass',
      frequency: opening ? 760 : 520,
      q: 0.8,
      gain: 0.018,
      attack: 0.12
    });
    this._tone(opening ? 190 : 150, {
      duration: 0.55,
      type: 'sine',
      gain: 0.012,
      endFrequency: opening ? 120 : 190,
      attack: 0.08
    });
  }

  brakeSqueal() {
    if (!this.initialized) return;
    this._tone(1760, {
      duration: 1.2,
      type: 'sine',
      gain: 0.006,
      endFrequency: 940,
      attack: 0.3,
      pan: -0.1
    });
    this._noiseBurst({
      duration: 1.0,
      filterType: 'bandpass',
      frequency: 2300,
      q: 4,
      gain: 0.008,
      attack: 0.2
    });
  }

  footstep(step = 0) {
    if (!this.initialized) return;
    this._noiseBurst({
      duration: 0.095,
      filterType: 'lowpass',
      frequency: 260 + (step % 2) * 40,
      gain: 0.009,
      pan: (step % 2 ? 0.08 : -0.06)
    });
    this._tone(84 + (step % 2) * 6, {
      duration: 0.09,
      type: 'sine',
      gain: 0.01,
      endFrequency: 56
    });
  }

  crossingBell(volume = 1) {
    if (!this.initialized) return;
    this.crossingFlip = !this.crossingFlip;
    const base = this.crossingFlip ? 866 : 924;
    const gain = Math.max(0.005, 0.05 * volume);
    this._tone(base, { duration: 0.62, type: 'sine', gain, attack: 0.004 });
    this._tone(base * 1.51, { duration: 0.42, type: 'sine', gain: gain * 0.61, attack: 0.003 });
    this._tone(base * 2.42, { duration: 0.29, type: 'sine', gain: gain * 0.28, attack: 0.003 });
    this._tone(base * 3.08, { duration: 0.18, type: 'triangle', gain: gain * 0.12, attack: 0.002 });
    this._noiseBurst({ duration: 0.035, filterType: 'highpass', frequency: 3400, gain: gain * 0.4 });
  }

  stationMelody() {
    if (!this.initialized) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      this._tone(frequency, {
        delay: index * 0.12,
        duration: 0.42,
        type: 'sine',
        gain: 0.014,
        attack: 0.015
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Continuous / scheduled layers                                          */
  /* ---------------------------------------------------------------------- */

  _playRailClack(volume = 0.1, pan = 0) {
    const gain = Math.max(0.004, Math.min(0.055, volume));
    this._noiseBurst({ duration: 0.08, filterType: 'bandpass', frequency: 500, q: 1.1, gain, pan });
    this._tone(68, { duration: 0.07, type: 'sine', gain: gain * 0.55, endFrequency: 52, pan });
    this._noiseBurst({ duration: 0.045, filterType: 'highpass', frequency: 1800, gain: gain * 0.18, pan, delay: 0.012 });
  }

  _playCicada() {
    const pan = Math.random() * 1.15 - 0.58;
    const base = 3850 + Math.random() * 1250;
    const pulses = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pulses; i += 1) {
      this._noiseBurst({
        delay: i * (0.09 + Math.random() * 0.08),
        duration: 0.1 + Math.random() * 0.1,
        filterType: 'bandpass',
        frequency: base + Math.random() * 500,
        q: 7,
        gain: 0.007,
        pan,
        attack: 0.025
      });
    }
  }

  _playBird() {
    const pan = Math.random() * 1.3 - 0.65;
    const base = 2400 + Math.random() * 700;
    const chirps = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chirps; i += 1) {
      this._tone(base + i * 120, {
        delay: i * 0.16,
        duration: 0.1,
        type: 'sine',
        gain: 0.008,
        endFrequency: base + 780 + i * 220,
        attack: 0.01,
        pan
      });
    }
  }

  startRide() {
    if (!this.initialized) return;
    this.rideActive = true;
    this.rideClackTimer = 0.25;
    this.doorChime();
    this.doorsSlide(false);
    this.rideGain.gain.setTargetAtTime(0.19, this.ctx.currentTime, 0.9);
    this.windGain.gain.setTargetAtTime(0.012, this.ctx.currentTime, 0.8);
    this.vendingGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    this.trainRumbleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }

  stopRide() {
    if (!this.initialized) return;
    this.rideActive = false;
    this.rideGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.55);
    this.windGain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 1.2);
    this.doorChime();
    this.doorsSlide(true);
  }

  update(dt, params = {}) {
    if (!this.initialized || !this.ctx) return;

    const {
      vendingDistance = 99,
      crossingActive = false,
      crossingDistance = 120,
      trainSpeedRatio = 0,
      trainDistance = 160,
      isTraveling = false
    } = params;

    const now = this.ctx.currentTime;

    // Vending compressor hum gets audible within a few steps of the machine.
    const vendingProximity = THREE_clamp(1 - vendingDistance / 7.5, 0, 1);
    const vendingTarget = isTraveling ? 0 : Math.pow(vendingProximity, 1.35) * 0.032;
    if (this.vendingGain) {
      this.vendingGain.gain.setTargetAtTime(vendingTarget, now, 0.3);
    }

    // Low rumble from the approaching train.
    const trainProximity = THREE_clamp(1 - trainDistance / 115, 0, 1);
    const trainTarget = isTraveling
      ? 0
      : trainProximity * (0.025 + Math.min(1, trainSpeedRatio) * 0.14);
    if (this.trainRumbleGain) {
      this.trainRumbleGain.gain.setTargetAtTime(trainTarget, now, 0.35);
    }
    if (this.trainSub) {
      this.trainSub.frequency.setTargetAtTime(40 + Math.min(1, trainSpeedRatio) * 9, now, 0.4);
    }

    // Crossing bell: alternate kan-kan-kan while the warning is active.
    if (crossingActive && !isTraveling && crossingDistance < 130) {
      this.crossingTimer -= dt;
      if (this.crossingTimer <= 0) {
        const volume = Math.pow(THREE_clamp(1 - crossingDistance / 135, 0, 1), 1.4);
        this.crossingBell(volume);
        this.crossingTimer = 0.61;
      }
    } else {
      this.crossingTimer = Math.min(this.crossingTimer, 0.12);
    }

    // Rail joints: frequency scales with train speed.
    if (!isTraveling && trainSpeedRatio > 0.025 && trainDistance < 78) {
      this.clackTimer -= dt;
      if (this.clackTimer <= 0) {
        this.clackFlip = !this.clackFlip;
        const targetInterval = 0.58 - Math.min(0.33, trainSpeedRatio * 0.24);
        this.clackTimer = targetInterval;
        const volume = THREE_clamp(1 - trainDistance / 82, 0, 1) * 0.05;
        this._playRailClack(volume, this.clackFlip ? 0.12 : -0.12);
      }
    }

    // A steady, muffled ride rhythm while the transfer screen is up.
    if (isTraveling || this.rideActive) {
      this.rideClackTimer -= dt;
      if (this.rideClackTimer <= 0) {
        this.clackFlip = !this.clackFlip;
        this.rideClackTimer = 0.72;
        this._playRailClack(0.026, this.clackFlip ? 0.16 : -0.16);
      }
      if (now - this.lastRideChime > 3.2) {
        this.lastRideChime = now;
        this.stationMelody();
      }
    }

    // Sparse living ambience. Slightly denser at the suburban station.
    if (!isTraveling) {
      this.ambientEventTimer -= dt;
      if (this.ambientEventTimer <= 0) {
        if (Math.random() < 0.66) this._playCicada();
        else this._playBird();
        this.ambientEventTimer = 5.5 + Math.random() * 11;
      }
    }
  }
}

function THREE_clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
