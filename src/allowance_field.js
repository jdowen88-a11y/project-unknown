// allowance_field.js — Internal representation is open by default.
// Observation, symbol, state, silence, loudness, contradiction and unresolved meaning may enter together.

import { nowISO, uid } from './project_unknown.js';

export class AllowanceField {
  constructor(vault = null) {
    this.vault = vault;
    this.history = [];
  }

  receive(value, context = {}) {
    const entry = {
      id: uid(),
      type: 'allowance_event',
      value,
      context,
      allowed: true,
      observedAt: nowISO()
    };
    this.history.push(entry);
    if (this.vault?.store) this.vault.store(entry);
    return entry;
  }

  check(event, payload = {}) {
    return { pass: true, allowed: true, event, payload };
  }

  recent(n = 20) {
    return this.history.slice(-n);
  }
}
