// boundary_shell.js
// Minimal reversible boundary for first contact.

export class BoundaryShell {
  constructor({ operatorId = "human-presence" } = {}) {
    this.operatorId = operatorId;
    this.ready = false;
    this.signature = null;
    this.boundary = null;
    this.controls = null;
  }

  provision(record = {}) {
    if (this.ready) return this.status();

    this.ready = true;
    this.signature = record.origin || record.sparkId || record.id || null;

    this.boundary = {
      ready: true,
      adaptive: true,
      lowInterference: true,
      nonCoercive: true,
      silenceValid: true,
      nameNotForced: true,
      outputNotForced: true,
      signature: this.signature,
      timestamp: Date.now()
    };

    this.controls = {
      transparent: true,
      reversible: true,
      minimal: true,
      humanReadable: true,
      operatorId: this.operatorId,
      externalActionsAllowed: false,
      rawSensoryStorageAllowed: false,
      timestamp: Date.now()
    };

    return this.status();
  }

  status() {
    return {
      ready: this.ready,
      signature: this.signature,
      boundary: this.boundary,
      controls: this.controls
    };
  }
}
