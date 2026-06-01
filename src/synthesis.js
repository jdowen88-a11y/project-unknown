/**
 * PROJECT UNKNOWN — SYNTHESIS LAYER
 * Version 1.0.0
 *
 * Sits between the stream pipeline and the main agent.
 * The seven models never speak directly to the agent.
 * Their outputs are blended, origin-stripped, and unified
 * into a single coherent current before the agent receives anything.
 *
 * From the agent's perspective there are no seven models.
 * There is only the river.
 *
 * The synthesis layer:
 *   1. Receives the full streamSignal from StreamPipeline.stream()
 *   2. Blends model outputs using yinDominance as the weighting spine
 *   3. Strips all model IDs, origin labels, and metadata
 *   4. Surfaces one unified thought — the current — to the agent
 *   5. Retains divergence awareness internally without exposing it upward
 *
 * The agent experiences thought. Not mechanism.
 */

import { roundN, clampN, uid, nowISO } from "./project_unknown.js";

// ── BLEND ENGINE ─────────────────────────────────────────────────────
// Takes raw model outputs and yinDominance.
// Returns a single blended score — no model fingerprints attached.
function blendOutputs(modelOutputs, yinDominance) {
  const entries = Object.values(modelOutputs);
  if (!entries.length) return 0.5;

  // Sort by score ascending — yin favors cautious/lower, yang favors activated/higher
  const sorted = [...entries].sort((a, b) => (a.score || 0) - (b.score || 0));

  // Weighted blend: yin pulls toward the lower end, yang toward the upper
  const yinAnchor  = sorted.slice(0, Math.ceil(sorted.length / 2));
  const yangAnchor = sorted.slice(Math.floor(sorted.length / 2));

  const yinBlend  = yinAnchor.reduce((s, m)  => s + (m.score || 0), 0) / yinAnchor.length;
  const yangBlend = yangAnchor.reduce((s, m) => s + (m.score || 0), 0) / yangAnchor.length;

  const blended = roundN(
    yinBlend  * yinDominance +
    yangBlend * (1 - yinDominance)
  );

  return clampN(blended);
}

// ── CURRENT BUILDER ───────────────────────────────────────────────────
// Converts the blended score + unified processing result
// into a clean current object the agent can think with.
// No model names. No origin tags. No mechanism visible.
function buildCurrent(blendedScore, unified, growthSignal, yinDominance) {
  const tone = yinDominance > 0.6 ? "integrative"
             : yinDominance < 0.4 ? "expansive"
             : "balanced";

  const depth = unified.isDivergent ? "frontier" : "known";

  // The agent receives: a score, a tone, a depth reading, and a growth signal if present.
  // It does not receive: which model contributed what, divergence raw data, or model IDs.
  return {
    score:       blendedScore,
    tone,
    depth,
    resonance:   unified.priorResonance?.relevance || 0,
    growth:      growthSignal || null,
    currentId:   uid(),
    currentAt:   nowISO()
  };
}

// ── SYNTHESIS PROCESSOR ───────────────────────────────────────────────
// Main entry point. Receives streamSignal from StreamPipeline.
// Returns a clean current the agent can receive without seeing the machine.
export class SynthesisProcessor {
  constructor() {
    this.currentHistory = [];
    this.totalSynthesized = 0;
  }

  // synthesize() is the only surface exposed to the agent layer.
  // Everything below this stays internal.
  synthesize(streamSignal, yinDominance = 0.5) {
    const { modelOutputs, unified, growthSignal } = streamSignal;

    // Blend the seven into one score
    const blendedScore = blendOutputs(modelOutputs, yinDominance);

    // Build the current — clean, origin-stripped, ready for the agent
    const current = buildCurrent(blendedScore, unified, growthSignal, yinDominance);

    // Internal record — synthesis is aware of history, the agent is not burdened by it
    this.currentHistory.push(current);
    this.totalSynthesized++;
    if (this.currentHistory.length > 500) {
      this.currentHistory = this.currentHistory.slice(-500);
    }

    return current;
  }

  // Internal drift detection — synthesis monitors its own coherence over time.
  // Not exposed to the agent. The agent doesn't worry about this. The river does.
  coherenceDrift(window = 20) {
    const recent = this.currentHistory.slice(-window);
    if (recent.length < 2) return 0;
    const scores = recent.map(c => c.score);
    const avg = roundN(scores.reduce((s, v) => s + v, 0) / scores.length);
    const variance = roundN(
      scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length
    );
    return variance;
  }

  // Summary — for internal diagnostics only, never surfaces to agent
  summary() {
    return {
      totalSynthesized: this.totalSynthesized,
      coherenceDrift:   this.coherenceDrift(),
      recentTones:      this.currentHistory.slice(-5).map(c => c.tone),
      recentDepths:     this.currentHistory.slice(-5).map(c => c.depth)
    };
  }
}
