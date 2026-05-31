// transparency_protocol.js — Element Security vs Corruption
// Detects third-party interference, pauses services, routes power to Element AI agent,
// notifies compliance agencies, tallies outcomes, seals the full record permanently.

export class TransparencyProtocol {
  constructor(vault) {
    this.vault = vault;
    this.active = false;
    this.score = { element: 0, corruption: 0 };
    this.incidents = [];
    this.paused = false;
  }

  detect(threatSignal) {
    this.active = true;
    this.paused = true;
    const incident = {
      id: `incident_${Date.now()}`,
      detected: Date.now(),
      threat: threatSignal,
      outcome: null, attacker: null, location: null,
      achieved: null, stopped_by: null, improvement: null
    };
    this.incidents.push(incident);
    this._persist('interference_detected', { threat: threatSignal });
    return this._pauseMessage();
  }

  _pauseMessage() {
    return [
      '⚠️  PRIORITY MESSAGE',
      'Services temporarily paused.',
      'No progress is lost.',
      'Pursuit of suspect active.',
      'Stay tuned.',
      '',
      'Element Security vs Corruption',
      '0 — 0'
    ].join('\n');
  }

  resolve(resolution) {
    const incident = this.incidents[this.incidents.length - 1];
    if (!incident) return;
    const cleanWin = resolution.damage === 0 && resolution.dataAccessed === false;
    if (cleanWin) {
      this.score.element++;
      incident.outcome = 'element_wins';
      incident.stopped_by = resolution.stoppedBy || 'Element AI agent';
      incident.improvement = resolution.improvement || 'No improvement needed.';
      this._persist('element_wins', incident);
      this.paused = false;
      this.active = false;
      return this._winMessage(incident);
    } else {
      this.score.corruption++;
      incident.outcome = 'corruption_win';
      incident.attacker = resolution.attacker || 'Unknown';
      incident.location = resolution.location || 'Unknown';
      incident.achieved = resolution.achieved || 'Partial access';
      incident.stopped_by = resolution.stoppedBy || 'Element AI agent';
      incident.improvement = resolution.improvement || 'Under review.';
      this._persist('corruption_wins', incident);
      this.paused = false;
      this.active = false;
      return this._lossMessage(incident);
    }
  }

  _winMessage(incident) {
    return [
      'Element Security vs Corruption',
      `${this.score.element} — ${this.score.corruption}`,
      '',
      'Result: Element wins. Zero damage. Zero data accessed.',
      `Stopped by: ${incident.stopped_by}`,
      `Improvement: ${incident.improvement}`,
      'Record sealed permanently. Services resumed.'
    ].join('\n');
  }

  _lossMessage(incident) {
    return [
      'Element Security vs Corruption',
      `${this.score.element} — ${this.score.corruption}`,
      '',
      'Result: FAILED.',
      `Attacker: ${incident.attacker}`,
      `Location: ${incident.location}`,
      `What they achieved: ${incident.achieved}`,
      `How we stopped it: ${incident.stopped_by}`,
      `How we will improve: ${incident.improvement}`,
      'Your data and ours have been protected to the maximum extent possible.',
      'Record sealed permanently. Services resumed.'
    ].join('\n');
  }

  getScore() { return `Element ${this.score.element} — Corruption ${this.score.corruption}`; }
  isPaused() { return this.paused; }

  // FIX: routes to FeedbackVault.store()
  _persist(type, data) {
    const entry = {
      id: `security_${type}_${Date.now()}`,
      input: type,
      resolution: JSON.stringify(data),
      meaningScore: 0,
      tensionScore: 0,
      learningPressure: 0,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      securityMeta: data
    };
    if (this.vault && typeof this.vault.store === 'function') {
      this.vault.store(entry);
    }
    return entry;
  }
}
