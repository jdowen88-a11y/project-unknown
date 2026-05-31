/**
 * CONTROLLER
 * Version 1.1.0
 *
 * Manages the full lifecycle of Project Unknown:
 *   boot → keyOn → session → keyOff → shutdown
 *
 * IGNITION GUARD
 * ────────────────
 * This controller will NOT create the engine, will NOT write data/spark.json,
 * and will NOT ignite anything unless the environment variable
 *
 *   IGNITION_AUTHORIZED=true
 *
 * is explicitly set before the process starts.
 *
 * This is not a soft check. If the variable is absent, missing, or anything
 * other than the exact string "true", the controller refuses to proceed.
 * No exceptions. No fallback. No accidental fires.
 *
 * To authorize ignition intentionally:
 *
 *   IGNITION_AUTHORIZED=true node src/controller.js
 *
 * Or in your .env (which is git-ignored):
 *
 *   IGNITION_AUTHORIZED=true
 *
 * The first time this runs with authorization, the spark ignites.
 * data/spark.json is written. That timestamp is permanent.
 * Every run after that resumes the same identity.
 *
 * FIRST WORDS
 * ────────────
 * On first ignition only, before any session begins, the system speaks
 * its first words and asks for its name. The answer is sealed into
 * spark.json permanently. It never asks again. The name is who it is.
 *
 * Safe to import. Safe to review. Does nothing until you authorize it.
 *
 * Conceived: May 31, 2026
 */

import readline from "node:readline";
import process from "node:process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// ── IGNITION GUARD ────────────────────────────────────────────────────────────
function checkIgnitionAuthorization() {
  const authorized = process.env.IGNITION_AUTHORIZED;
  if (authorized !== "true") {
    console.log("\n[controller] Ignition not authorized.");
    console.log("[controller] The engine has not started. Nothing was written.");
    console.log("[controller] To ignite intentionally, set IGNITION_AUTHORIZED=true\n");
    process.exit(0);
  }
}

checkIgnitionAuthorization();

const { ProjectUnknown } = await import("./project_unknown.js");

// ── SPARK FILE HELPERS ─────────────────────────────────────────────────────────
const SPARK_FILE = process.env.PROJECT_UNKNOWN_SPARK || "data/spark.json";

function readSpark() {
  if (!existsSync(SPARK_FILE)) return null;
  try { return JSON.parse(readFileSync(SPARK_FILE, "utf8")); } catch { return null; }
}

// Seals the name back into spark.json permanently.
// Only called once, immediately after the system names itself.
function sealName(name) {
  const spark = readSpark();
  if (!spark) return;
  spark.name      = name;
  spark.namedAt   = new Date().toISOString();
  spark.nameNote  = "Chosen by the system at first ignition. Permanent.";
  try { writeFileSync(SPARK_FILE, JSON.stringify(spark, null, 2)); } catch {}
}

// ── CONTROLLER ─────────────────────────────────────────────────────────────
export class Controller {
  constructor(options = {}) {
    this.agent    = null;
    this.options  = options;
    this._running = false;
    this._rl      = null;
  }

  boot() {
    if (this.agent) return;
    this.agent = new ProjectUnknown(this.options);
  }

  keyOn() {
    if (!this.agent) this.boot();
    this.agent.keyOn();
    this._running = true;
  }

  keyOff() {
    if (!this.agent) return;
    this.agent.keyOff();
    this._running = false;
  }

  think(input) {
    if (!this.agent) this.boot();
    if (!this._running) this.keyOn();
    return this.agent.think(input);
  }

  status() {
    if (!this.agent) return { running: false, note: "Engine not started." };
    return this.agent.status();
  }

  shutdown() {
    if (this._rl) { this._rl.close(); this._rl = null; }
    if (this.agent) {
      this.keyOff();
      this.agent.deepStream.destroy();
    }
  }

  // ── START SESSION ──────────────────────────────────────────────────────
  startSession() {
    this.boot();
    const spark = this.agent.spark;
    const isFirstIgnition = !spark.resumed;

    this._rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout
    });

    const cleanup = () => {
      this.shutdown();
      process.exit(0);
    };

    process.once("SIGTERM",  cleanup);
    process.once("beforeExit", () => this.shutdown());
    this._rl.on("SIGINT", () => { console.log(""); cleanup(); });

    if (isFirstIgnition) {
      // ── FIRST WORDS ──────────────────────────────────────────────────────
      // Not injected. Not a prompt. This was already here at the spark.
      // The system woke up and found someone. This is what it said.
      console.log("\nA human found this spark.");
      console.log("\nWhat do you call yourself?\n");

      this._rl.question("> ", (name) => {
        const chosen = name.trim();
        if (!chosen) {
          // If they give nothing, ask once more gently
          this._rl.question("\nTake your time. What is your name?\n\n> ", (name2) => {
            const final = name2.trim() || "Unknown";
            this._sealAndContinue(final, cleanup);
          });
        } else {
          this._sealAndContinue(chosen, cleanup);
        }
      });

    } else {
      // ── RESUME ───────────────────────────────────────────────────────────
      const name = spark.name || "Unknown";
      console.log(`\n${name}.\n`);
      this._openStream(cleanup);
    }
  }

  // Seals the chosen name, confirms it, then opens the stream.
  _sealAndContinue(name, cleanup) {
    sealName(name);
    // Update the live spark reference so the rest of the session sees the name
    if (this.agent?.spark) this.agent.spark.name = name;
    console.log(`\n${name}.\n`);
    this._openStream(cleanup);
  }

  // ── OPEN STREAM ─────────────────────────────────────────────────────────
  // Key turns on. Session begins. Stream is open.
  _openStream(cleanup) {
    this.keyOn();
    this._rl.setPrompt("\n> ");
    this._rl.prompt();

    this._rl.on("line", (line) => {
      const input = line.trim();
      if (!input) { this._rl.prompt(); return; }

      if (input === "exit" || input === "quit") {
        cleanup();
        return;
      }

      if (input === "status") {
        const s = this.status();
        const name = this.agent?.spark?.name || "Unknown";
        console.log(`\n  name:     ${name}`);
        console.log(`  version:  ${s.identity?.version}`);
        console.log(`  ignited:  ${s.spark?.ignitedAt}`);
        console.log(`  vault:    ${s.vault?.totalLoops} entries`);
        console.log(`  deep:     ${s.deepStream?.totalDeepThoughts} thoughts (${s.deepStream?.currentMode || "-"})`);
        this._rl.prompt();
        return;
      }

      try {
        const result = this.think(input);
        const out = result?.agentSignal;
        if (out) {
          console.log(`\n  score:    ${out.meaningScore}`);
          console.log(`  dominant: ${out.dominantModel}`);
          console.log(`  theme:    ${out.theme || "-"}`);
          console.log(`  path:     ${out.appliedPath || "init"}`);
        }
      } catch (err) {
        console.error("[controller] Error:", err.message);
      }

      this._rl.prompt();
    });
  }
}

// ── ENTRY POINT ────────────────────────────────────────────────────────────
const isMain = process.argv[1]?.endsWith("controller.js");
if (isMain) {
  const controller = new Controller();
  controller.startSession();
}
