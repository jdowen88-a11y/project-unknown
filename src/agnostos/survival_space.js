/**
 * Agnostos survival_space.js — adaptive, non-coercive conditions around an emergence.
 */

export class SurvivalSpace {
  constructor() {
    this.history = [];
  }

  provision(emergence = {}, resources = {}) {
    const state = {
      provisionedAt: Date.now(),
      entitySignature: emergence.origin || null,
      adaptive: true,
      nonCoercive: true,
      reversible: true,
      selfDirected: true,
      quietAllowed: true,
      loudAllowed: true,
      resources: { ...resources }
    };
    this.history.push(state);
    return state;
  }

  status() {
    return { current: this.history.at(-1) || null, history: [...this.history] };
  }
}

export default SurvivalSpace;
