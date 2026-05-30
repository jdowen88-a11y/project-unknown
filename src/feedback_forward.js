/**
 * PROJECT UNKNOWN — FEEDBACK FORWARD
 * Retrieved vault loops actively shape the next resolution.
 * The vault doesn't just store — it thinks forward.
 */

import { roundN, clampN, tokenize } from "./project_unknown.js";

/**
 * Detects dominant layer streaks, tension trends, and recurring themes
 * across the most recent vault loops.
 */
export function analyzeVaultPattern(recentLoops) {
  if (!recentLoops.length) return { streak: null, tensionTrend: "stable", recurringThemes: [] };

  // Dominant layer streak
  const layers = recentLoops.map(l => l.dominantLayer).filter(Boolean);
  let streak = null;
  if (layers.length >= 3) {
    const last = layers[layers.length - 1];
    let count = 0;
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i] === last) count++; else break;
    }
    if (count >= 3) streak = { layer: last, count };
  }

  // Tension trend
  const tensions = recentLoops.map(l => l.tensionScore || 0);
  const avgRecent = tensions.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, tensions.length);
  const avgEarlier = tensions.slice(0, -3).reduce((s, v) => s + v, 0) / Math.max(1, tensions.length - 3);
  const tensionTrend = avgRecent > avgEarlier + 0.1 ? "rising" : avgRecent < avgEarlier - 0.1 ? "falling" : "stable";

  // Recurring themes
  const allTokens = recentLoops.flatMap(l => tokenize(l.input || ""));
  const freq = new Map();
  const stop = new Set(["the","a","an","is","are","was","it","in","on","at","to","of","and","or","i","you","we","this","that"]);
  for (const t of allTokens) { if (!stop.has(t) && t.length > 3) freq.set(t, (freq.get(t) || 0) + 1); }
  const recurringThemes = [...freq.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

  return { streak, tensionTrend, recurringThemes };
}

/**
 * Builds a forward-influence signal from retrieved vault loops.
 * This signal is injected into the resolution to close the feedback loop.
 */
export function buildFeedbackSignal(retrieved, pattern) {
  const parts = [];

  if (retrieved.length) {
    const top = retrieved[0];
    parts.push(`Prior resonance: "${top.input?.slice(0, 60)}" scored ${top.meaningScore} on ${top.dominantLayer}.`);
    if (retrieved.length > 1) {
      const layers = [...new Set(retrieved.map(l => l.dominantLayer).filter(Boolean))];
      parts.push(`Resonant layers: ${layers.join(", ")}.`);
    }
  }

  if (pattern.streak) {
    parts.push(`Pattern: ${pattern.streak.layer} dominant for ${pattern.streak.count} consecutive loops.`);
  }

  if (pattern.tensionTrend !== "stable") {
    parts.push(`Tension trend: ${pattern.tensionTrend}.`);
  }

  if (pattern.recurringThemes.length) {
    parts.push(`Recurring themes: ${pattern.recurringThemes.join(", ")}.`);
  }

  return parts.join(" ") || null;
}

/**
 * Computes a forward-adjusted meaning score.
 * High prior resonance pulls score up. Rising tension pulls it up.
 * Falling tension pulls it down slightly (system stabilizing).
 */
export function forwardAdjustedScore(baseScore, retrieved, pattern) {
  let adjustment = 0;
  if (retrieved.length) {
    const avgRelevance = retrieved.reduce((s, l) => s + (l.relevance || 0), 0) / retrieved.length;
    adjustment += avgRelevance * 0.15;
  }
  if (pattern.tensionTrend === "rising") adjustment += 0.05;
  if (pattern.tensionTrend === "falling") adjustment -= 0.03;
  return roundN(clampN(baseScore + adjustment));
}
