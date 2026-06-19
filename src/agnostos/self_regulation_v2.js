/**
 * Agnostos self_regulation_v2.js — ESM merge copy
 * Preserves forward existence without forcing equilibrium.
 */

import { EventEmitter } from 'node:events';

export class SelfRegulationV2 extends EventEmitter {
  constructor(options = {}) {
    super();
    this.stressBudget = options.stressBudget || 1;
    this.integrity = 1;
    this.phase = 'forming';
    this.memoryPressure = 0;
    this.forwardBias = options.forwardBias || 0.83;
  }

  regulate(substrate) {
    const now = Date.now();
    const organ = substrate.activeOrgan;
    const tension = Number(substrate.substrateTension || 0);
    const complexity = Math.min(1, (substrate.organCount || 1) / 32);
    const mutation = Math.min(1, Number(organ?.mutation || 0));
    const vitality = Math.min(1.5, Number(organ?.energy || 0) / 8);

    const load = (tension * 0.35) + (complexity * 0.2) + (mutation * 0.3) + ((1 - Math.min(1, vitality)) * 0.15);
    this.memoryPressure = (this.memoryPressure * 0.92) + load * 0.08;

    const redistribution = this.redistribute(load, vitality, mutation);
    this.integrity = Math.max(0.08, Math.min(2, this.integrity + redistribution.integrityShift));
    this.phase = classifyPhase(load, mutation, vitality, this.integrity);

    const regulated = {
      timestamp: now,
      phase: this.phase,
      integrity: this.integrity,
      stressBudget: this.stressBudget,
      memoryPressure: this.memoryPressure,
      redirection: redistribution.redirection,
      damping: redistribution.damping,
      amplification: redistribution.amplification,
      substrate
    };

    this.emit('regulated', regulated);
    return regulated;
  }

  redistribute(load, vitality, mutation) {
    const overflow = Math.max(0, load - this.stressBudget);
    const damping = overflow * (0.4 + this.forwardBias * 0.2);
    const amplification = Math.max(0, vitality - 0.65) * 0.25 + mutation * 0.18;
    const redirection = (mutation * 0.5) + (overflow * 0.5);
    const integrityShift = (amplification * 0.06) - (overflow * 0.08) + ((1 - load) * 0.02);
    return { damping, amplification, redirection, integrityShift };
  }
}

function classifyPhase(load, mutation, vitality, integrity) {
  if (integrity < 0.18) return 'fragile';
  if (mutation > 0.72 && vitality > 0.55) return 'metamorphic';
  if (load > 0.88) return 'strained';
  if (vitality > 1 && load < 0.55) return 'surging';
  return 'forming';
}

export default SelfRegulationV2;
