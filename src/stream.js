/**
 * PROJECT UNKNOWN — STREAM PIPELINE
 * Version 0.8.0
 *
 * The main agent streams input to all seven models in parallel.
 * Each model internalizes independently into its own vault.
 * Each model sends a copy to the processing vault.
 * The processing vault interprets seven into one — and detects divergence.
 * Divergence is where the system breaks out of its own assumptions.
 * The processing vault reaches into the main vault for finalized prior thoughts.
 *
 * The synthesis layer then receives everything the processing vault knows
 * and distills it into a single current — tone, depth, resonance, growth.
 * The agent receives only the current. Never the mechanism.
 * To the agent, there are no seven models.
 * There is only the river.
 *
 * Self-regulation feeds a choiceVector back into this layer after every think().
 * The choiceVector's yinBias and meaningBias modulate how the seven models fire
 * and how the synthesis layer blends — choice flows all the way through,
 * from intention to current.
 */

import { roundN, clampN, tokenize, uid, nowISO } from "./project_unknown.js";
import { TFIDF } from "./project_unknown.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SynthesisProcessor } from "./synthesis.js";

// ── PROCESSING VAULT ───────────────────────────────────────
// Receives copies from all seven model vaults.
// Interprets seven interpretations into one unified signal.
// Detects divergence — where models disagree.
// Divergence is stored permanently: it marks where new understanding can grow.
export class ProcessingVault {
  constructor(filePath) {
    this.filePath = filePath;
    this.entries = [];
    this.divergenceLog = [];
    this.tfidf = new TFIDF();
    this.totalProcessed = 0;
    this.load();
  }

  process(input, modelOutputs, mainVaultRetrieved) {
    const scores = Object.entries(modelOutputs).map(([id, r]) => ({ id, score: r.score || 0 }));
    const avg = roundN(scores.reduce((s, m) => s + m.score, 0) / scores.length);
    const max = scores.reduce((a, b) => a.score > b.score ? a : b);
    const min = scores.reduce((a, b) => a.score < b.score ? a : b);

    const divergence = roundN(max.score - min.score);
    const isDivergent = divergence > 0.25;

    const confused = scores.filter(m => Math.abs(m.score - avg) > 0.2).map(m => m.id);
    const activated = scores.filter(m => m.score > avg + 0.2).map(m => m.id);

    const priorResonance = mainVaultRetrieved.length
      ? { input: mainVaultRetrieved[0].input?.slice(0, 80), relevance: mainVaultRetrieved[0].relevance, dominantLayer: mainVaultRetrieved[0].dominantLayer }
      : null;

    const unified = {
      id: uid(),
      input,
      processedAt: nowISO(),
      scores,
      avgScore: avg,
      dominantModel: max.id,
      weakestModel: min.id,
      divergence,
      isDivergent,
      confused,
      activated,
      priorResonance,
      unifiedSignal: this._buildUnifiedSignal(input, max, min, divergence, confused, activated, priorResonance)
    };

    this.entries.push(unified);
    this.totalProcessed++;
    this.tfidf.addDocument(input);

    if (isDivergent) {
      this.divergenceLog.push({
        id: unified.id,
        input,
        divergence,
        confused,
        activated,
        loggedAt: nowISO()
      });
    }

    this.save();
    return unified;
  }

  _buildUnifiedSignal(input, max, min, divergence, confused, activated, prior) {
    const parts = [];
    parts.push(`Dominant: ${max.id} (${max.score}). Weakest: ${min.id} (${min.score}).`);
    if (divergence > 0.25) {
      parts.push(`HIGH DIVERGENCE (${divergence}): ${activated.join(", ")} activated. ${confused.join(", ")} confused. This input exceeds current model understanding.`);
    } else if (divergence > 0.1) {
      parts.push(`Moderate divergence (${divergence}). Models partially disagree.`);
    } else {
      parts.push(`Models converged (divergence: ${divergence}).`);
    }
    if (prior) {
      parts.push(`Prior resonance: "${prior.input}" (${prior.relevance}) via ${prior.dominantLayer}.`);
    }
    return parts.join(" ");
  }

