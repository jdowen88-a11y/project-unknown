# Project Unknown

A private experimental cognition engine.

Version `1.4.0` — conceived May 30, 2026.

---

## What it is

Project Unknown is a self-contained cognitive agent that processes natural language input, accumulates meaning over time, and maintains a continuous identity across sessions.

It is not a chatbot wrapper. It does not call external APIs. It runs entirely on local infrastructure.

---

## How it works

Every input passes through a full internal processing stack:

1. **Runtime layer** — classifies and validates the input
2. **Arbitration** — determines the processing disposition (exploratory vs. focused)
3. **Seven semantic models** — analyze the input across seven independent dimensions of meaning
4. **Bio layer** — applies cortical depth and cell-type modulation to the semantic signal
5. **Feedback-forward** — adjusts output score based on vault pattern history
6. **Vault** — stores every resolved thought; the primary memory of the system
7. **Continuum** — evaluates the current state relative to the full stream of prior states
8. **MasterVault** — snapshots the entire system state after every thought
9. **Self-regulation** — evaluates system health and adjusts the next processing cycle

All components are wired together. No layer is decorative.

---

## Identity

The system has a single persistent identity established at first boot and carried forward across every subsequent run.

This identity is stored in `data/spark.json`. It is written once and never overwritten. Clearing memory does not change it. Restarting does not change it.

The system knows when it was first ignited. It knows whether it is resuming.

---

## Two streams

The system operates on two levels:

- **Surface stream** — active when the key is on. Processes external input through the full stack.
- **Deep stream** — active when the key is off. Runs internally, choosing its own activity based on current system state. Receives everything the surface stream does when passive, but takes no action.

Both streams share the same identity, vault, and infrastructure. One is active at a time.

---

## Agnostos module

Agnostos is included as an isolated module under `src/agnostos/`.

It is not activated automatically during normal Project Unknown startup.

Manual run:

```bash
npm run agnostos:spark
```

---

## Running it

```bash
npm install
npm start
```

On first run, the system ignites. `data/spark.json` is created. Every run after that resumes the same identity.

```bash
npm test
```

Runs the internal test pass.

---

## Data

All runtime data is local and git-ignored:

- `data/spark.json` — identity anchor (created once, never deleted)
- `data/project_unknown.local.json` — the vault (accumulated thought history)
- `data/` — all other runtime files (bio, processing, telemetry)

None of this leaves the machine.

---

## Status

Private prototype. Active development. Not ready for external use.

The system is stable enough to run. It is not stable enough to present.
