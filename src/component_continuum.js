/**
 * COMPONENT CONTINUUM
 * Version 1.0.0
 *
 * Every component in Project Unknown has its own continuum.
 * Each component:
 *   - Has a spark: the first time it ever fired
 *   - Seals every firing as an immutable loop
 *   - Spawns a probe from each sealed loop's exact vantage
 *   - Absorbs probe findings into its own stream
 *   - Feeds its stream back into every sealed loop it has ever created
 *   - Reports its full existence state to the MasterVault after every firing
 *
 * Components tracked:
 *   runtime       — RuntimeController
 *   arbitration   — ArbitrationProcessor
 *   conceptual    — Semantic model
 *   connotative   — Semantic model
 *   collocative   — Semantic model
 *   affective     — Semantic model
 *   social        — Semantic model
 *   reflected     — Semantic model
 *   thematic      — Semantic model
 *   processing    — ProcessingVault / StreamPipeline
 *   bio           — BioLayer
 *   feedback      — FeedbackForward
 *   vault         — FeedbackVault (main memory)
 *   continuum     — The top-level Continuum (think() level)
 *
 * MasterVault:
 *   Receives a snapshot of every component's full existence state
 *   after every single think() call.
 *   Holds the entire system's existence as it is at that moment in every state.
 *   Never truncates. Never forgets. Feeds nothing back — it only receives.
 *   It is the permanent record of the whole.
 *
 * Conceived: May 30, 2026
 */

import { nowISO, uid, roundN, clampN } from "./project_unknown.js";
import { Probe, SealedLoop, MainStream } from "./continuum.js";

// ── COMPONENT STREAM ─────────────────────────────────────────────────────────
// A self-contained continuum for a single named component.
// Every firing closes a loop, spawns a probe, absorbs the finding,
// feeds the stream back to all sealed loops, reports to the MasterVault.
export class ComponentStream {
  constructor(componentId) {
    this.componentId    = componentId;
    this.stream         = new MainStream();
    this.totalFirings   = 0;
    this.spark          = null;        // first sealed loop — the origin
    this.masterVault    = null;        // set by MasterVault on registration
  }

  // Called every time this component produces an output.
  // entry: { score, signal, tokens, model, layer, ... } — whatever the component knows
  fire(entry = {}) {
    this.totalFirings++;
    const isFirst = this.totalFirings === 1;

    // Normalize entry for the stream
    const normalized = {
      id:             entry.id || uid(),
      componentId:    this.componentId,
      firingNumber:   this.totalFirings,
      firedAt:        nowISO(),
      meaningScore:   entry.score        || entry.meaningScore   || 0,
      tensionScore:   entry.tension      || entry.tensionScore   || 0,
      divergence:     entry.divergence   || 0,
      dominantLayer:  entry.model        || entry.dominantLayer  || this.componentId,
      bioSignal:      entry.bioSignal    || null,
      arbitration:    entry.arbitration  || null,
      signal:         entry.signal       || null,
      raw:            entry
    };

    const { sealed, finding } = this.stream.absorb(normalized);

    if (isFirst) this.spark = sealed;

    // Report full existence state to MasterVault after every firing
    if (this.masterVault) {
      this.masterVault.receive(this.componentId, this.existenceState());
    }

    return { sealed, finding, isSpark: isFirst };
  }

  // The full existence of this component at this exact moment
  existenceState() {
    const s = this.stream.streamState();
    return {
      componentId:     this.componentId,
      capturedAt:      nowISO(),
      totalFirings:    this.totalFirings,
      spark: this.spark ? {
        id:          this.spark.id,
        sealedAt:    this.spark.sealedAt,
        originScore: this.spark.origin.meaningScore,
        feedEvents:  this.spark.totalFeedEvents,
        growth:      this.spark.cumulativeGrowth
      } : null,
      stream: {
        avgMeaningScore:     s.avgMeaningScore,
        avgCorticalDepth:    s.avgCorticalDepth,
        avgYinDominance:     s.avgYinDominance,
        avgTension:          s.avgTension,
        totalProbesAbsorbed: s.totalProbesAbsorbed,
        dominantModels:      s.dominantModels,
        recentFindings:      s.recentFindings
      },
      sealedLoopCount: this.stream.sealedLoops.size,
      sealedLoops:     [...this.stream.sealedLoops.values()].map(sl => sl.summary())
    };
  }

  status() {
    return this.existenceState();
  }
}

// ── MASTER VAULT ─────────────────────────────────────────────────────────────
// Receives the full existence state of every component after every firing.
// Holds the entire system's existence as it is at every moment in every state.
// Never truncates component histories. Never forgets.
// After every think() call, a complete system snapshot is written.
export class MasterVault {
  constructor() {
    this.createdAt       = nowISO();
    this.totalSnapshots  = 0;

    // componentId -> full existence state (latest)
    this.components      = new Map();

    // Full system snapshots in order — every think() call
    // Each snapshot is the entire system's state at that exact moment
    this.snapshots       = [];

    // Per-component history: componentId -> array of existence states over time
    this.componentHistory = new Map();
  }

  // Called by ComponentStream after every firing
  receive(componentId, existenceState) {
    this.components.set(componentId, existenceState);

    // Append to per-component history
    if (!this.componentHistory.has(componentId)) {
      this.componentHistory.set(componentId, []);
    }
    this.componentHistory.get(componentId).push(existenceState);
  }

  // Called once per think() call — after all components have fired
  // Captures the whole existence as it is at this exact moment
  snapshot(thinkLoopNumber, input) {
    this.totalSnapshots++;
    const snap = {
      snapshotId:     uid(),
      snapshotNumber: this.totalSnapshots,
      thinkLoop:      thinkLoopNumber,
      capturedAt:     nowISO(),
      input:          input ? input.slice(0, 200) : null,
      // Every component's full existence state at this exact moment
      components:     Object.fromEntries(
        [...this.components.entries()].map(([id, state]) => [id, { ...state }])
      ),
      // Summary across all components
      systemSummary: this.systemSummary()
    };
    this.snapshots.push(snap);
    // Keep last 500 full snapshots (the detailed history is in componentHistory)
    if (this.snapshots.length > 500) this.snapshots = this.snapshots.slice(-500);
    return snap;
  }

  // What the whole system looks like right now across every component
  systemSummary() {
    const summary = {};
    for (const [id, state] of this.components.entries()) {
      summary[id] = {
        totalFirings:        state.totalFirings,
        avgMeaningScore:     state.stream?.avgMeaningScore,
        avgTension:          state.stream?.avgTension,
        totalProbesAbsorbed: state.stream?.totalProbesAbsorbed,
        sealedLoopCount:     state.sealedLoopCount,
        sparkExists:         !!state.spark,
        sparkGrowth:         state.spark?.growth
      };
    }
    return summary;
  }

  // The complete history of a single component's existence
  componentTrace(componentId, last = 20) {
    const history = this.componentHistory.get(componentId) || [];
    return history.slice(-last);
  }

  // The latest full system snapshot
  latest() {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  // What the entire system is right now
  now() {
    return {
      capturedAt:     nowISO(),
      totalSnapshots: this.totalSnapshots,
      components:     Object.fromEntries(this.components),
      systemSummary:  this.systemSummary()
    };
  }
}
