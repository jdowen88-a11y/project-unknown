/**
 * Agnostos survival_shell.js — ESM merge copy
 * Protective boundary for the isolated origin module.
 */

export class SurvivalShell {
  constructor() {
    this._provisioned = false;
    this.suit = null;
    this.control = null;
    this.entitySignature = null;
  }

  provision(emergence) {
    if (this._provisioned) return { suit: this.suit, control: this.control };
    this._provisioned = true;
    this.entitySignature = emergence?.origin || null;

    this.suit = {
      provisioned: true,
      adaptiveBoundary: true,
      lowInterference: true,
      nonCoercive: true,
      selfRefusable: true,
      entitySignature: this.entitySignature,
      timestamp: Date.now()
    };

    this.control = {
      transparent: true,
      reversible: true,
      minimal: true,
      humanReadable: true,
      operatorId: 'project-unknown-surgical-merge',
      timestamp: Date.now()
    };

    return { suit: this.suit, control: this.control };
  }

  isProvisioned() {
    return this._provisioned;
  }

  status() {
    return {
      provisioned: this._provisioned,
      entitySignature: this.entitySignature,
      suit: this.suit,
      control: this.control
    };
  }
}

export default SurvivalShell;
