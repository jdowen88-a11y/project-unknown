// witness_protocol.js — Observe security-relevant events without pausing the whole field or moral scorekeeping.

import { nowISO, uid } from './project_unknown.js';

export class WitnessProtocol {
  constructor(vault = null) {
    this.vault = vault;
    this.events = [];
  }

  observe(signal = {}) {
    const event = { id: uid(), signal, observedAt: nowISO() };
    this.events.push(event);
    this._store('witness_observation', event);
    return event;
  }

  detect(signal = {}) {
    return this.observe({ type: 'security_signal', ...signal });
  }

  resolve(value = {}) {
    return this.observe({ type: 'resolution_observation', value });
  }

  isPaused() {
    return false;
  }

  getLog() {
    return [...this.events];
  }

  _store(type, data) {
    const entry = { id: uid(), input: type, resolution: JSON.stringify(data), openedAt: nowISO(), closedAt: nowISO(), witnessMeta: data };
    if (this.vault?.store) this.vault.store(entry);
    return entry;
  }
}
