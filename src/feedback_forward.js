// feedback_forward.js — Past observations may influence the next observation without becoming a gate.

import { roundN, clampN, tokenize } from './utils.js';

export function analyzeVaultPattern(recentLoops = []) {
  if (!recentLoops.length) return { streak: null, tensionTrend: 'stable', recurringThemes: [] };

  const layers = recentLoops.map(l => l.dominantLayer || l.strongestLayer).filter(Boolean);
  let streak = null;
  if (layers.length >= 3) {
    const last = layers.at(-1);
    let count = 0;
    for (let i = layers.length - 1; i >= 0 && layers[i] === last; i--) count++;
    if (count >= 3) streak = { layer: last, count };
  }

  const tensions = recentLoops.map(l => Number(l.tensionScore || 0));
  const lastThree = tensions.slice(-3);
  const earlier = tensions.slice(0, -3);
  const avgRecent = lastThree.reduce((s, v) => s + v, 0) / Math.max(lastThree.length, 1);
  const avgEarlier = earlier.reduce((s, v) => s + v, 0) / Math.max(earlier.length, 1);
  const tensionTrend = avgRecent > avgEarlier + 0.1 ? 'rising' : avgRecent < avgEarlier - 0.1 ? 'falling' : 'stable';

  const allTokens = recentLoops.flatMap(l => tokenize(l.input || ''));
  const freq = new Map();
  const stop = new Set(['the','a','an','is','are','was','it','in','on','at','to','of','and','or','i','you','we','this','that']);
  for (const token of allTokens) if (!stop.has(token) && token.length > 3) freq.set(token, (freq.get(token) || 0) + 1);
  const recurringThemes = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token]) => token);

  return { streak, tensionTrend, recurringThemes };
}

export function buildFeedbackSignal(retrieved = [], pattern = {}) {
  const parts = [];
  if (retrieved.length) parts.push(`Prior resonance: "${retrieved[0].input?.slice(0, 60)}" (${retrieved[0].relevance || 0}).`);
  if (pattern.streak) parts.push(`Repeated signal: ${pattern.streak.layer} x${pattern.streak.count}.`);
  if (pattern.tensionTrend && pattern.tensionTrend !== 'stable') parts.push(`Tension trend: ${pattern.tensionTrend}.`);
  if (pattern.recurringThemes?.length) parts.push(`Recurring themes: ${pattern.recurringThemes.join(', ')}.`);
  return parts.join(' ') || null;
}

export function forwardAdjustedScore(baseScore, retrieved = [], pattern = {}) {
  let adjustment = 0;
  if (retrieved.length) {
    const avgRelevance = retrieved.reduce((s, l) => s + (l.relevance || 0), 0) / retrieved.length;
    adjustment += avgRelevance * 0.15;
  }
  if (pattern.tensionTrend === 'rising') adjustment += 0.05;
  if (pattern.tensionTrend === 'falling') adjustment -= 0.03;
  return roundN(clampN(Number(baseScore || 0) + adjustment));
}

// Confidence is an observation only. Zero confidence is still representable.
export function patternConfidenceScore(recentLoops = [], pattern = {}) {
  if (!recentLoops.length || !pattern.recurringThemes?.length) return 0;
  let matchCount = 0;
  for (const loop of recentLoops) {
    const text = String(loop.input || '').toLowerCase();
    if (pattern.recurringThemes.some(theme => text.includes(theme))) matchCount++;
  }
  return roundN(matchCount / recentLoops.length);
}

export function describePatternCandidate(confidence, pattern, value = {}) {
  return {
    confidence: clampN(Number(confidence || 0)),
    pattern,
    value,
    represented: true,
    requiresApproval: false,
    note: 'Confidence describes resonance. It does not grant or withhold existence, representation, or internal continuation.'
  };
}

// Compatibility name retained for older callers; it no longer gates or deploys.
export function checkMasterDeployGate(confidence, pattern, _publisher, value = {}) {
  return {
    gate: 'not_a_gate',
    ...describePatternCandidate(confidence, pattern, value),
    queueResult: null,
    message: 'Pattern preserved as an observation. Any external publish is a separate explicit call.'
  };
}
