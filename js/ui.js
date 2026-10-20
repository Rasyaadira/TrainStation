/**
 * DOM interface: title/pause, minimal HUD, vending overlay, transit vignette.
 */
const numberFormatter = new Intl.NumberFormat('en-US');

export class UI {
  constructor(drinks, callbacks = {}) {
    this.drinks = drinks;
    this.callbacks = {
      onStart: callbacks.onStart ?? (() => {}),
      onVendingSelect: callbacks.onVendingSelect ?? (() => {}),
      onVendingClose: callbacks.onVendingClose ?? (() => {}),
      onMute: callbacks.onMute ?? (() => {})
    };

    this.hud = document.getElementById('hud');
    this.titleScreen = document.getElementById('title-screen');
    this.titleSubtitle = document.getElementById('title-subtitle');
    this.startButton = document.getElementById('start-button');
    this.stationJP = document.getElementById('station-jp');
    this.stationEN = document.getElementById('station-en');
    this.trainStatusText = document.getElementById('train-status-text');
    this.trainDot = document.getElementById('train-dot');
    this.clock = document.getElementById('clock');
    this.muteButton = document.getElementById('mute-button');
    this.muteIcon = document.getElementById('mute-icon');
    this.crosshair = document.getElementById('crosshair');
    this.prompt = document.getElementById('prompt');
    this.promptCopy = document.getElementById('prompt-copy');
    this.toastElement = document.getElementById('toast');
    this.inventoryList = document.getElementById('inventory-list');
    this.vendingModal = document.getElementById('vending-modal');
    this.vendingGrid = document.getElementById('vending-grid');
    this.vendingClose = document.getElementById('vending-close');
    this.travelScreen = document.getElementById('travel-screen');
    this.travelJP = document.getElementById('travel-jp');
    this.travelEN = document.getElementById('travel-en');
    this.fadeLayer = document.getElementById('fade-layer');

    this.vendingOpen = false;
    this.toastTimer = null;
    this._lastPrompt = undefined;
    this._lastStatus = '';
    this._lastInventoryKey = '';
    this._fadeTimer = null;

    this._buildDrinkCards();
    this._bindEvents();
  }

  _buildDrinkCards() {
    this.vendingGrid.replaceChildren();
    this.drinkCards = [];
    this.drinks.forEach((drink, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'drink-card';
      card.style.setProperty('--can', drink.color);
      card.style.setProperty('--can-accent', drink.accent ?? '#f4ebd7');
      card.style.setProperty('--can-label', drink.labelColor ?? '#34372f');
      card.setAttribute('aria-label', `Buy ${drink.nameEN} for ${drink.price} yen`);

      const key = document.createElement('span');
      key.className = 'drink-key';
      key.textContent = String(index + 1);

      const temp = document.createElement('span');
      temp.className = `drink-temp${drink.temp === 'HOT' ? ' hot' : ''}`;
      temp.textContent = drink.temp;

      const canWrap = document.createElement('div');
      canWrap.className = 'drink-can-wrap';
      const can = document.createElement('span');
      can.className = 'drink-can';
      const canLabel = document.createElement('span');
      canLabel.className = 'can-kanji';
      canLabel.textContent = drink.label;
      can.append(canLabel);
      canWrap.append(can);

      const name = document.createElement('p');
      name.className = 'drink-name';
      name.textContent = drink.nameEN;

      const jp = document.createElement('p');
      jp.className = 'drink-jp';
      jp.textContent = drink.nameJP;

      const price = document.createElement('span');
      price.className = 'drink-price';
      price.textContent = `¥${numberFormatter.format(drink.price)}`;

      card.append(key, temp, canWrap, name, jp, price);
      card.addEventListener('click', () => this._selectDrink(index));
      this.vendingGrid.append(card);
      this.drinkCards.push(card);
    });
  }

