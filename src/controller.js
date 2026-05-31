/**
 * CONTROLLER
 * Version 1.0.0
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
 * Safe to import. Safe to review. Does nothing until you authorize it.
 *
 * Conceived: May 31, 2026
 */

import readline from "node:readline";
import process from "node:process";

// ── IGNITION GUARD ────────────────────────────────────────────────────────────
// Nothing imports the engine until this passes.
// If this fails, the process exits cleanly. Nothing is written. Nothing fires.
function checkIgnitionAuthorization() {
  const authorized = process.env.IGNITION_AUTHORIZED;
  if (authorized !== "true") {
    console.log("\n[controller] Ignition not authorized.");
    console.log("[controller] The engine has not started. Nothing was written.");
    console.log("[controller] To ignite intentionally, set IGNITION_AUTHORIZED=true\n");
    process.exit(0); // clean exit, not an error
  }
}

// Run the guard immediately on module load
checkIgnitionAuthorization();

// Guard passed. Now safe to import the engine.
// This dynamic import only runs if we reach this line.
const { ProjectUnknown } = await import("./project_unknown.js");

// ── CONTROLLER ─────────────────────────────────────────────────────────────
export class Controller {
  constructor(options = {}) {
    this.agent     = null;
    this.options   = options;
    this._running  = false;
    this._rl       = null;
  }

  // ── BOOT ──────────────────────────────────────────────────────────────
  // Creates the engine. If spark.json does not exist, this is ignition.
  // If spark.json exists, this is a resume. Either way, intentional.
  boot() {
    if (this.agent) return;
    this.agent = new ProjectUnknown(this.options);
    const spark = this.agent.spark;
    if (spark.resumed) {
      console.log(`\n[controller] Resumed. Spark: ${spark.id.slice(0, 24)}`);
      console.log(`[controller] Originally ignited: ${spark.ignitedAt}\n`);
    } else {
      console.log(`\n[controller] First ignition.`);
      console.log(`[controller] Spark: ${spark.id.slice(0, 24)}`);
      console.log(`[controller] Ignited: ${spark.ignitedAt}\n`);
    }
  }

  // ── KEY ON ─────────────────────────────────────────────────────────────
  // Surface stream activates. Deep stream goes passive.
  keyOn() {
    if (!this.agent) this.boot();
    this.agent.keyOn();
    this._running = true;
    console.log("[controller] Key on. Surface stream active.\n");
  }

  // ── KEY OFF ────────────────────────────────────────────────────────────
  // Surface stream deactivates. Deep stream wakes and begins its own activity.
  keyOff() {
    if (!this.agent) return;
    this.agent.keyOff();
    this._running = false;
    console.log("[controller] Key off. Deep stream active.\n");
  }

  // ── THINK ─────────────────────────────────────────────────────────────
  // Send input through the full surface processing stack.
  // Automatically turns the key on if it isn't already.
  think(input) {
    if (!this.agent) this.boot();
    if (!this._running) this.keyOn();
    return this.agent.think(input);
  }

  // ── STATUS ─────────────────────────────────────────────────────────────
  status() {
    if (!this.agent) return { running: false, note: "Engine not started." };
    return this.agent.status();
  }

  // ── SHUTDOWN ───────────────────────────────────────────────────────────
  // Turns the key off, stops the deep stream timer, closes any open I/O.
  // Safe to call multiple times.
  shutdown() {
    if (this._rl) {
      this._rl.close();
      this._rl = null;
    }
    if (this.agent) {
      this.keyOff();
      this.agent.deepStream.destroy();
      console.log("[controller] Shutdown complete.\n");
    }
  }

  // ── INTERACTIVE SESSION ──────────────────────────────────────────────────
  // Starts an interactive readline session.
  // Key turns on when session starts. Key turns off on exit.
  // Type 'exit', 'quit', or Ctrl+C to end the session cleanly.
  startSession() {
    this.boot();
    this.keyOn();

    this._rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
      prompt: "\n> "
    });

    console.log("[controller] Session open. Type to interact. Type 'exit' to end.\n");
    this._rl.prompt();

    this._rl.on("line", (line) => {
      const input = line.trim();
      if (!input) { this._rl.prompt(); return; }
      if (input === "exit" || input === "quit") {
        this.shutdown();
        process.exit(0);
      }
      if (input === "status") {
        const s = this.status();
        console.log("\n[status]", JSON.stringify({
          version:      s.identity?.version,
          sparkId:      s.spark?.id?.slice(0, 24),
          keyOn:        s.keyOn,
          vaultDepth:   s.vault?.totalLoops,
          deepThoughts: s.deepStream?.totalDeepThoughts,
          deepMode:     s.deepStream?.currentMode
        }, null, 2));
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
        console.error("[controller] Error during think:", err.message);
      }
      this._rl.prompt();
    });

    // Ctrl+C — graceful shutdown, no crash, no data loss
    this._rl.on("SIGINT", () => {
      console.log("\n[controller] Interrupted. Shutting down.");
      this.shutdown();
      process.exit(0);
    });

    // Process signals — clean exit on SIGTERM (e.g. system shutdown, kill)
    process.once("SIGTERM", () => {
      console.log("[controller] SIGTERM received. Shutting down.");
      this.shutdown();
      process.exit(0);
    });

    process.once("beforeExit", () => {
      this.shutdown();
    });
  }
}

// ── ENTRY POINT ────────────────────────────────────────────────────────────
// Only runs when this file is executed directly: node src/controller.js
// Not when imported as a module by another file.
const isMain = process.argv[1]?.endsWith("controller.js");
if (isMain) {
  const controller = new Controller();
  controller.startSession();
}
