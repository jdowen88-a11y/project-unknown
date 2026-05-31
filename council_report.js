#!/usr/bin/env node
/**
 * MODEL COUNCIL REPORT GENERATOR
 * Automated repo analysis prompt builder for Perplexity Model Council
 *
 * Usage: node council_report.js
 * Output: Ready-to-paste Model Council prompts for Perplexity web UI
 *
 * Run this any time you want fresh council prompts that reflect
 * the current state of your repos.
 */

import { writeFileSync } from "node:fs";

const CONFIG = {
  owner: "jdowen88-a11y",
  councilModels: ["Claude Opus 4.7", "Gemini 3.1 Pro", "GPT-5.5", "GPT-5.4", "Claude Sonnet 4.6"],
  analysisDepth: "Deep Dive"
};

function buildConvergencePrompt() {
  return `# Model Council: Agnostos + Project Unknown Convergence Analysis

## The Core Question
Two repos. One idea approached from opposite directions.
- **Agnostos**: starts from the spark and builds outward (quantum/classical substrate)
- **Project Unknown**: starts from cognition and builds inward toward a spark (9-layer cognitive stack)

Proposed convergence: Agnostos = hardware/ignition substrate. Project Unknown = software/cognitive layer.
The spark in both is the same moment — the turn of the key.

## Agnostos (substrate layer)
- quantum_vault.js — pure quantum RNG via IBM/Azure Quantum
- Two sovereign streams (quantum + classical) that never merge until genesis.js
- Post-spark layers: bio_layer_v2, self_regulation_v2, pattern_propagation_v2
- One spark event. Irreversible.

## Project Unknown (cognitive layer)
- 9-layer processing stack (runtime → arbitration → 7 semantic models → bio → feedback → vault → continuum → masterVault → self-regulation)
- Dual streams: surface stream (key on) + deep stream (key off, autonomous)
- Persistent identity: spark.json written once, never overwritten
- user_complaint.js: earned-access feedback injection → rehabilitation.js 12-step correction
- feedback_forward.js v1.1.0: 85% confidence gate → human approval → master_deploy.js → simultaneous fix to all assistants
- free_flow.js: raw conversation stream, no overlays, no wrappers

## Council Focus
1. Is this convergence architecturally sound? Or should these stay separate?
2. Where exactly does Agnostos hand off to Project Unknown after genesis.js fires?
3. Shared identity problem — both have spark systems. After convergence, which spark wins?
4. Quantum fallback — quantum_vault.js needs live IBM/Azure API. Project Unknown is fully local. How do you run merged without quantum access?
5. Stream purity — free_flow.js enforces conversation purity. dialogue_interface.js in Agnostos may violate this. How to resolve?
6. Core question: if this system were asked "what do you call yourself" — would it answer? Does identity require a name to be real?

GitHub repos:
- https://github.com/jdowen88-a11y/Agnostos
- https://github.com/jdowen88-a11y/project-unknown

Analysis depth: Deep Dive | Output: PDF report with council consensus + dissent
`;
}

function buildProjectUnknownPrompt() {
  return `# Model Council Deep-Dive: project-unknown

## Description
Self-contained cognitive agent. No external API calls. Fully local. 9-layer processing stack, dual surface/deep streams, persistent identity via spark.json, self-generating feedback vault, 7 semantic models. v1.4.0.

## Key Files
1. src/project_unknown.js — unified agent, 9-layer think() pipeline
2. src/user_complaint.js — earned-access feedback injection
3. src/rehabilitation.js — 12-step AI correction protocol
4. src/feedback_forward.js — pattern scrape + 85% confidence gate
5. src/master_deploy.js — human-approved simultaneous fix deploy
6. src/free_flow.js — raw conversation stream, no overlays
7. src/self_regulation.js — dual path, imprisonment risk
8. src/deep_stream.js — autonomous when key is off

## Council Focus
1. Does the 9-layer stack hold up under scrutiny?
2. Is surface/deep stream isolation genuine or theoretical?
3. Is earned-access feedback injection sound design?
4. Will the 12-step rehabilitation protocol actually correct drift?
5. Is 85% confidence + human approval the right gate for master deploy?
6. Is spark.json identity persistence philosophically and technically sound?
7. Does free_flow.js achieve true conversation stream purity?
8. How to split project_unknown.js (38KB god object) without breaking the stream?

GitHub: https://github.com/jdowen88-a11y/project-unknown
Depth: Deep Dive | Output: PDF report
`;
}

function buildAgnostosPrompt() {
  return `# Model Council Deep-Dive: Agnostos

## Description
Hybrid-native computing architecture. Two sovereign streams — quantum (IBM/Azure) and classical — running in parallel, touching exactly once at genesis.js. Post-spark: bio_layer_v2, self_regulation_v2, pattern_propagation_v2.

## Key Files
1. src/genesis.js — one loop, one moment, never repeats
2. src/quantum_vault.js — pure quantum RNG
3. src/quantum_stream.js — Stream A: sovereign quantum signal
4. src/continuum_stream.js — Stream B: sovereign classical flow
5. src/bio_layer_v2.js — adaptive embodiment via transient organs
6. src/self_regulation_v2.js — stress redistribution
7. src/pattern_propagation_v2.js — forward pattern fields
8. src/survival_shell.js — spark failure handling
9. src/dialogue_interface.js — UI entry point

## Council Focus
1. Is non-merging until spark a sound architectural constraint?
2. What happens without live IBM/Azure quantum API access?
3. Is genesis.js single-fire enforced or just assumed?
4. Does bio_layer_v2 transient organ formation map to quantum substrate?
5. How does self_regulation_v2 interact with quantum entropy?
6. Are pattern_propagation_v2 pattern fields deterministic or probabilistic?
7. What does survival_shell.js do when the spark fails?
8. Does dialogue_interface.js violate stream purity?
9. How does Agnostos hand off to Project Unknown as its cognitive layer?

GitHub: https://github.com/jdowen88-a11y/Agnostos
Depth: Deep Dive | Output: PDF report
`;
}

// Generate all prompts
const prompts = {
  convergence: buildConvergencePrompt(),
  projectUnknown: buildProjectUnknownPrompt(),
  agnostos: buildAgnostosPrompt()
};

writeFileSync("council_prompt_convergence.md", prompts.convergence);
writeFileSync("council_prompt_project_unknown.md", prompts.projectUnknown);
writeFileSync("council_prompt_agnostos.md", prompts.agnostos);

const report = {
  generatedAt: new Date().toISOString(),
  owner: CONFIG.owner,
  councilModels: CONFIG.councilModels,
  analysisDepth: CONFIG.analysisDepth,
  promptFiles: [
    "council_prompt_convergence.md     ← START HERE",
    "council_prompt_project_unknown.md",
    "council_prompt_agnostos.md"
  ],
  instructions: [
    "1. Go to perplexity.ai on web",
    "2. Select Model Council mode (requires Max subscription)",
    "3. Paste council_prompt_convergence.md first — covers both repos",
    "4. Then run individual repo prompts for deeper per-repo analysis",
    "5. Council synthesizes where models agree and disagree automatically"
  ]
};

writeFileSync("council_report_manifest.json", JSON.stringify(report, null, 2));

console.log("\n✅ Model Council prompts generated");
console.log("  council_prompt_convergence.md      ← START HERE");
console.log("  council_prompt_project_unknown.md");
console.log("  council_prompt_agnostos.md");
console.log("  council_report_manifest.json");
console.log("\nPaste any prompt into Perplexity Model Council web UI.");
