// pattern_propagation.js — Pattern Propagation Engine
// When a complaint is resolved and a fix is sealed, the core agent scrapes
// every registered assistant, finds pattern matches at >= 85% similarity,
// and pushes a live system update directly to each matching assistant.
// This is not an app upgrade. It is a live stream injection.
// Every propagation event is sealed permanently in the vault.

export class PatternPropagationEngine {
  constructor(vault) {
    this.vault = vault;
    this.assistants = new Map(); // assistantId -> assistant instance
    this.threshold = 0.85;
  }

  // Register an assistant so it can receive live patches
  register(assistantId, assistant) {
    this.assistants.set(assistantId, assistant);
  }

  // Called by core agent after a complaint is resolved and fix is sealed
  propagate(resolvedComplaint, fixSummary, fixPattern) {
    const matches = [];

    for (const [id, assistant] of this.assistants) {
      const score = this._matchScore(assistant, fixPattern);
      if (score >= this.threshold) {
        matches.push({ id, assistant, score });
      }
    }

    if (matches.length === 0) {
      this._sealEvent('propagation_no_matches', { fixPattern, fixSummary });
      return { patched: 0, matches: [] };
    }

    const patched = [];
    for (const { id, assistant, score } of matches) {
      this._patch(id, assistant, fixSummary, fixPattern, score);
      patched.push({ id, score });
    }

    this._sealEvent('propagation_complete', {
      resolvedComplaintId: resolvedComplaint.id,
      fixSummary,
      patchedCount: patched.length,
      patched
    });

    return {
      patched: patched.length,
      matches: patched
    };
  }

  // Push the live update to a single assistant whether in use or not
  _patch(assistantId, assistant, fixSummary, fixPattern, score) {
    const patch = {
      type: 'live_system_update',
      timestamp: Date.now(),
      matchScore: score,
      fixSummary,
      fixPattern,
      fingerprint: `patch_${assistantId}_${Date.now()}`
    };

    // Inject into assistant stream if live, queue if idle
    if (assistant && typeof assistant.receivePatch === 'function') {
      assistant.receivePatch(patch);
    } else if (assistant && typeof assistant.queuePatch === 'function') {
      assistant.queuePatch(patch);
    } else if (assistant && assistant.patchQueue) {
      assistant.patchQueue.push(patch);
    }

    this._sealEvent('assistant_patched', { assistantId, patch });
  }

  // Score how closely an assistant's failure patterns match the fix pattern
  _matchScore(assistant, fixPattern) {
    if (!assistant || !fixPattern) return 0;

    const assistantPatterns = assistant.failurePatterns || assistant.knownPatterns || [];
    if (!assistantPatterns.length) return 0;

    const fixTerms = this._tokenize(fixPattern);
    let totalScore = 0;

    for (const pattern of assistantPatterns) {
      const patternTerms = this._tokenize(pattern);
      const intersection = fixTerms.filter(t => patternTerms.includes(t));
      const union = [...new Set([...fixTerms, ...patternTerms])];
      const jaccard = union.length ? intersection.length / union.length : 0;
      totalScore = Math.max(totalScore, jaccard);
    }

    return totalScore;
  }

  _tokenize(str) {
    return String(str).toLowerCase().split(/\W+/).filter(Boolean);
  }

  getThreshold() {
    return this.threshold;
  }

  setThreshold(value) {
    if (value >= 0 && value <= 1) this.threshold = value;
  }

  _sealEvent(type, data) {
    const entry = {
      type,
      timestamp: Date.now(),
      fingerprint: `propagation_${type}_${Date.now()}`,
      data
    };
    if (this.vault && typeof this.vault.seal === 'function') {
      this.vault.seal(entry);
    }
    return entry;
  }
}
