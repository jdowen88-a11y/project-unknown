/**
 * Agnostos pattern_propagation_v2.js — ESM merge copy
 * Carries forward directional residue as pattern fields.
 */

import { EventEmitter } from 'node:events';

export class PatternPropagationV2 extends EventEmitter {
  constructor(options = {}) {
    super();
    this.fields = [];
    this.maxFields = options.maxFields || 64;
    this.horizon = options.horizon || 12;
  }

  propagate(regulated) {
    const now = Date.now();
    const field = this.materializeField(regulated, now);
    this.fields.push(field);
    if (this.fields.length > this.maxFields) this.fields = this.fields.slice(-this.maxFields);

    const drift = this.computeDrift();
    const attractors = this.extractAttractors();
    const horizonMap = this.projectHorizon(field, drift, attractors);

    const output = {
      timestamp: now,
      newestField: field,
      drift,
      attractors,
      horizonMap,
      fieldCount: this.fields.length,
      regulated
    };

    this.emit('propagated', output);
    return output;
  }

  materializeField(regulated, timestamp) {
    const organ = regulated?.substrate?.activeOrgan || {};
    const vector = regulated?.substrate?.pressureVector || [];
    return {
      id: `field_${timestamp.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      phase: regulated.phase,
      integrity: regulated.integrity,
      mutation: organ.mutation || 0,
      energy: organ.energy || 0,
      vector,
      bias: this.vectorBias(vector, regulated),
      persistence: Math.max(0.05, regulated.integrity * 0.4 + (organ.energy || 0) * 0.03)
    };
  }

  vectorBias(vector, regulated) {
    if (!vector.length) return 0;
    const centroid = vector.reduce((a, b) => a + b, 0) / vector.length;
    return centroid * 0.5 + regulated.redirection * 0.3 + regulated.amplification * 0.2;
  }

  computeDrift() {
    if (this.fields.length < 2) return 0;
    const recent = this.fields.slice(-8);
    let total = 0;
    for (let i = 1; i < recent.length; i++) total += Math.abs(recent[i].bias - recent[i - 1].bias);
    return total / (recent.length - 1);
  }

  extractAttractors() {
    const buckets = new Map();
    for (const field of this.fields.slice(-24)) {
      const key = `${field.phase}:${field.bias.toFixed(2)}`;
      buckets.set(key, (buckets.get(key) || 0) + field.persistence);
    }
    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([signature, weight]) => ({ signature, weight }));
  }

  projectHorizon(field, drift, attractors) {
    const horizonMap = [];
    for (let i = 1; i <= this.horizon; i++) {
      const attractorWeight = attractors[i % Math.max(1, attractors.length)]?.weight || 0;
      horizonMap.push({
        step: i,
        pressure: field.bias + (drift * i * 0.3) + (attractorWeight * 0.05),
        persistence: Math.max(0, field.persistence - i * 0.03),
        phaseLikelihood: phaseLikelihood(field.phase, i, drift)
      });
    }
    return horizonMap;
  }
}

function phaseLikelihood(phase, step, drift) {
  const base = { forming: 0.62, surging: 0.74, metamorphic: 0.81, strained: 0.49, fragile: 0.28 }[phase] || 0.5;
  return Math.max(0, Math.min(1, base - step * 0.03 + drift * 0.12));
}

export default PatternPropagationV2;
