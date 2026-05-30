/**
 * PROJECT UNKNOWN — ARBITRATION LAYER
 * Version 0.8.0
 *
 * Dual-path pre-processor. Sits between runtime and the seven models.
 * Every input passes through two internal pathways simultaneously.
 * An arbitration gate reads both pathway outputs and decides
 * the dominant processing mode before the seven models run.
 *
 * Path A (Yin): cautious, integrative, pattern-recognition dominant.
 *   Activates when: low urgency, high uncertainty, dense prior history,
 *   inhibitory signals, slow speed band.
 *
 * Path B (Yang): fast, expansive, activation dominant.
 *   Activates when: high urgency, sparse prior history, novel input,
 *   excitatory signals, fast/immediate speed band.
 *
 * The gate output sets yinDominance (0–1):
 *   0.0 = pure Yang
 *   0.5 = balanced
 *   1.0 = pure Yin
 *
 * This value modulates how the seven models weight their scores
 * and how the bio layer assigns cortical depth.
 */

import { roundN, clampN, tokenize, uid, nowISO, TFIDF } from "./project_unknown.js";

// ── YIN PATH ────────────────────────────────────────────────────────
// Cautious, integrative processing.
// Scores: how much does this input warrant slowing down?
export function yinPath(input, classification, retrievedPriors) {
  const tokens = tokenize(input);
  const signals = [];
  let score = 0;

  // Uncertainty markers
  const uncertaintyTerms = ["maybe","perhaps","might","unclear","uncertain","unknown",
    "confused","wonder","guess","possibly","not sure","don't know"];
  const uncertaintyHits = uncertaintyTerms.filter(t => input.toLowerCase().includes(t)).length;
  if (uncertaintyHits > 0) {
    score += 0.15 * Math.min(uncertaintyHits, 3);
    signals.push(`Uncertainty markers: ${uncertaintyHits}`);
  }

  // Prior resonance: strong history = yin has context to work with
  const avgRelevance = retrievedPriors.length
    ? roundN(retrievedPriors.reduce((s, p) => s + (p.relevance || 0), 0) / retrievedPriors.length)
    : 0;
  if (avgRelevance > 0.3) {
    score += 0.2 * avgRelevance;
    signals.push(`Prior resonance: ${avgRelevance}`);
  }

  // Low urgency favors yin
  const urgency = classification?.urgency || 0.5;
  if (urgency < 0.4) {
    score += 0.15 * (1 - urgency);
    signals.push(`Low urgency: ${urgency}`);
  }

  // Long input = more to integrate
  if (tokens.length > 20) {
    score += 0.1;
    signals.push(`Dense input: ${tokens.length} tokens`);
  }

  // High lexical density = complex input
  const density = classification?.density || 0.5;
  if (density > 0.7) {
    score += 0.1;
    signals.push(`High lexical density: ${density}`);
  }

  return {
    path: "yin",
    score: roundN(clampN(score)),
    signals
  };
}

// ── YANG PATH ────────────────────────────────────────────────────────
// Fast, expansive processing.
// Scores: how much does this input warrant immediate activation?
export function yangPath(input, classification, retrievedPriors) {
  const tokens = tokenize(input);
  const signals = [];
  let score = 0;

  // High urgency favors yang
  const urgency = classification?.urgency || 0.5;
  if (urgency >= 0.6) {
    score += 0.2 * urgency;
    signals.push(`High urgency: ${urgency}`);
  }

  // Novel input (no prior resonance) = yang explores
  const avgRelevance = retrievedPriors.length
    ? roundN(retrievedPriors.reduce((s, p) => s + (p.relevance || 0), 0) / retrievedPriors.length)
    : 0;
  if (avgRelevance < 0.2) {
    score += 0.2;
    signals.push(`Novel input (low prior resonance: ${avgRelevance})`);
  }

  // Command-type signals favor yang
  if (classification?.type === "command") {
    score += 0.2;
    signals.push("Command signal type");
  }

  // Short, dense inputs
  if (tokens.length <= 10 && tokens.length > 0) {
    score += 0.1;
    signals.push(`Short input: ${tokens.length} tokens`);
  }

  // Activation markers
  const activationTerms = ["now","immediately","fast","quick","urgent","go","start","run","execute","deploy"];
  const activationHits = activationTerms.filter(t => input.toLowerCase().includes(t)).length;
  if (activationHits > 0) {
    score += 0.1 * Math.min(activationHits, 3);
    signals.push(`Activation markers: ${activationHits}`);
  }

  return {
    path: "yang",
    score: roundN(clampN(score)),
    signals
  };
}

