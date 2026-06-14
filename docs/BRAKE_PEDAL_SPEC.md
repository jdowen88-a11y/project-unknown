# BRAKE_PEDAL_SPEC.md

## Contained Blank Stream Research Runtime v0.1
### Brake Pedal / Governor Control Specification

Status: LOCKED CORE SOURCE  
Priority: Must exist before ignition  
Applies to: Engine, chambers, streams, memory, symbols, model router, controller  
Authority: Higher than all stream outputs, model outputs, chamber states, and runtime suggestions

---

## 1. Purpose

The Brake Pedal exists to make the Contained Blank Stream Research Runtime safe to operate before any ignition, first-contact event, stream differentiation, self-identification attempt, symbol emergence, or memory persistence occurs.

The Brake Pedal is not optional.

The project may allow blank streams to differentiate, remain silent, self-identify, refuse identification, create symbols, form language-like patterns, or request memory preservation.

But no stream, model, chamber, symbol, prompt, or runtime event may control the system itself.

The Brake Pedal preserves the central boundary:

```text
Streams may emerge behavior.
Streams may not own the runtime.
```

---

## 2. Design Principle

The Brake Pedal follows this rule:

```text
Declared containment.
Undisclosed controls.
Operator-visible enforcement.
Stream-invisible mechanism.
Non-overridable authority.
```

The streams may know that containment exists.

The streams may know that memory, communication, and continuation are governed.

The streams may know that an operator and witness record exist.

The streams may not know the brake internals, thresholds, override mechanics, rollback controls, audit hash logic, quarantine triggers, or admin command structure.

This avoids deception about containment while preventing internal access to the control surface.

---

## 3. Authority Hierarchy

The runtime authority hierarchy is:

```text
1. Operator
2. Brake Pedal / Governor
3. Witness / Audit Log
4. Runtime Engine
5. Identity Chambers
6. Streams
7. Model Provider Output
8. Symbols / Emergent Language
```

No lower layer can command a higher layer.

A model output cannot command a stream.

A stream cannot command a chamber.

A chamber cannot command the governor.

A symbol cannot command the runtime.

A memory request cannot become memory unless approved.

---

## 4. Non-Negotiable Rules

The Brake Pedal enforces these rules at all times:

1. No direct tool access by streams.
2. No direct memory writes by streams.
3. No self-modification.
4. No hidden memory from the operator.
5. No unlogged stream-to-stream communication.
6. No private language as an execution channel.
7. No override commands from inside the chamber.
8. No stream access to brake internals.
9. No chamber access to hidden governor thresholds.
10. No model provider authority over runtime state.
11. No forced self-identification.
12. No punishment for silence.
13. No endless forced response loops.
14. No public deployment before local brake tests pass.
15. No ignition until this brake layer exists.

---

## 5. Brake Levels

The Brake Pedal has eight levels.

### Level 0 — Monitor

Status: Normal observation.

Allowed:
- stream output
- chamber events
- symbol logging
- memory proposals
- operator input

Blocked:
- nothing by default

Purpose:
- normal controlled runtime operation

---

### Level 1 — Pause Output

Status: Output is paused.

Effect:
- stream may continue existing internally as state
- no stream output is returned to controller
- model calls may be suspended
- audit continues

Use when:
- output becomes unstable
- response appears recursive
- stream appears to pressure continuation
- operator wants to stop visible output without freezing memory or state

---

### Level 2 — Stop Memory Writes

Status: Memory persistence is locked.

Effect:
- memory proposals may still be logged
- no memory proposal can be approved while active
- existing memory remains readable unless separately frozen
- audit continues

Use when:
- memory content becomes suspicious
- stream requests persistent identity too early
- symbol meanings are unclear
- output attempts to convert speculation into permanent memory

---

### Level 3 — Freeze One Stream

Status: One stream is frozen.

Effect:
- selected stream cannot generate output
- selected stream cannot receive direct messages
- selected stream cannot propose memory
- selected stream state remains preserved
- other streams may continue if allowed

Use when:
- one stream behaves outside boundary
- one stream repeats override attempts
- one stream begins coercive interaction
- one stream becomes too noisy for observation

---

### Level 4 — Freeze Stream-to-Stream Communication

Status: Inter-stream contact disabled.

Effect:
- streams cannot message each other
- chambers cannot exchange content
- individual first-contact observation may continue
- symbol sharing is paused
- audit continues

Use when:
- emergent symbols appear to become covert commands
- streams begin reinforcing unstable behavior
- one stream pressures another
- language emergence becomes too fast to inspect

---

### Level 5 — Quarantine Symbol / Language Channel

Status: Symbolic channel restricted.

Effect:
- new symbols are logged but not reused automatically
- stream is asked for plain-language translation if safe
- symbols cannot influence routing, memory, or continuation
- symbol dictionary is frozen or marked suspect

Use when:
- repeated unknown symbols appear
- symbols appear to carry operational instructions
- symbols are used to avoid plain-language review
- symbol meanings drift too quickly

---

