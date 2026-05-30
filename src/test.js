/**
 * PROJECT UNKNOWN — TEST SUITE
 * Verifies all seven semantic models, TF-IDF, vault, and feedback loop.
 */

import { SEMANTIC_MODELS, TFIDF, FeedbackVault, ThoughtLoop, ProjectUnknown, globalTFIDF } from "./project_unknown.js";

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

console.log("\n── Seven Semantic Models ──");
for (const [key, model] of Object.entries(SEMANTIC_MODELS)) {
  const r = model.encode("I believe this system will definitely grow stronger over time");
  assert(`${key}: returns score`, typeof r.score === "number" && r.score >= 0 && r.score <= 1, JSON.stringify(r));
  assert(`${key}: returns signal`, typeof r.signal === "string" && r.signal.length > 0);
}

console.log("\n── TF-IDF Engine ──");
const tfidf = new TFIDF();
tfidf.addDocument("the vault stores every thought permanently");
tfidf.addDocument("seven semantic models process meaning");
const sim = tfidf.similarity("vault stores thought", "the vault stores every thought permanently");
assert("similarity > 0 for related text", sim > 0, `got ${sim}`);
assert("similarity = 0 for empty", tfidf.similarity("", "") === 0);

console.log("\n── FeedbackVault ──");
const vault = new FeedbackVault(null);
vault.store({ id: "test_1", input: "test thought", resolution: "resolved", meaningScore: 0.5, dominantLayer: "conceptual", tensionScore: 0.3, learningPressure: 0.4 });
assert("vault stores loop", vault.loops.length === 1);
assert("vault summary totalLoops = 1", vault.summary().totalLoops === 1);
const retrieved = vault.retrieve("test thought", 3);
assert("vault retrieves relevant loop", retrieved.length > 0);

console.log("\n── ThoughtLoop ──");
const loop = new ThoughtLoop("every thought creates its own feedback loop", []);
assert("loop has id", typeof loop.id === "string" && loop.id.startsWith("loop_"));
assert("loop entropy >= 0", loop.entropy >= 0);
assert("loop tensionScore = 1 with empty vault", loop.tensionScore === 1);

console.log("\n── ProjectUnknown Engine ──");
const agent = new ProjectUnknown({ filePath: null });
const result = agent.think("the vault is the intelligence and it grows forever");
assert("think() returns agentSignal", !!result.agentSignal);
assert("think() returns vaultEntry", !!result.vaultEntry && !!result.vaultEntry.id);
assert("think() returns vault summary", result.vault.totalLoops === 1);
assert("dominantLayer is a valid model", Object.keys(SEMANTIC_MODELS).includes(result.vaultEntry.dominantLayer));
assert("meaningScore is 0-1", result.vaultEntry.meaningScore >= 0 && result.vaultEntry.meaningScore <= 1);

const result2 = agent.think("the vault grows with every thought that enters it");
assert("second think() increments vault", result2.vault.totalLoops === 2);
assert("second think() finds vault resonance", result2.retrieved.length > 0);

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