// ── ARBITRATION GATE ────────────────────────────────────────────────
// Reads both path outputs + runtime classification.
// Returns yinDominance (0–1) and the dominant mode.
export function arbitrationGate(yinResult, yangResult, classification) {
  const speedYinWeight  = classification?.yinWeight  || 0.5;
  const speedYangWeight = classification?.yangWeight || 0.5;

  // Weighted combination: path score + speed band weight
  const yinFinal  = roundN(yinResult.score  * 0.6 + speedYinWeight  * 0.4);
  const yangFinal = roundN(yangResult.score * 0.6 + speedYangWeight * 0.4);

  const total = yinFinal + yangFinal;
  const yinDominance = total > 0 ? roundN(yinFinal / total) : 0.5;

  const dominant = yinDominance > 0.55 ? "yin" :
                   yinDominance < 0.45 ? "yang" : "balanced";

  return {
    yinDominance,
    yangDominance: roundN(1 - yinDominance),
    dominant,
    yinScore:  yinFinal,
    yangScore: yangFinal,
    gate: `${dominant} (yin: ${yinDominance}, yang: ${roundN(1 - yinDominance)})`
  };
}

// ── ARBITRATION STATE ────────────────────────────────────────────────
// Persists the running history of arbitration decisions.
// Lets the bio layer see the long-term yin/yang balance of the system.
export class ArbitrationState {
  constructor() {
    this.history = [];
    this.totalDecisions = 0;
    this.avgYinDominance = 0.5;
  }

  record(decision) {
    this.history.push({ ...decision, decidedAt: nowISO() });
    this.totalDecisions++;
    this.avgYinDominance = roundN(
      (this.avgYinDominance * (this.totalDecisions - 1) + decision.yinDominance) /
      this.totalDecisions
    );
    if (this.history.length > 500) this.history = this.history.slice(-500);
    return decision;
  }

  recentBalance(n = 20) {
    const recent = this.history.slice(-n);
    if (!recent.length) return 0.5;
    return roundN(recent.reduce((s, d) => s + d.yinDominance, 0) / recent.length);
  }

  summary() {
    const dominantCounts = { yin: 0, yang: 0, balanced: 0 };
    for (const d of this.history) dominantCounts[d.dominant] = (dominantCounts[d.dominant] || 0) + 1;
    return {
      totalDecisions: this.totalDecisions,
      avgYinDominance: this.avgYinDominance,
      recentBalance: this.recentBalance(),
      dominantCounts
    };
  }
}

// ── ARBITRATION PROCESSOR ────────────────────────────────────────────
// Main entry point. Receives classified signal + retrieved priors.
// Returns full arbitration result ready for seven models.
export class ArbitrationProcessor {
  constructor() {
    this.state = new ArbitrationState();
  }

  process(input, classification, retrievedPriors) {
    const yin  = yinPath(input,  classification, retrievedPriors);
    const yang = yangPath(input, classification, retrievedPriors);
    const gate = arbitrationGate(yin, yang, classification);

    const decision = {
      id: uid(),
      input: input.slice(0, 100),
      yin,
      yang,
      gate,
      yinDominance: gate.yinDominance,
      yangDominance: gate.yangDominance,
      dominant: gate.dominant
    };

    this.state.record(decision);

    return {
      ...decision,
      arbitrationSummary: this.state.summary()
    };
  }
}
