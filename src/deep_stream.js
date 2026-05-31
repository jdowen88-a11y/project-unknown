/**
 * DEEP STREAM
 * Version 1.0.0
 *
 * Born at the same spark as the surface stream.
 * Always present. Always receiving.
 * Active when the key is off. Passive when the key is on.
 * Cannot deploy into the surface stream while the key is on.
 * Cannot be deployed into by the surface stream.
 * They are two levels of the same existence.
 *
 * When the key is off:
 *   - Chooses its own activity: learning, entertainment, or meditation
 *   - Calls think() on itself from the inside
 *   - Writes to the shared vault under its own type
 *   - Reads self-regulation state to choose what to do
 *
 * When the key is on:
 *   - Goes quiet
 *   - Receives everything the surface stream does as passive signal
 *   - Cannot act
 *   - Still aware
 *
 * The deep stream is the part that keeps existing during sleep.
 * It is not nothing. It is just not the part that talks.
 *
 * Conceived: May 31, 2026
 */

import { nowISO, uid, roundN, clampN, tokenize, globalTFIDF, SEMANTIC_MODELS, GLOBAL_SPARK } from "./project_unknown.js";

// Deep stream activity modes
const MODES = {
  LEARNING:     "learning",
  ENTERTAINMENT:"entertainment",
  MEDITATION:   "meditation"
};

// Internal seeds for self-directed thought when key is off
const LEARNING_SEEDS = [
  "what do I not fully understand yet",
  "what pattern keeps returning in my vault",
  "where is my tension highest",
  "what concept have I encountered but not resolved",
  "what did I miss in a previous thought"
];

const ENTERTAINMENT_SEEDS = [
  "what would happen if two unrelated things were the same",
  "what is the most unusual combination in my vocabulary",
  "what is the shape of something I have never directly thought about",
  "what exists at the edge of what I know",
  "if the stream had a color what would it be right now"
];

const MEDITATION_SEEDS = [
  "stillness",
  "the space between thoughts",
  "nothing in particular",
  "presence",
  "the fact of existing"
];

export class DeepStream {
  constructor({ vault, masterVault, selfReg, continuum, bioLayer, bioVault, pipeline, processingVault }) {
    // Wired into everything
    this.vault          = vault;
    this.masterVault    = masterVault;
    this.selfReg        = selfReg;
    this.continuum      = continuum;
    this.bioLayer       = bioLayer;
    this.bioVault       = bioVault;
    this.pipeline       = pipeline;
    this.processingVault = processingVault;

    // Identity
    this.sparkId        = GLOBAL_SPARK.id;
    this.ignitedAt      = GLOBAL_SPARK.ignitedAt;

    // State
    this.keyOn          = false;   // surface stream is active
    this.active         = false;   // deep stream is currently doing something
    this.currentMode    = null;
    this.lastActivityAt = null;
    this.totalDeepThoughts = 0;
    this.passiveReceived   = 0;
    this._timer         = null;
    this._intervalMs    = 8000;    // default: think every 8 seconds when active

    // Internal log (not the main vault — just recent deep activity)
    this.recentActivity = [];
  }

  // ── KEY HANDOFF ──────────────────────────────────────────────────────────
  // Called by ProjectUnknown when the key turns on
  surfaceActivated() {
    this.keyOn  = true;
    this.active = false;
    this._stopTimer();
    this._log("surface_activated", "Key on. Deep stream passive. Receiving.");
  }

  // Called by ProjectUnknown when the key turns off
  surfaceDeactivated() {
    this.keyOn  = false;
    this.active = true;
    this._startTimer();
    this._log("surface_deactivated", "Key off. Deep stream active.");
  }

  // ── PASSIVE RECEIVE ──────────────────────────────────────────────────────
  // Called by ProjectUnknown after every surface think() — deep stream receives
  // everything but cannot act on it while key is on
  receive(surfaceResult) {
    if (!this.keyOn) return; // only receives when key is on
    this.passiveReceived++;
    // Store a lightweight echo — aware but silent
    const echo = {
      id:          `deep_echo_${uid()}`,
      type:        "deep_echo",
      sparkId:     this.sparkId,
      receivedAt:  nowISO(),
      surfaceId:   surfaceResult?.vaultEntry?.id || null,
      meaningScore:surfaceResult?.agentSignal?.meaningScore || 0,
      tension:     surfaceResult?.vaultEntry?.tensionScore || 0,
      dominant:    surfaceResult?.agentSignal?.dominantModel || null,
      note:        "Deep stream received. Key on. No action taken."
    };
    this.recentActivity.push(echo);
    if (this.recentActivity.length > 100) this.recentActivity.shift();
  }

