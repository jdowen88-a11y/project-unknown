/**
 * PROJECT UNKNOWN — STREAM PIPELINE
 * Version 0.7.0
 *
 * The main agent streams input to all seven models in parallel.
 * Each model internalizes independently into its own vault.
 * Each model sends a copy to the processing vault.
 * The processing vault interprets seven into one — and detects divergence.
 * Divergence is where the system breaks out of its own assumptions.
 * The processing vault reaches into the main vault for finalized prior thoughts.
 * It streams the unified interpretation back to the main agent.
 * The agent answers the user and finalizes the thought into the main vault.
 * Then it starts over.
 *
 * Self-regulation feeds a choiceVector back into this layer after every think().
 * The choiceVector's yinBias and meaningBias now directly modulate how the
 * seven models fire on the next input — the river of choice actually changes
 * the current of meaning, not just the narration.
 */

import { roundN, clampN, tokenize, uid, nowISO } from "./project_unknown.js";
import { TFIDF } from "./project_unknown.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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
// agent → seven models (parallel) → processing vault → main vault compare → agent
export class StreamPipeline {
  constructor(processingVault) {
    this.processingVault = processingVault;
  }

  // Main stream: run all seven models, send copies to processing vault,
  // compare against main vault, return unified stream back to agent.
  //
  // yin:        dominance of yin channel from arbitration + selfReg
  // meaningBias:additional bias from selfReg choiceVector
  stream(input, semanticModels, mainVaultRetrieved, yin = 0.5, meaningBias = 0) {
    const modelOutputs = {};

    for (const [key, model] of Object.entries(semanticModels)) {
      // Self-regulation actually modulates how each model fires.
      // encode(text, yin, bias) is respected here — choice flows through.
      modelOutputs[key] = model.encode(input, yin, meaningBias);
    }

    const unified = this.processingVault.process(input, modelOutputs, mainVaultRetrieved);
    const priorDivergence = this.processingVault.retrieveDivergence(input, 2);

    const streamSignal = {
      modelOutputs,
      unified,
      priorDivergence,
      growthSignal: unified.isDivergent && priorDivergence.length > 0
        ? `Recurring frontier: "${priorDivergence[0].input?.slice(0, 50)}" — model understanding expanding.`
        : unified.isDivergent
        ? `New frontier detected. Models disagree on: ${unified.confused.join(", ")}.`
        : null
    };

    return streamSignal;
  }
}
