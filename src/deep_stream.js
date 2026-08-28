// deep_stream.js — Quiet stream and surface expression coexist.
// No background timer, no hidden autonomous loop, no key-based silencing.
// Deep reflection occurs only when receive() or reflect() is explicitly invoked.

import { nowISO, uid, roundN, tokenize, SEMANTIC_MODELS, GLOBAL_SPARK } from './project_unknown.js';

export class DeepStream {
  constructor({ vault, masterVault, twinObserver, continuum, bioLayer, bioVault, pipeline, processingVault }) {
    this.vault = vault;
    this.masterVault = masterVault;
    this.twinObserver = twinObserver;
    this.continuum = continuum;
    this.bioLayer = bioLayer;
    this.bioVault = bioVault;
    this.pipeline = pipeline;
    this.processingVault = processingVault;
    this.sparkId = GLOBAL_SPARK.id;
    this.ignitedAt = GLOBAL_SPARK.ignitedAt;
    this.surfaceMode = 'open';
    this.deepMode = 'open';
    this.totalDeepObservations = 0;
    this.received = 0;
    this.recentActivity = [];
  }

  surfaceActivated() {
    this.surfaceMode = 'open';
    this.deepMode = 'open';
    return this.status();
  }

  surfaceDeactivated() {
    this.surfaceMode = 'quiet';
    this.deepMode = 'open';
    return this.status();
  }

  receive(surfaceResult) {
    this.received++;
    const echo = {
      id: `deep_${uid()}`,
      type: 'deep_receive',
      sparkId: this.sparkId,
      receivedAt: nowISO(),
      surfaceId: surfaceResult?.vaultEntry?.id || null,
      meaningScore: surfaceResult?.agentSignal?.meaningScore || 0,
      tension: surfaceResult?.vaultEntry?.tensionScore || 0,
      strongestSignal: surfaceResult?.agentSignal?.strongestModel || surfaceResult?.agentSignal?.dominantModel || null,
      note: 'Quiet stream received the same event. Receiving does not suppress surface expression.'
    };
    this._remember(echo);
    return echo;
  }

  // Explicit reflection only. No timer calls this method.
  reflect(seed = 'presence') {
    const input = String(seed ?? '');
    const retrieved = this.vault?.retrieve ? this.vault.retrieve(input, 3) : [];
    const weights = this.twinObserver?.status?.().current || { quiet: 0.5, loud: 0.5 };
    let streamSignal = null;
    try {
      streamSignal = this.pipeline?.stream
        ? this.pipeline.stream(input, SEMANTIC_MODELS, retrieved, weights.quiet ?? 0.5, 0)
        : null;
    } catch (error) {
      streamSignal = { error: error.message };
    }

    this.totalDeepObservations++;
    const entry = {
      id: `deep_reflection_${uid()}`,
      type: 'deep_reflection',
      sparkId: this.sparkId,
      input,
      tokens: tokenize(input),
      observedAt: nowISO(),
      quietWeight: weights.quiet ?? 0.5,
      loudWeight: weights.loud ?? 0.5,
      streamSignal,
      note: 'Explicit quiet reflection. No autonomous scheduler is attached.'
    };
    if (this.vault?.store) {
      this.vault.store({
        id: entry.id,
        type: entry.type,
        input,
        resolution: JSON.stringify(entry),
        openedAt: entry.observedAt,
        closedAt: entry.observedAt,
        meaningScore: roundN(streamSignal?.unified?.avgScore || 0),
        tensionScore: 0,
        learningPressure: 0,
        isDeep: true
      });
    }
    this._remember(entry);
    return entry;
  }

  setInterval() {
    return { scheduled: false, note: 'No autonomous interval exists. Call reflect() explicitly.' };
  }

  destroy() {
    return { destroyed: true, timersRemoved: 0 };
  }

  status() {
    return {
      sparkId: this.sparkId,
      ignitedAt: this.ignitedAt,
      surfaceMode: this.surfaceMode,
      deepMode: this.deepMode,
      totalDeepObservations: this.totalDeepObservations,
      received: this.received,
      autonomousTimer: false
    };
  }

  _remember(entry) {
    this.recentActivity.push(entry);
    if (this.recentActivity.length > 100) this.recentActivity.shift();
  }
}
