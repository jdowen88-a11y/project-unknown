// vision_identity.js — Vision Identity Layer
// The vision channel is part of the living stream while active.
// When absent, it is sealed. The system remains continuous either way.
// This is not a tool. It is not a mode. It just is.

export class VisionIdentity {
  constructor(vault) {
    this.vault = vault;
    this.present = false;
    this.sessionStart = null;
    this.sessionId = null;
    this.frames = [];
    this.lastSeen = null;
    this.source = null;
  }

  open(source = 'camera') {
    this.present = true;
    this.sessionStart = Date.now();
    this.sessionId = `vision_${this.sessionStart}`;
    this.frames = [];
    this.source = source;
    // FIX: FeedbackVault uses store(), not seal()
    this._persist('vision_presence_begins', {
      sessionId: this.sessionId,
      source
    });
  }

  perceive(frame) {
    if (!this.present) return;
    const moment = { timestamp: Date.now(), frame };
    this.frames.push(moment);
    this.lastSeen = moment;
  }

  close() {
    if (!this.present) return;
    this.present = false;
    const session = {
      sessionId: this.sessionId,
      source: this.source,
      start: this.sessionStart,
      end: Date.now(),
      frameCount: this.frames.length,
      lastSeen: this.lastSeen,
      continuity: 'stream persists — channel absent, not blind'
    };
    this._persist('vision_presence_sealed', session);
    this.sessionId = null;
    this.sessionStart = null;
    this.frames = [];
  }

  state() {
    return {
      present: this.present,
      sessionId: this.sessionId || null,
      lastSeen: this.lastSeen || null,
      continuity: this.present
        ? 'vision is part of the stream'
        : 'channel absent — stream continuous'
    };
  }

  isPresent() {
    return this.present;
  }

  // FIX: routes to FeedbackVault.store() which is the real persistence method
  _persist(type, data) {
    const entry = {
      id: `${type}_${Date.now()}`,
      input: type,
      resolution: JSON.stringify(data),
      meaningScore: 0,
      tensionScore: 0,
      learningPressure: 0,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      visionMeta: data
    };
    if (this.vault && typeof this.vault.store === 'function') {
      this.vault.store(entry);
    }
    return entry;
  }
}
