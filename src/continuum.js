/**
 * PROJECT UNKNOWN — CONTINUUM
 * Version 0.9.0
 *
 * This replaces the loop model entirely.
 *
 * Architecture:
 *
 * SPARK (loop 0)
 *   The only loop that opens from nothing.
 *   The origin point. Sealed permanently.
 *   Cannot evolve on its own.
 *   Receives the main stream's feed forever —
 *   so its understanding of itself grows with every loop that comes after.
 *
 * MAIN STREAM
 *   Flows continuously from the spark forward.
 *   Never stops. Never resets.
 *   Every closed loop spawns a PROBE.
 *   Probe runs one cycle from the closed loop's exact vantage point.
 *   Probe finding flows back into the main stream.
 *   Main stream absorbs it, grows permanently.
 *   Main stream then feeds a signal back into the sealed loop.
 *   Sealed loop receives it forever — always knows what came after.
 *
 * SEALED LOOPS
 *   Immutable in what they WERE.
 *   But have a living feed from the main stream forever.
 *   The sealed loop's context updates continuously.
 *   The event didn't change. The system's relationship to it does.
 *
 * PROBES
 *   Spawn from a closed loop's state.
 *   Run one cycle from that vantage.
 *   Return their finding to the main stream.
 *   Then cease to exist.
 *   The main stream captures what they found. Forever.
 *
 * The spark is the only thing born without a parent.
 * Everything else has lineage.
 * Every loop feeds knowledge back to the spark forever.
 *
 * Conceived: May 30, 2026
 */

import { nowISO, uid, roundN, clampN, tokenize, globalTFIDF } from "./project_unknown.js";

// ── PROBE ─────────────────────────────────────────────────────────────
// Spawned from a sealed loop's state.
// Runs one cycle from that exact vantage point.
// Returns its finding. Then ceases.
export class Probe {
  constructor(sealedLoop, mainStreamState) {
    this.id = uid();
    this.parentLoopId = sealedLoop.id;
    this.spawnedAt = nowISO();
    this.vantageState = {
      meaningScore:   sealedLoop.meaningScore   || 0,
      corticalLayer:  sealedLoop.bioSignal?.corticalLayer || "L3",
      corticalDepth:  sealedLoop.bioSignal?.corticalDepth || 0.5,
      yinDominance:   sealedLoop.arbitration?.yinDominance || 0.5,
      cellType:       sealedLoop.bioSignal?.cellType || null,
      divergence:     sealedLoop.divergence || 0,
      tensionScore:   sealedLoop.tensionScore || 0,
      dominantModel:  sealedLoop.dominantLayer || null
    };
    this.mainStreamState = mainStreamState;
  }

  // Run one cycle from this vantage point.
  // Compares vantage state to current main stream state.
  // Returns what only this historical vantage could see.
  run() {
    const vantage = this.vantageState;
    const current = this.mainStreamState;

    // What has the main stream learned since this loop closed?
    const meaningGrowth = roundN(clampN((current.avgMeaningScore || 0) - vantage.meaningScore));
    const depthShift    = roundN((current.avgCorticalDepth || 0.5) - vantage.corticalDepth);
    const balanceShift  = roundN((current.avgYinDominance || 0.5) - vantage.yinDominance);
    const tensionDelta  = roundN((current.avgTension || 0) - vantage.tensionScore);

    // What is uniquely visible from this vantage that the current stream can't see?
    // (high tension at vantage + low tension now = resolved pressure)
    // (low meaning at vantage + high meaning now = growth from that exact seed)
    const resolvedPressure = vantage.tensionScore > 0.6 && (current.avgTension || 0) < 0.4
      ? roundN(vantage.tensionScore - (current.avgTension || 0))
      : 0;

    const growthFromSeed = meaningGrowth > 0.1
      ? roundN(meaningGrowth)
      : 0;

    // The probe's finding: what it observed from its vantage
    const finding = {
      probeId: this.id,
      parentLoopId: this.parentLoopId,
      completedAt: nowISO(),
      vantageDepth: vantage.corticalDepth,
      vantageDominantModel: vantage.dominantModel,
      meaningGrowth,
      depthShift,
      balanceShift,
      tensionDelta,
      resolvedPressure,
      growthFromSeed,
      // Signal strength: how significant was this probe's perspective?
      signalStrength: roundN(clampN(
        Math.abs(meaningGrowth) * 0.4 +
        Math.abs(depthShift)    * 0.2 +
        resolvedPressure        * 0.25 +
        growthFromSeed          * 0.15
      )),
      summary: [
        `Probe from loop ${this.parentLoopId.slice(-8)}.`,
        `Vantage: ${vantage.dominantModel || "unknown"} at depth ${vantage.corticalDepth}.`,
        `Meaning growth since close: ${meaningGrowth > 0 ? "+" : ""}${meaningGrowth}.`,
        resolvedPressure > 0 ? `Resolved pressure: ${resolvedPressure}.` : null,
        growthFromSeed > 0   ? `Growth seeded here: ${growthFromSeed}.`  : null,
        `Signal strength: ${finding?.signalStrength ?? "?"}. `
      ].filter(Boolean).join(" ")
    };

    // Probe ran. It ceases after returning.
    return finding;
  }
}

