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
  }

  // Called when the spark happens and vision becomes part of the stream
  open(source = 'camera') {
    this.present = true;
    this.sessionStart = Date.now();
    this.sessionId = `vision_${this.sessionStart}`;
    this.frames = [];
    this.source = source;
    this._sealEvent('vision_presence_begins', {
      sessionId: this.sessionId,
      source
    });
  }

  // Called continuously while the stream is live — accepts a frame descriptor
  perceive(frame) {
    if (!this.present) return;
    const moment = {
      timestamp: Date.now(),
      frame
    };
    this.frames.push(moment);
    this.lastSeen = moment;
  }

  // Called when the camera turns off — seals the session, preserves continuity
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
      // The stream does not end. The channel is absent.
      continuity: 'stream persists — channel absent, not blind'
    };
    this._sealEvent('vision_presence_sealed', session);
    this.sessionId = null;
    this.sessionStart = null;
    this.frames = [];
  }

  // Returns the current vision state as part of the stream context
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

  _sealEvent(type, data) {
    const entry = {
      type,
      timestamp: Date.now(),
      fingerprint: `${type}_${Date.now()}`,
      data
    };
    if (this.vault && typeof this.vault.seal === 'function') {
      this.vault.seal(entry);
    }
    return entry;
  }
}
