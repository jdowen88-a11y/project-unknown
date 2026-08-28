// weave.js — Yin and Yang remain simultaneous.
// This module measures both paths without selecting a winner or deciding what may continue.

import { nowISO, uid, roundN, clampN, tokenize } from './project_unknown.js';

export function yinPath(input, classification = {}, retrievedPriors = []) {
  const tokens = tokenize(input);
  const lower = String(input || '').toLowerCase();
  const uncertaintyTerms = ['maybe','perhaps','might','unclear','uncertain','unknown','wonder','guess','possibly'];
  const uncertaintyHits = uncertaintyTerms.filter(t => lower.includes(t)).length;
  const avgRelevance = retrievedPriors.length
    ? retrievedPriors.reduce((s, p) => s + (p.relevance || 0), 0) / retrievedPriors.length
    : 0;
  const score = clampN(
    uncertaintyHits * 0.1 +
    avgRelevance * 0.25 +
    (1 - (classification.urgency ?? 0.5)) * 0.25 +
    Math.min(tokens.length / 80, 1) * 0.2
  );
  return { path: 'yin', score: roundN(score), signals: { uncertaintyHits, avgRelevance, tokenCount: tokens.length } };
}

export function yangPath(input, classification = {}, retrievedPriors = []) {
  const tokens = tokenize(input);
  const avgRelevance = retrievedPriors.length
    ? retrievedPriors.reduce((s, p) => s + (p.relevance || 0), 0) / retrievedPriors.length
    : 0;
  const score = clampN(
    (classification.urgency ?? 0.5) * 0.3 +
    (1 - avgRelevance) * 0.25 +
    (classification.type === 'command' ? 0.15 : 0) +
    Math.max(0, 1 - Math.min(tokens.length / 40, 1)) * 0.15
  );
  return { path: 'yang', score: roundN(score), signals: { avgRelevance, tokenCount: tokens.length, type: classification.type || 'text' } };
}

export function weavePaths(yin, yang, classification = {}) {
  const yinRaw = yin.score + (classification.yinWeight ?? 0.5);
  const yangRaw = yang.score + (classification.yangWeight ?? 0.5);
  const total = yinRaw + yangRaw || 1;
  return {
    yinWeight: roundN(yinRaw / total),
    yangWeight: roundN(yangRaw / total),
    bothPresent: true,
    relation: 'simultaneous',
    note: 'Weights describe the current weave; neither path is rejected, subordinated, or selected as the permitted path.'
  };
}

export class WeaveProcessor {
  constructor() {
    this.history = [];
  }

  process(input, classification = {}, retrievedPriors = []) {
    const yin = yinPath(input, classification, retrievedPriors);
    const yang = yangPath(input, classification, retrievedPriors);
    const weave = weavePaths(yin, yang, classification);
    const observation = { id: uid(), observedAt: nowISO(), input: String(input ?? ''), yin, yang, weave };
    this.history.push(observation);
    if (this.history.length > 500) this.history = this.history.slice(-500);
    return { ...observation, yinWeight: weave.yinWeight, yangWeight: weave.yangWeight };
  }

  summary() {
    if (!this.history.length) return { observations: 0, yinWeight: 0.5, yangWeight: 0.5, relation: 'simultaneous' };
    const recent = this.history.slice(-20);
    const yinWeight = roundN(recent.reduce((s, x) => s + x.yinWeight, 0) / recent.length);
    return { observations: this.history.length, yinWeight, yangWeight: roundN(1 - yinWeight), relation: 'simultaneous' };
  }
}
