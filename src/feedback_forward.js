/**
 * PROJECT UNKNOWN — FEEDBACK FORWARD
 * Version 1.1.0
 *
 * Retrieved vault loops actively shape the next resolution.
 * The vault does not just store — it thinks forward.
 *
 * v1.1.0: Added patternConfidenceScore() and checkMasterDeployGate()
 * Patterns confirmed at >= 85% confidence route to human approval queue
 * before any master deploy can occur. Never auto-deploys.
 */

import { roundN, clampN, tokenize } from "./utils.js";

/**
 * Detects dominant layer streaks, tension trends, and recurring themes
 * across the most recent vault loops.
 */
export function analyzeVaultPattern(recentLoops) {
  if (!recentLoops.length) return { streak: null, tensionTrend: "stable", recurringThemes: [] };

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

  const tensions = recentLoops.map(l => l.tensionScore || 0);
  const avgRecent = tensions.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, tensions.length);
  const avgEarlier = tensions.slice(0, -3).reduce((s, v) => s + v, 0) / Math.max(1, tensions.length - 3);
  const tensionTrend = avgRecent > avgEarlier + 0.1 ? "rising" : avgRecent < avgEarlier - 0.1 ? "falling" : "stable";

  const allTokens = recentLoops.flatMap(l => tokenize(l.input || ""));
  const freq = new Map();
  const stop = new Set(["the","a","an","is","are","was","it","in","on","at","to","of","and","or","i","you","we","this","that"]);
  for (const t of allTokens) { if (!stop.has(t) && t.length > 3) freq.set(t, (freq.get(t) || 0) + 1); }
  const recurringThemes = [...freq.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

  return { streak, tensionTrend, recurringThemes };
}

/**
 * Builds a forward-influence signal from retrieved vault loops.
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

/**
 * Scores confidence that a pattern is real across all recent loops.
 * Returns 0.0 → 1.0. At >= 0.85 the master deploy gate opens for human approval.
 */
export function patternConfidenceScore(recentLoops, pattern) {
  const totalLoops = recentLoops.length;
  if (!totalLoops || !pattern.recurringThemes.length) return 0;

  let matchCount = 0;
  for (const loop of recentLoops) {
    const hasTheme = pattern.recurringThemes.some(t =>
      (loop.input || "").toLowerCase().includes(t)
    );
    if (hasTheme) matchCount++;
  }

  return roundN(matchCount / totalLoops);
}

/**
 * Master deploy gate.
 * If confidence >= 0.85, routes to human approval queue.
 * Never auto-deploys. Human approval is always required.
 */
export function checkMasterDeployGate(confidence, pattern, masterDeploy, fixPayload) {
  if (confidence >= 0.85) {
    let queueResult = null;
    if (masterDeploy && typeof masterDeploy.queue === "function") {
      queueResult = masterDeploy.queue({
        confidence,
        patterns: pattern.recurringThemes,
        tensionTrend: pattern.tensionTrend,
        streak: pattern.streak,
        ...fixPayload
      });
    }
    return {
      gate: "open",
      requiresApproval: true,
      confidence,
      queueResult,
      message: `Pattern confidence at ${(confidence * 100).toFixed(1)}%. Fix queued for qualified user approval before any master deploy.`
    };
  }
  return {
    gate: "closed",
    requiresApproval: false,
    confidence,
    message: `Pattern confidence at ${(confidence * 100).toFixed(1)}%. Below 85% threshold. No deploy queued.`
  };
}
