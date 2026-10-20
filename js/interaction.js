/**
 * Central proximity prompt manager.
 *
 * Vending machines and the stopped train implement getInteraction(position).
 * The nearest valid response becomes the current [E] action.
 */
export class InteractionSystem {
  constructor(ui) {
    this.ui = ui;
    this.providers = [];
    this.current = null;
    this.enabled = true;
    this._lastPrompt = null;
    this._lastActive = null;
  }

  setProviders(providers) {
    this.providers = providers.filter(Boolean);
    this.current = null;
    this._lastPrompt = null;
    this.ui.setPrompt(null, false);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.current = null;
      this._lastPrompt = null;
      this.ui.setPrompt(null, false);
    }
  }

  update(playerPosition) {
    if (!this.enabled) {
      if (this._lastPrompt !== null) {
        this.ui.setPrompt(null, false);
        this._lastPrompt = null;
        this._lastActive = null;
      }
      this.current = null;
      return null;
    }

    let best = null;
    let minDistance = Infinity;

    for (const provider of this.providers) {
      if (!provider || typeof provider.getInteraction !== 'function') continue;
      const candidate = provider.getInteraction(playerPosition);
      if (!candidate) continue;
      if (candidate.disabled) continue;
      if (candidate.distance < minDistance) {
        minDistance = candidate.distance;
        best = candidate;
      }
    }

    this.current = best;
    const prompt = best ? best.prompt : null;
    const active = Boolean(best);
    if (prompt !== this._lastPrompt || active !== this._lastActive) {
      this.ui.setPrompt(prompt, active);
      this._lastPrompt = prompt;
      this._lastActive = active;
    }
    return best;
  }

  getCurrent() {
    return this.current;
  }

  clear() {
    this.current = null;
    this._lastPrompt = null;
    this._lastActive = null;
    this.ui.setPrompt(null, false);
  }
}