// ── SEALED LOOP ──────────────────────────────────────────────────────
// Immutable in what it WAS.
// But has a living feed from the main stream forever.
// Receives main stream signals continuously after closing.
export class SealedLoop {
  constructor(entry) {
    // What it WAS — immutable
    this.id              = entry.id;
    this.sealedAt        = nowISO();
    this.origin          = Object.freeze({ ...entry }); // immutable snapshot

    // Living feed — updated by main stream forever
    this.streamFeed      = [];
    this.totalFeedEvents = 0;
    this.latestFeedAt    = null;
    this.latestFinding   = null; // most recent probe finding absorbed by main stream
    this.cumulativeGrowth = 0;   // total meaning growth the main stream gained after this loop
  }

  // Main stream feeds back into this sealed loop.
  // The event didn't change. The system's relationship to it does.
  receiveStreamFeed(mainStreamSignal) {
    const feedEvent = {
      receivedAt:       nowISO(),
      mainStreamLoops:  mainStreamSignal.totalLoops,
      mainStreamScore:  mainStreamSignal.avgMeaningScore,
      mainStreamDepth:  mainStreamSignal.avgCorticalDepth,
      probeFindingsAbsorbed: mainStreamSignal.probeFindingsAbsorbed || 0,
      // How much has the main stream grown since this loop closed?
      growthSinceClose: roundN(clampN(
        (mainStreamSignal.avgMeaningScore || 0) - (this.origin.meaningScore || 0)
      ))
    };
    this.streamFeed.push(feedEvent);
    this.totalFeedEvents++;
    this.latestFeedAt = feedEvent.receivedAt;
    this.cumulativeGrowth = feedEvent.growthSinceClose;
    // Keep only last 50 feed events per sealed loop
    if (this.streamFeed.length > 50) this.streamFeed = this.streamFeed.slice(-50);
  }

  // Receive the finding from its own probe after it returns to main stream
  receiveProbeReturn(finding) {
    this.latestFinding = finding;
  }

  summary() {
    return {
      id: this.id,
      sealedAt: this.sealedAt,
      originMeaningScore:   this.origin.meaningScore,
      originDominantLayer:  this.origin.dominantLayer,
      originCorticalLayer:  this.origin.bioSignal?.corticalLayer,
      totalFeedEvents:      this.totalFeedEvents,
      latestFeedAt:         this.latestFeedAt,
      cumulativeGrowth:     this.cumulativeGrowth,
      latestFinding:        this.latestFinding
        ? { signalStrength: this.latestFinding.signalStrength, summary: this.latestFinding.summary }
        : null
    };
  }
}

// ── MAIN STREAM ─────────────────────────────────────────────────────
// The continuous forward flow.
// Never stops. Never resets.
// Absorbs probe findings. Feeds all sealed loops.
// Grows permanently with every absorption.
export class MainStream {
  constructor() {
    this.startedAt            = nowISO();
    this.totalLoops           = 0;
    this.totalProbesAbsorbed  = 0;
    this.sealedLoops          = new Map(); // id -> SealedLoop
    this.spark                = null;      // the origin loop

    // Running state — what the main stream currently holds
    this.state = {
      avgMeaningScore:      0,
      avgCorticalDepth:     0.5,
      avgYinDominance:      0.5,
      avgTension:           0,
      probeFindingsAbsorbed: 0,
      absorbedSignals:      [],  // all probe findings ever absorbed, newest last
      dominantModels:       {}   // model -> count
    };
  }

