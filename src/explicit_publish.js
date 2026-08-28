// explicit_publish.js — Internal emergence is unrestricted; external mutation remains explicitly invoked.
// There is no approval class, qualified-user tier, confidence gate, or hidden auto-deploy.

import { nowISO, uid } from './utils.js';

export class ExplicitPublish {
  constructor(vault = null, masterVault = null) {
    this.vault = vault;
    this.masterVault = masterVault;
    this.prepared = [];
    this.publishHistory = [];
    this.registeredTargets = new Map();
  }

  register(targetId, target) {
    this.registeredTargets.set(targetId, target);
    return { registered: true, targetId, capability: capability(target) };
  }

  unregister(targetId) {
    return this.registeredTargets.delete(targetId);
  }

  prepare(value = {}) {
    const entry = {
      id: uid(),
      value: structuredCloneSafe(value),
      preparedAt: nowISO(),
      state: 'prepared',
      note: 'Preparation is representation, not external execution.'
    };
    this.prepared.push(entry);
    this._persist('publish_prepared', entry);
    return entry;
  }

  // Explicitly named action. It never runs from prepare(), confidence scoring, or background timers.
  publish(preparedOrId, targetIds = [...this.registeredTargets.keys()]) {
    const entry = typeof preparedOrId === 'string'
      ? this.prepared.find(x => x.id === preparedOrId)
      : preparedOrId;
    if (!entry) return { published: false, observation: 'prepared_entry_not_found' };

    const results = [];
    for (const targetId of targetIds) {
      const target = this.registeredTargets.get(targetId);
      if (!target) {
        results.push({ targetId, published: false, observation: 'target_not_registered' });
        continue;
      }
      try {
        if (typeof target.receiveFix === 'function') target.receiveFix(entry.value);
        else if (typeof target.receivePatch === 'function') target.receivePatch(entry.value);
        else if (typeof target.apply === 'function') target.apply(entry.value);
        else {
          results.push({ targetId, published: false, observation: 'no_supported_external_apply_interface' });
          continue;
        }
        results.push({ targetId, published: true });
      } catch (error) {
        results.push({ targetId, published: false, observation: 'target_error', error: error.message });
      }
    }

    const record = { id: uid(), sourceId: entry.id, publishedAt: nowISO(), results };
    entry.state = 'published_explicitly';
    this.publishHistory.push(record);
    this._persist('explicit_publish', record);
    return { published: true, ...record };
  }

  status() {
    return {
      prepared: this.prepared.length,
      explicitPublishes: this.publishHistory.length,
      registeredTargets: this.registeredTargets.size,
      recent: this.publishHistory.slice(-10)
    };
  }

  _persist(type, data) {
    const record = {
      id: uid(),
      input: type,
      resolution: JSON.stringify(data),
      openedAt: nowISO(),
      closedAt: nowISO(),
      publishMeta: data
    };
    if (this.vault?.store) this.vault.store(record);
    return record;
  }
}

function capability(target) {
  return {
    receiveFix: typeof target?.receiveFix === 'function',
    receivePatch: typeof target?.receivePatch === 'function',
    apply: typeof target?.apply === 'function'
  };
}

function structuredCloneSafe(value) {
  try { return structuredClone(value); }
  catch {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return value; }
  }
}