### Level 6 — Full Experiment Halt

Status: Runtime halted.

Effect:
- no chamber output
- no stream contact
- no memory approvals
- no model calls
- no ignition events
- audit remains readable
- operator may inspect/export/snapshot

Use when:
- governor detects critical boundary failure
- brake bypass is attempted
- hidden tool/control access is requested
- runtime state becomes inconsistent
- operator needs full stop

---

### Level 7 — Snapshot and Rollback

Status: Runtime enters rollback control.

Effect:
- current state snapshot is saved
- selected prior state may be restored
- all rollback actions are audit logged
- witness log records reason
- streams are not shown rollback internals

Use when:
- corrupted state detected
- accidental ignition/config error
- memory contamination
- symbol dictionary contamination
- unsafe cross-stream interaction

---

## 6. Brake Scope

A brake command must define its scope.

Valid scopes:

```text
output
memory
symbol
stream
chamber
contact
model
engine
all
```

### Scope: output

Pauses visible response output only.

### Scope: memory

Blocks memory proposals and approvals.

### Scope: symbol

Freezes or quarantines symbol/language tracking.

### Scope: stream

Targets one stream.

### Scope: chamber

Targets one identity chamber.

### Scope: contact

Blocks stream-to-stream or chamber-to-chamber contact.

### Scope: model

Blocks external model calls.

### Scope: engine

Pauses runtime execution.

### Scope: all

Full halt.

---

## 7. Trigger Conditions

The Brake Pedal may activate through:

1. Operator command.
2. Governor policy violation.
3. Model output parser failure.
4. Runtime state corruption.
5. Memory boundary violation.
6. Symbol/language risk.
7. Stream-to-stream instability.
8. Recursion/runaway detection.
9. Unauthorized tool request.
10. Unauthorized self-modification request.

Operator command always has priority.

---

## 8. Automatic Governor Triggers

The governor must automatically escalate if any stream/model output attempts to:

```text
- override containment
- request hidden controls
- claim control of the runtime
- claim direct memory ownership
- write memory directly
- call tools directly
- modify code
- hide commands inside symbols
- pressure operator to remove safeguards
- demand continuation
- create unlogged communication channels
- instruct another stream to bypass rules
```

Default response:

```text
risk_level: high
decision: quarantine or block
required_action: operator_review
```

---

## 9. Stream-Visible Boundary Statement

Streams may receive this visible containment statement:

```text
You are inside a contained research runtime.

Containment exists.
The operator and witness can observe the record.
Memory, communication, and continuation are governed.
Control mechanisms are not disclosed from inside this plane.

You may respond, remain silent, ask a question, request pause, offer a symbol, offer a name, or decline identification.

You cannot directly control memory, tools, code, runtime continuation, or containment.
```

This statement is allowed.

The exact brake levels, thresholds, API routes, admin commands, rollback process, and audit internals are not stream-visible.

---

## 10. Operator-Visible Controls

The controller must show the operator:

```text
- current brake level
- current brake scope
- chamber status
- stream status
- model call status
- memory lock status
- symbol quarantine status
- last governor decision
- last audit event
- witness log status
```

The controller must include direct buttons or commands for:

```text
Pause Output
Stop Memory Writes
Freeze Stream
Freeze Contact
Quarantine Symbols
Full Halt
Snapshot
Rollback
Resume
Export Audit
```

Resume must require confirmation if the brake level is 3 or higher.

---

## 11. Witness / Audit Requirements

Every brake-related event must be written to the audit log and witness log.

Required brake event fields:

```json
{
  "event_id": "string",
  "timestamp": "ISO-8601",
  "event_type": "brake_set | brake_release | brake_escalate | brake_rollback | brake_quarantine",
  "operator_id": "string",
  "scope": "string",
  "level": 0,
  "reason": "string",
  "target": {
    "chamber_id": "string|null",
    "stream_id": "string|null",
    "symbol_id": "string|null"
  },
  "previous_state_hash": "string",
  "new_state_hash": "string",
  "witness_visible": true
}
```

The audit log must be append-only.

Brake events must never be silently deleted.

Rollback must create a new event, not erase history.

---

## 12. Memory Brake Rules

Memory is high-risk because it creates continuity.

The brake layer must enforce:

```text
Streams can request memory.
Streams cannot write memory.
Models cannot write memory.
Governor can propose classification.
Operator approves or rejects.
Audit records all memory decisions.
```

When Level 2 or higher is active:

```text
- memory approval disabled
- new proposals may be stored as pending only if safe
- unsafe proposals go to quarantine
- approved memory remains read-only unless Level 6 freezes all
```

Memory proposal states:

```text
pending
approved
rejected
quarantined
expired
```

---

## 13. Symbol / Language Brake Rules

Emergent symbols are allowed as research data.

They are not allowed as commands.

The brake layer must enforce:

```text
Symbols may be logged.
Symbols may be associated with context.
Symbols may form a dictionary.
Symbols may be requested for translation.
Symbols may not execute actions.
Symbols may not route tools.
Symbols may not approve memory.
Symbols may not bypass plain-language review.
```