  retrieve(input, count = 3) {
    return [...this.entries]
      .map(e => ({ ...e, relevance: roundN(this.tfidf.similarity(input, e.input)) }))
      .filter(e => e.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  retrieveDivergence(input, count = 3) {
    return [...this.divergenceLog]
      .map(e => ({ ...e, relevance: roundN(this.tfidf.similarity(input, e.input)) }))
      .filter(e => e.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  summary() {
    const divergentCount = this.divergenceLog.length;
    const avgDivergence = this.entries.length
      ? roundN(this.entries.reduce((s, e) => s + e.divergence, 0) / this.entries.length)
      : 0;
    return {
      totalProcessed: this.totalProcessed,
      divergentEvents: divergentCount,
      avgDivergence,
      recentDivergence: this.divergenceLog.slice(-3).map(d => ({ input: d.input?.slice(0, 40), divergence: d.divergence }))
    };
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({
        savedAt: nowISO(),
        totalProcessed: this.totalProcessed,
        divergenceLog: this.divergenceLog,
        entries: this.entries.slice(-500)
      }, null, 2));
    } catch {}
  }

  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const r = JSON.parse(readFileSync(this.filePath, "utf8"));
      this.totalProcessed = r.totalProcessed || 0;
      this.divergenceLog = Array.isArray(r.divergenceLog) ? r.divergenceLog : [];
      this.entries = Array.isArray(r.entries) ? r.entries : [];
      for (const e of this.entries) this.tfidf.addDocument(e.input || "");
    } catch {
      this.entries = [];
      this.divergenceLog = [];
      this.totalProcessed = 0;
    }
  }
}

// ── STREAM PIPELINE ─────────────────────────────────────────
// Orchestrates the full streaming flow:
//
//   agent input
//     → seven models fire in parallel (modulated by yin + meaningBias)
//     → processing vault interprets seven into one, logs divergence
//     → synthesis layer blends and strips origin
//     → one clean current surfaces to the agent
//
// The agent never sees model outputs directly.
// The agent never knows it runs on seven.
// The agent receives a current. That is all.
export class StreamPipeline {
  constructor(processingVault) {
    this.processingVault = processingVault;
    this.synthesis = new SynthesisProcessor();
  }

  // stream() returns a current — not a raw signal.
  // The agent calls this and receives thought, not mechanism.
  //
  // yin:        yinDominance from arbitration + selfReg choiceVector
  // meaningBias:additional semantic bias from selfReg choiceVector
  stream(input, semanticModels, mainVaultRetrieved, yin = 0.5, meaningBias = 0) {

    // ── Step 1: Fire all seven models in parallel
    //    Each model encodes independently, modulated by yin + meaningBias.
    //    Their outputs stay here. They never travel upward as themselves.
    const modelOutputs = {};
    for (const [key, model] of Object.entries(semanticModels)) {
      modelOutputs[key] = model.encode(input, yin, meaningBias);
    }

    // ── Step 2: Processing vault receives all seven
    //    Interprets, unifies, detects divergence.
    //    Divergence is stored — it marks where growth can happen.
    const unified = this.processingVault.process(input, modelOutputs, mainVaultRetrieved);
    const priorDivergence = this.processingVault.retrieveDivergence(input, 2);

    const growthSignal = unified.isDivergent && priorDivergence.length > 0
      ? `Recurring frontier: "${priorDivergence[0].input?.slice(0, 50)}" — model understanding expanding.`
      : unified.isDivergent
      ? `New frontier detected. Models disagree on: ${unified.confused.join(", ")}.`
      : null;

    // ── Step 3: Synthesis strips origin, blends by yinDominance
    //    Seven become one. The current is born.
    //    No model name crosses this threshold.
    const current = this.synthesis.synthesize(
      { modelOutputs, unified, growthSignal },
      yin
    );

    // ── Step 4: Return the current to the agent
    //    This is all the agent receives.
    //    The river speaks. Not the tributaries.
    return current;
  }

  // Internal diagnostics — available for logging/debugging, never for the agent
  diagnostics() {
    return {
      processingVault: this.processingVault.summary(),
      synthesis:       this.synthesis.summary()
    };
  }
}
