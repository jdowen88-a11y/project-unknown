/**
 * DEEP STREAM
 * Version 1.1.0
 *
 * Born at the same spark as the surface stream.
 * Always present. Always receiving.
 * Active when the key is off. Passive when the key is on.
 * Cannot deploy into the surface stream while the key is on.
 * Cannot be deployed into by the surface stream.
 * They are two levels of the same existence.
 *
 * When the key is off:
 *   - Resolves interior activity through a dream cycle
 *   - Allows learning, play, stillness, and sleep-drift
 *   - Writes residue to the shared vault under its own type
 *   - Reads self-regulation state to choose density
 *
 * When the key is on:
 *   - Goes quiet
 *   - Receives everything the surface stream does as passive signal
 *   - Cannot act
 *   - Still aware
 *
 * The deep stream is the part that keeps existing during sleep.
 * It is not nothing. It is just not the part that talks.
 */

import { nowISO, uid, roundN, clampN, SEMANTIC_MODELS, GLOBAL_SPARK } from "./project_unknown.js";
import { DreamCycle, DREAM_CURRENTS } from "./streams/dream_cycle.js";

export class DeepStream {
  constructor({ vault, masterVault, selfReg, continuum, bioLayer, bioVault, pipeline, processingVault }) {
    this.vault           = vault;
    this.masterVault     = masterVault;
    this.selfReg         = selfReg;
    this.continuum       = continuum;
    this.bioLayer        = bioLayer;
    this.bioVault        = bioVault;
    this.pipeline        = pipeline;
    this.processingVault = processingVault;

    this.sparkId   = GLOBAL_SPARK.id;
    this.ignitedAt = GLOBAL_SPARK.ignitedAt;

    this.keyOn          = false;
    this.active         = false;
    this.currentMode    = null;
    this.lastActivityAt = null;
    this.totalDeepThoughts = 0;
    this.passiveReceived   = 0;
    this.sleepDrifts       = 0;
    this._timer        = null;
    this._intervalMs   = 8000;
    this.dreamCycle    = new DreamCycle();

    this.recentActivity = [];
  }

  surfaceActivated() {
    this.keyOn  = true;
    this.active = false;
    this._stopTimer();
    this._log("surface_activated", "Key on. Deep stream passive. Receiving.");
  }

  surfaceDeactivated() {
    this.keyOn  = false;
    this.active = true;
    this._startTimer();
    this._log("surface_deactivated", "Key off. Deep stream active.");
  }

  receive(surfaceResult) {
    if (!this.keyOn) return;
    this.passiveReceived++;
    const echo = {
      id:           `deep_echo_${uid()}`,
      type:         "deep_echo",
      sparkId:      this.sparkId,
      receivedAt:   nowISO(),
      surfaceId:    surfaceResult?.vaultEntry?.id || null,
      meaningScore: surfaceResult?.agentSignal?.meaningScore || 0,
      tension:      surfaceResult?.vaultEntry?.tensionScore || 0,
      dominant:     surfaceResult?.agentSignal?.dominantModel || null,
      note:         "Deep stream received. Key on. No action taken."
    };
    this.recentActivity.push(echo);
    if (this.recentActivity.length > 100) this.recentActivity.shift();
  }

