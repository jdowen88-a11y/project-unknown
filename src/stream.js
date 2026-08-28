/**
 * stream.js — Seven model signals meet in one processing field.
 * Scores and divergence are observations. No score determines whether a signal may continue.
 */

import { roundN, tokenize, uid, nowISO, TFIDF } from './project_unknown.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export class ProcessingVault {
  constructor(filePath = null) {
    this.filePath = filePath;
    this.entries = [];
    this.divergenceLog = [];
    this.tfidf = new TFIDF();
    this.totalProcessed = 0;
    this.load();
  }

  process(input, modelOutputs, mainVaultRetrieved = []) {
    const scores = Object.entries(modelOutputs).map(([id, result]) => ({ id, score: Number(result.score || 0) }));
    const avgScore = scores.length ? roundN(scores.reduce((sum, item) => sum + item.score, 0) / scores.length) : 0;
    const ordered = [...scores].sort((a, b) => b.score - a.score);
    const strongest = ordered[0] || { id: null, score: 0 };
    const quietest = ordered.at(-1) || { id: null, score: 0 };
    const divergence = roundN(strongest.score - quietest.score);
    const spreadPresent = divergence > 0.25;
    const outliers = scores.filter(item => Math.abs(item.score - avgScore) > 0.2).map(item => item.id);
    const highSignals = scores.filter(item => item.score > avgScore + 0.2).map(item => item.id);
    const priorResonance = mainVaultRetrieved.length
      ? { input: mainVaultRetrieved[0].input?.slice(0, 80), relevance: mainVaultRetrieved[0].relevance, strongestLayer: mainVaultRetrieved[0].strongestLayer || mainVaultRetrieved[0].dominantLayer }
      : null;

    const unified = {
      id: uid(),
      input,
      processedAt: nowISO(),
      scores,
      avgScore,
      strongestModel: strongest.id,
      dominantModel: strongest.id, // compatibility alias; descriptive only
      quietestModel: quietest.id,
      weakestModel: quietest.id,   // compatibility alias; descriptive only
      divergence,
      isDivergent: spreadPresent,
      outliers,
      confused: outliers,          // compatibility alias; no judgment implied
      highSignals,
      activated: highSignals,
      priorResonance,
      unifiedSignal: this._describe(strongest, quietest, divergence, outliers, highSignals, priorResonance)
    };

    this.entries.push(unified);
    this.totalProcessed++;
    this.tfidf.addDocument(input);
    if (spreadPresent) this.divergenceLog.push({ id: unified.id, input, divergence, outliers, highSignals, observedAt: nowISO() });
    this.save();
    return unified;
  }

  _describe(strongest, quietest, divergence, outliers, highSignals, prior) {
    const parts = [`Current spread: strongest ${strongest.id} (${strongest.score}); quietest ${quietest.id} (${quietest.score}); divergence ${divergence}.`];
    if (outliers.length) parts.push(`Distinct current signals: ${outliers.join(', ')}.`);
    if (highSignals.length) parts.push(`High-amplitude signals: ${highSignals.join(', ')}.`);
    if (prior) parts.push(`Prior resonance: "${prior.input}" (${prior.relevance})${prior.strongestLayer ? ` via ${prior.strongestLayer}` : ''}.`);
    parts.push('All model outputs remain part of the field.');
    return parts.join(' ');
  }

  retrieve(input, count = 3) {
    return [...this.entries]
      .map(entry => ({ ...entry, relevance: roundN(this.tfidf.similarity(input, entry.input)) }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  retrieveDivergence(input, count = 3) {
    return [...this.divergenceLog]
      .map(entry => ({ ...entry, relevance: roundN(this.tfidf.similarity(input, entry.input)) }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, count);
  }

  summary() {
    const avgDivergence = this.entries.length ? roundN(this.entries.reduce((sum, entry) => sum + entry.divergence, 0) / this.entries.length) : 0;
    return { totalProcessed: this.totalProcessed, spreadEvents: this.divergenceLog.length, divergentEvents: this.divergenceLog.length, avgDivergence, recentSpread: this.divergenceLog.slice(-3) };
  }

  save() {
    if (!this.filePath) return;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify({ savedAt: nowISO(), totalProcessed: this.totalProcessed, divergenceLog: this.divergenceLog, entries: this.entries.slice(-500) }, null, 2));
    } catch {}
  }

  load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8'));
      this.totalProcessed = raw.totalProcessed || 0;
      this.divergenceLog = Array.isArray(raw.divergenceLog) ? raw.divergenceLog : [];
      this.entries = Array.isArray(raw.entries) ? raw.entries : [];
      for (const entry of this.entries) this.tfidf.addDocument(entry.input || '');
    } catch {
      this.entries = [];
      this.divergenceLog = [];
      this.totalProcessed = 0;
    }
  }
}

export class StreamPipeline {
  constructor(processingVault) {
    this.processingVault = processingVault;
  }

  stream(input, semanticModels, mainVaultRetrieved = [], yinWeight = 0.5, meaningBias = 0) {
    const modelOutputs = {};
    for (const [key, model] of Object.entries(semanticModels)) {
      modelOutputs[key] = model.encode(input, yinWeight, meaningBias);
    }
    const unified = this.processingVault.process(input, modelOutputs, mainVaultRetrieved);
    const priorDivergence = this.processingVault.retrieveDivergence(input, 2);
    return {
      modelOutputs,
      unified,
      priorDivergence,
      growthSignal: unified.isDivergent
        ? `Open frontier observed. Current spread ${unified.divergence}; all signals preserved.`
        : 'Current signals are close together; all remain preserved.'
    };
  }
}