  _bindEvents() {
    this.startButton.addEventListener('click', () => this.callbacks.onStart());
    this.vendingClose.addEventListener('click', () => this._closeFromUser('resume'));
    this.muteButton.addEventListener('click', () => this.callbacks.onMute());

    document.addEventListener('keydown', (event) => {
      if (!this.vendingOpen) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        this._closeFromUser('pause');
        return;
      }
      const digit = /^Digit([1-8])$/.exec(event.code) || /^Numpad([1-8])$/.exec(event.code);
      if (digit) {
        event.preventDefault();
        this._selectDrink(Number(digit[1]) - 1);
      }
    });
  }

  _selectDrink(index) {
    if (!this.vendingOpen) return;
    if (!this.drinks[index]) return;
    this.vendingOpen = false;
    this.vendingModal.classList.add('hidden');
    this.callbacks.onVendingSelect(index);
  }

  _closeFromUser(reason) {
    if (!this.vendingOpen) return;
    this.vendingOpen = false;
    this.vendingModal.classList.add('hidden');
    this.callbacks.onVendingClose(reason);
  }

  openVending() {
    if (this.vendingOpen) return;
    this.vendingOpen = true;
    this.vendingModal.classList.remove('hidden');
    this.setPrompt(null, false);
    // The overlay is intentionally keyboard accessible as well as clickable.
    window.setTimeout(() => {
      this.drinkCards[0]?.focus({ preventScroll: true });
    }, 60);
  }

  hideTitle() {
    this.titleScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  showTitle(resume = false) {
    if (this.vendingOpen) return;
    this.titleScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.startButton.querySelector('span').textContent = resume ? 'Click to resume' : 'Click to start';
    this.titleSubtitle.textContent = resume
      ? 'The platform is still here. The next local will come when it comes.'
      : 'A quiet place between two stops. Listen for the crossing bell.';
    this.setPrompt(null, false);
    this.crosshair.classList.remove('active');
    window.setTimeout(() => this.startButton.focus({ preventScroll: true }), 80);
  }

  setStation({ nameJP, nameEN }) {
    this.stationJP.textContent = nameJP;
    this.stationEN.textContent = nameEN;
  }

  setClock(text) {
    this.clock.textContent = text;
  }

  setTrainStatus(text, mode = 'normal') {
    if (text === this._lastStatus) return;
    this._lastStatus = text;
    this.trainStatusText.textContent = text;
    this.trainDot.className = 'train-dot';
    if (mode === 'warning') this.trainDot.classList.add('warning');
    if (mode === 'boarding') this.trainDot.classList.add('boarding');
  }

  setPrompt(text, active = Boolean(text)) {
    if (text === this._lastPrompt) return;
    this._lastPrompt = text;
    if (!text) {
      this.prompt.classList.add('hidden');
      this.crosshair.classList.remove('active');
      return;
    }
    this.promptCopy.textContent = text;
    this.prompt.classList.remove('hidden');
    this.crosshair.classList.toggle('active', active);
  }

  setInventory(inventory) {
    const entries = Array.from(inventory.entries());
    const key = entries.map(([name, count]) => `${name}:${count}`).join('|');
    if (key === this._lastInventoryKey) return;
    this._lastInventoryKey = key;
    this.inventoryList.replaceChildren();
    if (!entries.length) {
      this.inventoryList.textContent = 'Empty';
      return;
    }
    for (const [name, count] of entries) {
      const row = document.createElement('div');
      row.textContent = count > 1 ? `${name} ×${count}` : name;
      this.inventoryList.append(row);
    }
  }

  showToast(message, duration = 3400) {
    this.toastElement.textContent = message;
    this.toastElement.classList.remove('hidden');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.add('hidden');
      this.toastTimer = null;
    }, duration);
  }

  setMuted(muted) {
    this.muteIcon.textContent = muted ? '—' : '♪';
    this.muteButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    this.muteButton.title = muted ? 'Unmute sound (M)' : 'Mute sound (M)';
  }

  fadeToBlack(duration = 900) {
    this.fadeLayer.classList.add('is-opaque');
    return new Promise((resolve) => {
      if (this._fadeTimer) window.clearTimeout(this._fadeTimer);
      this._fadeTimer = window.setTimeout(() => {
        this._fadeTimer = null;
        resolve();
      }, duration);
    });
  }

  fadeFromBlack(duration = 900) {
    this.fadeLayer.classList.remove('is-opaque');
    return new Promise((resolve) => {
      if (this._fadeTimer) window.clearTimeout(this._fadeTimer);
      this._fadeTimer = window.setTimeout(() => {
        this._fadeTimer = null;
        resolve();
      }, duration);
    });
  }

  showTravel({ nameJP, nameEN }) {
    this.travelJP.textContent = `ガタゴト… ${nameJP}へ向かっています`;
    this.travelEN.textContent = `The local line carries you toward ${nameEN}.`;
    this.travelScreen.classList.remove('hidden');
    document.body.classList.add('traveling');
  }

  hideTravel() {
    this.travelScreen.classList.add('hidden');
    document.body.classList.remove('traveling');
  }

  hideHud() {
    this.hud.classList.add('hidden');
  }

  showHud() {
    this.hud.classList.remove('hidden');
  }
}