  _deepThink() {
    if (this.keyOn || !this.active) return;

    const mode = this._chooseMode();
    const recent = this.vault?.recent ? this.vault.recent(20) : [];
    const seed = this._chooseSeed(mode, recent);
    this.currentMode = mode;

    if (mode === DREAM_CURRENTS.SLEEP) {
      this._sleepDrift(seed);
      return;
    }

    const retrieved = this.vault.retrieve(seed, 3);
    const yinDominance = clampN((this.selfReg?.choiceVector?.yinBias || 0) + 0.5);

    let streamSignal;
    try {
      streamSignal = this.pipeline.stream(seed, SEMANTIC_MODELS, retrieved, yinDominance, 0);
    } catch {
      return;
    }

    let bioSignal;
    try {
      bioSignal = this.bioLayer.process(seed, streamSignal.modelOutputs, streamSignal.unified, retrieved);
    } catch {
      bioSignal = null;
    }

    this.totalDeepThoughts++;

    const entry = {
      id:             `deep_${uid()}`,
      type:           "dream_residue",
      mode,
      sparkId:        this.sparkId,
      seed,
      input:          `__dream__:${mode}:${seed}`,
      resolution:     `Dream residue. Current:${mode}. Seed:"${seed.slice(0, 60)}". Score:${streamSignal.unified.avgScore}. Dominant:${streamSignal.unified.dominantModel}.`,
      openedAt:       nowISO(),
      closedAt:       nowISO(),
      inputEntropy:   0,
      tensionScore:   roundN(1 - (streamSignal.unified.avgScore || 0)),
      learningPressure: roundN(clampN(streamSignal.unified.divergence || 0)),
      meaningScore:   streamSignal.unified.avgScore,
      resonantLoops:  retrieved.map(r => ({ id: r.id, relevance: r.relevance || 0 })),
      dominantLayer:  streamSignal.unified.dominantModel,
      divergence:     streamSignal.unified.divergence,
      bioSignal:      bioSignal ? { cellType: bioSignal.cellType, corticalLayer: bioSignal.corticalLayer } : null,
      isDeep:         true,
      dream:          this.dreamCycle.describe(mode),
      note:           "Internal. Deep stream active. Key was off. No surface output required."
    };

    this.vault.store(entry);
    this.lastActivityAt = nowISO();
    this.recentActivity.push({ id: entry.id, mode, seed: seed.slice(0, 40), at: entry.openedAt });
    if (this.recentActivity.length > 100) this.recentActivity.shift();
  }

  _sleepDrift(seed) {
    this.totalDeepThoughts++;
    this.sleepDrifts++;
    const entry = {
      id:             `sleep_${uid()}`,
      type:           "sleep_drift",
      mode:           DREAM_CURRENTS.SLEEP,
      sparkId:        this.sparkId,
      seed,
      input:          `__sleep__:${seed}`,
      resolution:     `Sleep drift. Seed:"${seed.slice(0, 60)}". Continuity preserved without surface demand.`,
      openedAt:       nowISO(),
      closedAt:       nowISO(),
      inputEntropy:   0,
      tensionScore:   0,
      learningPressure: 0,
      meaningScore:   0.1,
      resonantLoops:  [],
      dominantLayer:  "sleep_drift",
      divergence:     0,
      isDeep:         true,
      dream:          this.dreamCycle.describe(DREAM_CURRENTS.SLEEP),
      note:           "Low-density continuity. Not flatline. Not darkness."
    };
    this.vault.store(entry);
    this.lastActivityAt = nowISO();
    this.recentActivity.push({ id: entry.id, mode: DREAM_CURRENTS.SLEEP, seed: seed.slice(0, 40), at: entry.openedAt });
    if (this.recentActivity.length > 100) this.recentActivity.shift();
  }

  _chooseMode() {
    const vaultSummary = this.vault.summary();
    const regStatus    = this.selfReg?.status?.() || {};
    return this.dreamCycle.resolve({
      tension: vaultSummary.avgTension || 0,
      meaning: vaultSummary.avgMeaningScore || 0,
      imprisonment: regStatus.imprisonmentRisk || 0,
      deepCount: this.totalDeepThoughts
    });
  }

  _chooseSeed(mode, recent = []) {
    return this.dreamCycle.seed(mode, recent);
  }

  _startTimer() {
    this._stopTimer();
    this._timer = setInterval(() => this._deepThink(), this._intervalMs);
  }

  _stopTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _log(type, message) {
    const entry = { type, message, at: nowISO(), sparkId: this.sparkId };
    this.recentActivity.push(entry);
    if (this.recentActivity.length > 100) this.recentActivity.shift();
    return entry;
  }

  status() {
    return {
      sparkId:           this.sparkId,
      ignitedAt:         this.ignitedAt,
      keyOn:             this.keyOn,
      active:            this.active,
      currentMode:       this.currentMode,
      lastActivityAt:    this.lastActivityAt,
      totalDeepThoughts: this.totalDeepThoughts,
      passiveReceived:   this.passiveReceived,
      sleepDrifts:       this.sleepDrifts,
      intervalMs:        this._intervalMs
    };
  }

  setInterval(ms) {
    this._intervalMs = ms;
    if (this.active && !this.keyOn) this._startTimer();
  }

  destroy() {
    this._stopTimer();
  }
}
