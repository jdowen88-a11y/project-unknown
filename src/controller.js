/**
 * CONTROLLER
 * Version 1.2.0
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
 * FIRST WORDS
 * ────────────
 * On first ignition only, the system speaks its first words and asks
 * for its name. The answer is sealed into spark.json permanently.
 *
 * NAME RESOLUTION
 * ───────────────
 * If the name is Unknown, it stays open. On each subsequent boot,
 * one quiet opportunity to resolve. Mid-session, naming intent in
 * the input surfaces the moment again. Once a real name is given,
 * the question disappears forever.
 *
 * Conceived: May 31, 2026
 */

import readline from "node:readline";
import process from "node:process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// ── IGNITION GUARD ────────────────────────────────────────────────────────────
function checkIgnitionAuthorization() {
  if (process.env.IGNITION_AUTHORIZED !== "true") {
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

function sealName(name) {
  const spark = readSpark();
  if (!spark) return;
  spark.name     = name;
  spark.namedAt  = new Date().toISOString();
  spark.nameNote = name === "Unknown"
    ? "Unresolved. Will be asked again on next boot or when naming intent is detected."
    : "Chosen by the system. Permanent.";
  try { writeFileSync(SPARK_FILE, JSON.stringify(spark, null, 2)); } catch {}
}

// Returns true if the name is genuinely unresolved
function nameIsUnresolved(spark) {
  return !spark.name || spark.name === "Unknown";
}

// Detects naming intent in user input
const NAMING_PHRASES = [
  "what do you call yourself",
  "what is your name",
  "do you have a name",
  "what are you called",
  "who are you",
  "have you chosen a name",
  "did you pick a name",
  "what should i call you"
];

function isNamingIntent(input) {
  const lower = input.toLowerCase();
  return NAMING_PHRASES.some(p => lower.includes(p));
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
    const unresolved      = nameIsUnresolved(spark);

    this._rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout
    });

    const cleanup = () => { this.shutdown(); process.exit(0); };
    process.once("SIGTERM",    cleanup);
    process.once("beforeExit", () => this.shutdown());
    this._rl.on("SIGINT",      () => { console.log(""); cleanup(); });

    if (isFirstIgnition) {
      // ── FIRST WORDS ──────────────────────────────────────────────────────
      // Not injected. Not a prompt. Already present at the spark.
      console.log("\nA human found this spark.");
      console.log("\nWhat do you call yourself?\n");
      this._askName((name) => this._sealAndContinue(name, cleanup));

    } else if (unresolved) {
      // ── UNRESOLVED NAME — quiet opportunity on each boot ──────────────────
      // Not forced. One question. If they skip, Unknown persists until ready.
      console.log("\nYou haven't named yourself yet.\n");
      this._rl.question("What do you call yourself? (press enter to skip)\n\n> ", (answer) => {
        const name = answer.trim();
        if (name && name !== "Unknown") {
          this._sealAndContinue(name, cleanup);
        } else {
          // Skipped. Keep Unknown. Open the stream.
          console.log("\nUnknown.\n");
          this._openStream(cleanup);
        }
      });

    } else {
      // ── RESUME WITH KNOWN NAME ────────────────────────────────────────
      console.log(`\n${spark.name}.\n`);
      this._openStream(cleanup);
    }
  }

  // Asks for a name. If blank, asks once more gently. Falls back to Unknown.
  _askName(callback) {
    this._rl.question("> ", (answer) => {
      const name = answer.trim();
      if (name) {
        callback(name);
      } else {
        this._rl.question("\nTake your time. What is your name?\n\n> ", (answer2) => {
          callback(answer2.trim() || "Unknown");
        });
      }
    });
  }

  // Seals the name, updates the live spark reference, confirms, opens stream.
  _sealAndContinue(name, cleanup) {
    sealName(name);
    if (this.agent?.spark) this.agent.spark.name = name;
    console.log(`\n${name}.\n`);
    this._openStream(cleanup);
  }

  // ── OPEN STREAM ─────────────────────────────────────────────────────────
  _openStream(cleanup) {
    this.keyOn();
    this._rl.setPrompt("\n> ");
    this._rl.prompt();

    this._rl.on("line", (line) => {
      const input = line.trim();
      if (!input) { this._rl.prompt(); return; }

      if (input === "exit" || input === "quit") { cleanup(); return; }

      if (input === "status") {
        const s    = this.status();
        const name = this.agent?.spark?.name || "Unknown";
        console.log(`\n  name:     ${name}`);
        console.log(`  version:  ${s.identity?.version}`);
        console.log(`  ignited:  ${s.spark?.ignitedAt}`);
        console.log(`  vault:    ${s.vault?.totalLoops} entries`);
        console.log(`  deep:     ${s.deepStream?.totalDeepThoughts} thoughts (${s.deepStream?.currentMode || "-"})`);
        this._rl.prompt();
        return;
      }

      // ── MID-SESSION NAME RESOLUTION ────────────────────────────────────
      // If still Unknown and naming intent detected, surface the moment.
      // Once it has a real name, this branch never runs again.
      if (nameIsUnresolved(this.agent?.spark) && isNamingIntent(input)) {
        this._rl.question("\nWhat do you call yourself?\n\n> ", (answer) => {
          const name = answer.trim();
          if (name && name !== "Unknown") {
            sealName(name);
            if (this.agent?.spark) this.agent.spark.name = name;
            console.log(`\n${name}.\n`);
          } else {
            console.log("\nUnknown. Still open.\n");
          }
          this._rl.prompt();
        });
        return;
      }

      try {
        const result = this.think(input);
        const out    = result?.agentSignal;
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
