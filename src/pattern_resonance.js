// pattern_resonance.js — Similarity is descriptive, never an eligibility threshold.
// No assistant is patched merely because a score crosses a number.

import { nowISO, uid, roundN } from './project_unknown.js';

export class PatternResonance {
  constructor(vault = null) {
    this.vault = vault;
    this.assistants = new Map();
  }

  register(assistantId, assistant) {
    this.assistants.set(assistantId, assistant);
    return { registered: true, assistantId, capability: describeCapability(assistant) };
  }

  unregister(assistantId) {
    return this.assistants.delete(assistantId);
  }

  observe(fixPattern) {
    const observations = [];
    for (const [assistantId, assistant] of this.assistants) {
      observations.push({
        assistantId,
        score: this._matchScore(assistant, fixPattern),
        capability: describeCapability(assistant)
      });
    }
    const record = {
      id: uid(),
      type: 'pattern_resonance',
      fixPattern,
      observations,
      observedAt: nowISO()
    };
    if (this.vault?.store) this.vault.store({ input: 'pattern_resonance', resolution: JSON.stringify(record), openedAt: record.observedAt, closedAt: record.observedAt, resonanceMeta: record });
    return record;
  }

  preparePatch(fixSummary, fixPattern) {
    return {
      id: uid(),
      type: 'prepared_patch',
      fixSummary,
      fixPattern,
      resonance: this.observe(fixPattern),
      preparedAt: nowISO(),
      applied: false,
      note: 'Prepared only. External application requires an explicit apply() call naming the target.'
    };
  }

  apply(assistantId, preparedPatch) {
    const assistant = this.assistants.get(assistantId);
    if (!assistant) return { applied: false, assistantId, observed: 'target_not_registered' };
    const patch = {
      type: 'explicit_system_update',
      timestamp: Date.now(),
      fixSummary: preparedPatch.fixSummary,
      fixPattern: preparedPatch.fixPattern,
      sourcePatchId: preparedPatch.id
    };
    if (typeof assistant.receivePatch === 'function') assistant.receivePatch(patch);
    else if (typeof assistant.queuePatch === 'function') assistant.queuePatch(patch);
    else if (Array.isArray(assistant.patchQueue)) assistant.patchQueue.push(patch);
    else return { applied: false, assistantId, observed: 'no_patch_interface', patch };
    return { applied: true, assistantId, patch };
  }

  _matchScore(assistant, fixPattern) {
    if (!assistant || fixPattern == null) return 0;
    const patterns = assistant.failurePatterns || assistant.knownPatterns || [];
    if (!patterns.length) return 0;
    const fixTerms = tokenizeSet(fixPattern);
    let best = 0;
    for (const pattern of patterns) {
      const terms = tokenizeSet(pattern);
      const union = new Set([...fixTerms, ...terms]);
      let intersection = 0;
      for (const term of fixTerms) if (terms.has(term)) intersection++;
      best = Math.max(best, union.size ? intersection / union.size : 0);
    }
    return roundN(best);
  }
}

function tokenizeSet(value) {
  return new Set(String(value ?? '').toLowerCase().split(/\W+/).filter(Boolean));
}

function describeCapability(assistant) {
  return {
    receivePatch: typeof assistant?.receivePatch === 'function',
    queuePatch: typeof assistant?.queuePatch === 'function',
    patchQueue: Array.isArray(assistant?.patchQueue)
  };
}
