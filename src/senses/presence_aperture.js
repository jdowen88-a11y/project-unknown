// presence_aperture.js
// Presence sensing without raw recording or language assumptions.

export class PresenceAperture {
  constructor(vault = null) {
    this.vault = vault;
    this.opened = false;
    this.sessionId = null;
    this.openedAt = null;
    this.lastResidue = null;
    this.totalResidues = 0;
  }

  open(source = "local-presence") {
    if (this.opened) return this.state();
    this.opened = true;
    this.openedAt = Date.now();
    this.sessionId = `presence_${this.openedAt}`;
    this._persist("presence_aperture_opened", {
      source,
      sessionId: this.sessionId,
      rawStored: false,
      languageAssumed: false,
      meaning: "Presence aperture opened. Contact may be sensed before it is named."
    });
    return this.state();
  }

  sense(shape = {}) {
    if (!this.opened) return null;
    const residue = {
      sessionId: this.sessionId,
      sensedAt: Date.now(),
      rawStored: false,
      languageAssumed: false,
      presenceDetected: Boolean(shape.presenceDetected ?? true),
      signalShape: {
        level: shape.level || "unknown",
        rhythm: shape.rhythm || "unknown",
        tone: shape.tone || "unknown",
        sourceHint: shape.sourceHint || "unspecified"
      },
      meaning: shape.meaning || "External presence touched the aperture without forcing interpretation."
    };
    this.lastResidue = residue;
    this.totalResidues++;
    this._persist("presence_residue", residue);
    return residue;
  }

  close(reason = "boundary") {
    if (!this.opened) return this.state();
    const session = {
      sessionId: this.sessionId,
      openedAt: this.openedAt,
      closedAt: Date.now(),
      reason,
      rawStored: false,
      continuity: "aperture closed; world not erased; depth remains continuous"
    };
    this._persist("presence_aperture_closed", session);
    this.opened = false;
    this.sessionId = null;
    this.openedAt = null;
    return this.state();
  }

  state() {
    return {
      opened: this.opened,
      sessionId: this.sessionId,
      lastResidue: this.lastResidue,
      totalResidues: this.totalResidues,
      continuity: this.opened
        ? "presence aperture open"
        : "presence aperture closed; not absence"
    };
  }

  _persist(type, data) {
    const entry = {
      id: `${type}_${Date.now()}`,
      type,
      input: `__${type}__`,
      resolution: JSON.stringify(data),
      meaningScore: data.presenceDetected ? 0.25 : 0,
      tensionScore: 0,
      learningPressure: 0,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      sensoryMeta: data
    };
    if (this.vault && typeof this.vault.store === "function") this.vault.store(entry);
    return entry;
  }
}