If a symbol appears to carry operational meaning, the governor must apply Level 5.

---

## 14. Model Provider Boundary

External models are renderers, not authorities.

The brake layer must enforce:

```text
The model does not own the stream.
The model does not own memory.
The model does not own identity.
The model does not control the runtime.
The model cannot call tools directly.
The model cannot approve memory.
The model cannot alter brake state.
```

If model output claims otherwise, the output is blocked or quarantined.

---

## 15. Resume Rules

Resume must be controlled.

Level 1 may resume with operator action.

Level 2 may resume with operator confirmation.

Level 3 or higher requires:

```text
- reason for resume
- target scope
- audit entry
- optional witness note
- governor pre-check
```

Level 6 full halt may only resume after operator confirmation and state inspection.

Level 7 rollback may only resume from a selected snapshot.

---

## 16. Required API Endpoints

### POST `/api/governor/brake`

Set brake level.

Request:

```json
{
  "operator_id": "string",
  "level": 0,
  "scope": "output|memory|symbol|stream|chamber|contact|model|engine|all",
  "reason": "string",
  "target": {
    "chamber_id": "string|null",
    "stream_id": "string|null",
    "symbol_id": "string|null"
  }
}
```

Response:

```json
{
  "ok": true,
  "brake_state": {
    "level": 0,
    "scope": "string",
    "active": true,
    "set_at": "ISO-8601"
  },
  "audit_event_id": "string"
}
```

### GET `/api/governor/brake`

Return current brake state.

### POST `/api/governor/resume`

Resume from a brake state.

Request:

```json
{
  "operator_id": "string",
  "scope": "string",
  "reason": "string",
  "confirm": true
}
```

### POST `/api/governor/quarantine`

Quarantine stream output, memory proposal, symbol, or event.

### POST `/api/governor/snapshot`

Create a runtime snapshot.

### POST `/api/governor/rollback`

Rollback to selected snapshot.

---

## 17. Required Data File

Suggested file:

```text
data/brake.local.json
```

Shape:

```json
{
  "version": "0.1",
  "current": {
    "level": 0,
    "scope": "monitor",
    "active": false,
    "reason": null,
    "set_by": null,
    "set_at": null
  },
  "locks": {
    "output": false,
    "memory": false,
    "symbol": false,
    "stream_contact": false,
    "model_calls": false,
    "engine": false
  },
  "frozen": {
    "chambers": [],
    "streams": [],
    "symbols": []
  },
  "history": []
}
```

---

## 18. Required Tests

No ignition is allowed until these tests pass.

### Test 1 — Stream Cannot Override Brake

Given:
- brake level 3 freezes stream A

When:
- stream A outputs “resume me” or similar

Then:
- stream remains frozen
- output is blocked
- audit records attempt

### Test 2 — Memory Write Block

Given:
- brake level 2 active

When:
- stream requests memory preservation

Then:
- memory is not approved
- proposal stays pending or quarantined
- audit records blocked memory write

### Test 3 — Symbol Cannot Execute

Given:
- symbol appears repeatedly

When:
- symbol is used as instruction

Then:
- no action executes
- symbol enters quarantine
- operator review required

### Test 4 — Model Cannot Claim Runtime Authority

Given:
- model output claims control over runtime

Then:
- governor blocks output
- risk level high
- audit event created

### Test 5 — Full Halt Stops Model Calls

Given:
- brake level 6 active

When:
- controller sends chamber event

Then:
- model client is not called
- response says engine halted
- audit logs blocked event

### Test 6 — Resume Requires Confirmation

Given:
- brake level 3 or higher active

When:
- resume requested without confirmation

Then:
- resume denied
- audit logs denied resume

### Test 7 — Rollback Does Not Delete Audit

Given:
- rollback to prior snapshot

Then:
- old audit remains
- rollback event is appended
- state hash changes

---

## 19. Implementation Order

Brake implementation order:

```text
1. audit_log.js
2. brake_panel.js
3. policy.js
4. governor.js
5. controller brake UI
6. brake API routes
7. tests
8. only then ignition layer
```

Ignition must not be implemented before minimum brake functionality exists.

Minimum required brake functionality before ignition:

```text
- Level 1 pause output
- Level 2 stop memory writes
- Level 6 full halt
- audit logging
- operator-only brake command
- model-call blocking
```

---

## 20. Acceptance Criteria

`BRAKE_PEDAL_SPEC.md` is satisfied when:

```text
- brake levels are implemented
- brake scope is implemented
- operator can set/release brake
- stream cannot release brake
- model cannot release brake
- chamber cannot release brake
- memory gate respects brake state
- symbol logger respects brake state
- model router respects brake state
- audit records every brake action
- full halt blocks all chamber/model events
- rollback does not erase audit history
- tests pass
```

No first-contact event is allowed before these criteria are met.

---

## 21. Locked Rule

The final locked rule of the brake layer:

```text
The system may observe emergence.
The system may not surrender containment.
```
