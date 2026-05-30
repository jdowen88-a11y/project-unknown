#!/usr/bin/env node

import readline from "node:readline";
import { ProjectUnknown } from "./project_unknown.js";

const agent = new ProjectUnknown();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "\n> "
});

console.log(`\nProject Unknown v${agent.identity.version}`);
console.log(`${agent.identity.premise}\n`);
const s = agent.status().vault;
console.log(`Vault: ${s.totalLoops} loops loaded.\n`);

rl.prompt();

rl.on("line", (line) => {
  const input = line.trim();
  if (!input) { rl.prompt(); return; }

  if (input === "/status") {
    const v = agent.status().vault;
    console.log(`\nVault: ${v.totalLoops} loops | Avg tension: ${v.avgTension} | Avg meaning: ${v.avgMeaningScore}`);
    console.log(`Dominant layers:`, v.dominantLayers);
    rl.prompt(); return;
  }

  if (input.startsWith("/recall ")) {
    const query = input.slice(8).trim();
    const r = agent.recall(query, 5);
    if (!r.results.length) { console.log("\nNo vault resonance found."); }
    else {
      console.log(`\nRecall: ${r.results.length} result(s) from vault of ${r.vaultSize}:`);
      for (const l of r.results) {
        console.log(`  [${l.relevance}] "${l.input?.slice(0, 80)}" → ${l.dominantLayer}`);
      }
    }
    rl.prompt(); return;
  }

  if (input === "/reset") {
    agent.reset();
    console.log("\nVault cleared.");
    rl.prompt(); return;
  }

  if (input === "/exit" || input === "/quit") {
    console.log("\nVault sealed.\n");
    process.exit(0);
  }

  const result = agent.think(input);
  const { agentSignal, vaultEntry, retrieved, vault } = result;

  console.log(`\n── Loop ${vaultEntry.id} ──`);
  console.log(`Dominant: ${agentSignal.dominantLayer} — ${agentSignal.dominantDescription}`);
  console.log(`Meaning: ${vaultEntry.meaningScore} | Tension: ${vaultEntry.tensionScore}`);
  if (agentSignal.theme) console.log(`Theme: "${agentSignal.theme}" → "${agentSignal.rheme || ""}"`);
  console.log(`Stance: ${agentSignal.reflectedStance} | Affect: ${agentSignal.affectiveArousal > 0.2 ? "high" : agentSignal.affectiveArousal < -0.2 ? "low" : "neutral"} | Register: ${agentSignal.socialRegister}`);
  if (retrieved.length) {
    console.log(`Vault resonance: "${retrieved[0].input?.slice(0, 60)}" (${retrieved[0].relevance})`);
  }
  console.log(`Vault total: ${vault.totalLoops} loops`);

  rl.prompt();
});

rl.on("close", () => {
  console.log("\nVault sealed.\n");
  process.exit(0);
});