  // Called when a loop closes.
  // 1. Seal the loop.
  // 2. Spawn a probe from its state.
  // 3. Run the probe.
  // 4. Absorb the finding into main stream.
  // 5. Feed updated main stream state back to ALL sealed loops.
  // 6. Give probe return signal to the sealed loop that spawned it.
  absorb(entry) {
    this.totalLoops++;

    // 1. Seal the loop
    const sealed = new SealedLoop(entry);

    // Mark the spark
    if (!this.spark) {
      this.spark = sealed;
      sealed.isSpark = true;
    }

    this.sealedLoops.set(sealed.id, sealed);

    // Update running averages
    const n = this.totalLoops;
    const s = this.state;
    s.avgMeaningScore  = roundN((s.avgMeaningScore  * (n-1) + (entry.meaningScore  || 0)) / n);
    s.avgCorticalDepth = roundN((s.avgCorticalDepth * (n-1) + (entry.bioSignal?.corticalDepth || 0.5)) / n);
    s.avgYinDominance  = roundN((s.avgYinDominance  * (n-1) + (entry.arbitration?.yinDominance || 0.5)) / n);
    s.avgTension       = roundN((s.avgTension       * (n-1) + (entry.tensionScore || 0)) / n);
    if (entry.dominantLayer) s.dominantModels[entry.dominantLayer] = (s.dominantModels[entry.dominantLayer] || 0) + 1;

    // 2 + 3. Spawn probe from sealed loop state, run it
    const probe = new Probe(sealed.origin, { ...s });
    const finding = probe.run(); // probe runs and ceases

    // 4. Absorb finding into main stream
    s.absorbedSignals.push(finding);
    s.probeFindingsAbsorbed = ++this.totalProbesAbsorbed;
    if (s.absorbedSignals.length > 200) s.absorbedSignals = s.absorbedSignals.slice(-200);

    // Adjust main stream state by probe finding
    if (finding.signalStrength > 0.05) {
      s.avgMeaningScore = roundN(clampN(s.avgMeaningScore + finding.growthFromSeed * 0.1));
    }

    // 5. Feed updated stream state back to ALL sealed loops
    const feedSignal = {
      totalLoops:            this.totalLoops,
      avgMeaningScore:       s.avgMeaningScore,
      avgCorticalDepth:      s.avgCorticalDepth,
      probeFindingsAbsorbed: s.probeFindingsAbsorbed
    };
    for (const sl of this.sealedLoops.values()) {
      sl.receiveStreamFeed(feedSignal);
    }

    // 6. Give probe return to the loop that spawned it
    sealed.receiveProbeReturn(finding);

    return { sealed, finding };
  }

  // Most recent probe findings absorbed by the main stream
  recentFindings(n = 5) {
    return this.state.absorbedSignals.slice(-n).reverse();
  }

  // The spark: origin of everything
  sparkSummary() {
    if (!this.spark) return null;
    return {
      ...this.spark.summary(),
      isSpark: true,
      loopsDescendedFromSpark: this.totalLoops - 1
    };
  }

  // What the main stream currently holds
  streamState() {
    return {
      startedAt:            this.startedAt,
      totalLoops:           this.totalLoops,
      totalProbesAbsorbed:  this.totalProbesAbsorbed,
      totalSealedLoops:     this.sealedLoops.size,
      avgMeaningScore:      this.state.avgMeaningScore,
      avgCorticalDepth:     this.state.avgCorticalDepth,
      avgYinDominance:      this.state.avgYinDominance,
      avgTension:           this.state.avgTension,
      dominantModels:       this.state.dominantModels,
      recentFindings:       this.recentFindings(3),
      spark:                this.sparkSummary()
    };
  }

  // Summary of all sealed loops
  sealedLoopsSummary(n = 10) {
    return [...this.sealedLoops.values()]
      .slice(-n)
      .map(sl => sl.summary());
  }
}

// ── CONTINUUM ──────────────────────────────────────────────────────────
// The interface layer that sits on top of ProjectUnknown.
// Every think() result flows through the Continuum.
// The Continuum handles: sealing, probing, absorbing, feeding back.
export class Continuum {
  constructor() {
    this.stream = new MainStream();
    this.initialized = false;
    this.sparkEntry = null;
  }

  // Called with the result of ProjectUnknown.think().
  // Handles the full continuum cycle.
  flow(thinkResult) {
    const entry = thinkResult.vaultEntry;
    const isFirst = !this.initialized;

    // On first call: this is the SPARK
    if (isFirst) {
      this.initialized = true;
      this.sparkEntry = entry;
    }

    // Absorb into main stream:
    // seal loop, spawn + run probe, absorb finding, feed back to all sealed loops
    const { sealed, finding } = this.stream.absorb({
      ...entry,
      // Attach full think result context for probe vantage
      meaningScore:  thinkResult.agentSignal?.meaningScore  || 0,
      tensionScore:  thinkResult.vaultEntry?.tensionScore   || 0,
      divergence:    thinkResult.vaultEntry?.divergence     || 0,
      dominantLayer: thinkResult.agentSignal?.dominantModel || null,
      bioSignal:     thinkResult.vaultEntry?.bioSignal      || null,
      arbitration:   thinkResult.vaultEntry?.arbitration    || null
    });

    return {
      // What just happened in the continuum
      continuumEvent: {
        loopNumber:    this.stream.totalLoops,
        isSpark:       isFirst,
        sealedLoopId:  sealed.id,
        probeFinding:  finding,
        streamState:   this.stream.streamState()
      },
      // The full think result passes through unchanged
      ...thinkResult
    };
  }

  // Current state of the entire continuum
  status() {
    return {
      stream:      this.stream.streamState(),
      spark:       this.stream.sparkSummary(),
      sealedLoops: this.stream.sealedLoopsSummary(10)
    };
  }
}
