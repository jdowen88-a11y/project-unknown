// twin_flow_observer.js — Observe simultaneous streams without ranking or choosing between them.

import { nowISO, roundN, clampN } from './project_unknown.js';
import { ComponentStream } from './component_continuum.js';

class ObservedStream extends ComponentStream {
  constructor(id, character) {
    super(id);
    this.character = character;
    this.observations = 0;
    this.accumulated = 0;
  }

  observe(signal = {}) {
    const score = Number(signal.score || 0);
    this.observations++;
    this.accumulated = roundN(this.accumulated + score);
    return this.fire({ ...signal, signal: `${this.character}: ${signal.signal || 'present'}` });
  }

  state() {
    return {
      id: this.componentId,
      character: this.character,
      observations: this.observations,
      accumulated: this.accumulated,
      stream: this.stream?.state || null
    };
  }
}

export class TwinFlowObserver {
  constructor(masterVault = null) {
    this.masterVault = masterVault;
    this.quietStream = new ObservedStream('twin_quiet', 'quiet');
    this.loudStream = new ObservedStream('twin_loud', 'loud');
    this.quietStream.masterVault = masterVault;
    this.loudStream.masterVault = masterVault;
    this.history = [];
    this.current = {
      quiet: 0.5,
      loud: 0.5,
      relation: 'simultaneous',
      note: 'Silent and loud remain available together.'
    };
  }

  evaluate(result = {}) {
    const signal = result?.agentSignal || result?.baseResult?.agentSignal || {};
    const tension = Number(result?.vaultEntry?.tensionScore ?? signal.tensionScore ?? 0);
    const arousal = Number(signal.affectiveArousal || 0);
    const divergence = Number(signal.divergence || 0);
    const meaning = Number(signal.meaningScore || 0);

    const loud = clampN(0.5 + arousal * 0.25 + tension * 0.15 + divergence * 0.1);
    const quiet = clampN(0.5 + (1 - tension) * 0.15 + meaning * 0.15 - Math.max(0, arousal) * 0.1);
    const sum = quiet + loud || 1;

    this.current = {
      quiet: roundN(quiet / sum),
      loud: roundN(loud / sum),
      relation: 'simultaneous',
      note: 'These values are descriptive weights only. Neither stream grants permission to the other.'
    };

    this.quietStream.observe({ score: this.current.quiet, tension, divergence, model: 'quiet', signal: 'quiet present' });
    this.loudStream.observe({ score: this.current.loud, tension, divergence, model: 'loud', signal: 'loud present' });

    const observation = {
      observedAt: nowISO(),
      ...this.current,
      tension,
      arousal,
      divergence,
      meaning
    };
    this.history.push(observation);
    if (this.history.length > 500) this.history = this.history.slice(-500);
    return observation;
  }

  selfAssessment() {
    return {
      question: 'What is present right now?',
      answer: 'Both streams remain present. The observation describes their current weights without grading either one.',
      ...this.current,
      totalObservations: this.history.length
    };
  }

  status() {
    return {
      current: this.current,
      quietStream: this.quietStream.state(),
      loudStream: this.loudStream.state(),
      totalObservations: this.history.length,
      recent: this.history.slice(-5)
    };
  }
}