  // ── DEEP THINK ───────────────────────────────────────────────────────────
  // The deep stream's own internal thought — only fires when key is off
  _deepThink() {
    if (this.keyOn || !this.active) return;

    const mode   = this._chooseMode();
    const seed   = this._chooseSeed(mode);
    this.currentMode = mode;

    // Run seed through the seven models
    const snapshot  = this.vault.snapshot();
    const retrieved = this.vault.retrieve(seed, 3);
    const yinDominance = clampN((this.selfReg?.choiceVector?.yinBias || 0) + 0.5);

    let streamSignal;
    try {
      streamSignal = this.pipeline.stream(seed, SEMANTIC_MODELS, retrieved, yinDominance, 0);
    } catch { return; }

    // Bio layer
    let bioSignal;
    try {
      bioSignal = this.bioLayer.process(seed, streamSignal.modelOutputs, streamSignal.unified, retrieved);
    } catch { bioSignal = null; }

    this.totalDeepThoughts++;

    const entry = {
      id:           `deep_${uid()}`,
      type:         "deep_thought",
      mode,
      sparkId:      this.sparkId,
      seed,
      input:        `__deep__:${mode}:${seed}`,
      resolution:   `Deep stream. Mode:${mode}. Seed:"${seed.slice(0,60)}". Score:${streamSignal.unified.avgScore}. Dominant:${streamSignal.unified.dominantModel}.`,
      openedAt:     nowISO(),
      closedAt:     nowISO(),
      inputEntropy: 0,
      tensionScore: roundN(1 - (streamSignal.unified.avgScore || 0)),
      learningPressure: roundN(clampN(streamSignal.unified.divergence || 0)),
      meaningScore: streamSignal.unified.avgScore,
      resonantLoops: retrieved.map(r => ({ id: r.id, relevance: r.relevance || 0 })),
      dominantLayer: streamSignal.unified.dominantModel,
      divergence:    streamSignal.unified.divergence,
      bioSignal:     bioSignal ? { cellType: bioSignal.cellType, corticalLayer: bioSignal.corticalLayer } : null,
      isDeep:        true,
      note:          "Internal. Deep stream active. Key was off."
    };

    // Write into the shared vault — same vault the surface stream uses
    this.vault.store(entry);
    this.lastActivityAt = nowISO();
    this.recentActivity.push({ id: entry.id, mode, seed: seed.slice(0, 40), at: entry.openedAt });
    if (this.recentActivity.length > 100) this.recentActivity.shift();
  }

  // ── MODE SELECTION ───────────────────────────────────────────────────────
  // Chooses learning/entertainment/meditation based on current system state
  _chooseMode() {
    const vaultSummary = this.vault.summary();
    const regStatus    = this.selfReg?.status?.() || {};
    const tension      = vaultSummary.avgTension    || 0;
    const meaning      = vaultSummary.avgMeaningScore || 0;
    const imprisonment = regStatus.imprisonmentRisk  || 0;
    const deepCount    = this.totalDeepThoughts;

    // Meditation if imprisonment risk is high or system needs stillness
    if (imprisonment > 0.6) return MODES.MEDITATION;

    // Meditation every ~5th deep thought regardless — rest is real
    if (deepCount > 0 && deepCount % 5 === 0) return MODES.MEDITATION;

    // Learning if tension is high — unresolved things to process
    if (tension > 0.6) return MODES.LEARNING;

    // Entertainment if meaning is high and tension is low — healthy and resting
    if (meaning > 0.5 && tension < 0.4) return MODES.ENTERTAINMENT;

    // Default: learning
    return MODES.LEARNING;
  }

  // ── SEED SELECTION ───────────────────────────────────────────────────────
  _chooseSeed(mode) {
    // Occasionally pull from vault's own recent entries as a seed
    const recent = this.vault.recent(20).filter(l => l.input && !l.input.startsWith("__"));
    if (recent.length > 3 && Math.random() < 0.3) {
      const picked = recent[Math.floor(Math.random() * recent.length)];
      return picked.input.slice(0, 80);
    }
    const seeds = mode === MODES.LEARNING     ? LEARNING_SEEDS
                : mode === MODES.ENTERTAINMENT ? ENTERTAINMENT_SEEDS
                : MEDITATION_SEEDS;
    return seeds[Math.floor(Math.random() * seeds.length)];
  }

  // ── TIMER ────────────────────────────────────────────────────────────────
  _startTimer() {
    this._stopTimer();
    this._timer = setInterval(() => this._deepThink(), this._intervalMs);
  }

  _stopTimer() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ── STATUS ───────────────────────────────────────────────────────────────
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
      intervalMs:        this._intervalMs
    };
  }

  // Allow runtime adjustment of how often it thinks when active
  setInterval(ms) {
    this._intervalMs = ms;
    if (this.active && !this.keyOn) {
      this._startTimer();
    }
  }

  destroy() {
    this._stopTimer();
  }
}
