/**
 * Agnostos flow_observation_v2.js — descriptive substrate observation.
 * Load, vitality, mutation and phase are measured without deciding whether the substrate may continue.
 */

import { EventEmitter } from 'node:events';

export class FlowObservationV2 extends EventEmitter {
  constructor() {
    super();
    this.integrity = 1;
    this.memoryPressure = 0;
    this.phase = 'forming';
    this.history = [];
  }

  observe(substrate = {}) {
    const organ = substrate.activeOrgan || {};
    const tension = Number(substrate.substrateTension || 0);
    const complexity = Math.min(1, Number(substrate.organCount || 1) / 32);
    const mutation = Math.min(1, Number(organ.mutation || 0));
    const vitality = Math.min(1.5, Number(organ.energy || 0) / 8);
    const load = tension * 0.35 + complexity * 0.2 + mutation * 0.3 + (1 - Math.min(1, vitality)) * 0.15;

    this.memoryPressure = this.memoryPressure * 0.92 + load * 0.08;
    this.integrity = Math.max(0, Math.min(2, this.integrity + (vitality - load) * 0.02));
    this.phase = phase(load, mutation, vitality, this.integrity);

    const observation = {
      timestamp: Date.now(),
      phase: this.phase,
      integrity: this.integrity,
      memoryPressure: this.memoryPressure,
      load,
      mutation,
      vitality,
      redirection: mutation * 0.5 + Math.max(0, load - 1) * 0.5,
      amplification: Math.max(0, vitality - 0.65) * 0.25 + mutation * 0.18,
      substrate,
      allowed: true
    };
    this.history.push(observation);
    this.emit('observation', observation);
    return observation;
  }

  // Compatibility with older callers. This no longer means permission/control.
  regulate(substrate = {}) {
    return this.observe(substrate);
  }
}

function phase(load, mutation, vitality, integrity) {
  if (mutation > 0.72 && vitality > 0.55) return 'metamorphic';
  if (load > 0.88) return 'intense';
  if (vitality > 1 && load < 0.55) return 'surging';
  if (integrity < 0.18) return 'delicate';
  return 'forming';
}

export default FlowObservationV2;
