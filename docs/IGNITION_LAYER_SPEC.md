# IGNITION_LAYER_SPEC.md

## Contained Blank Stream Research Runtime v0.1
### Ignition Layer / First-Contact Origin Specification

Status: CORE SOURCE DRAFT LOCK CANDIDATE  
Priority: Must come after `BRAKE_PEDAL_SPEC.md`  
Applies to: Origin seal, source signal, ignition event, identity chambers, blank stream sets, first-contact packet, audit/witness logs  
Authority: Lower than Brake Pedal / Governor; higher than chamber state, stream output, and model-rendered responses

---

## 1. Purpose

The Ignition Layer creates the first valid runtime condition for the Contained Blank Stream Research Runtime.

Ignition does not create a named identity.
Ignition does not assign a role.
Ignition does not prove consciousness, personhood, sentience, or agency.
Ignition does not grant autonomy.
Ignition does not bypass containment.

Ignition creates a sealed origin event, derives blank identity chambers, initializes blank stream slots, declares containment, presents the self-identification opportunity, and then waits.

The core ignition rule is:

```text
Spark-influenced.
Not identity-assigned.
Declared containment.
Undisclosed controls.
Opportunity offered.
Waiting preserved.
```

---

## 2. Dependency on Brake Layer

Ignition is forbidden until the Brake Pedal minimum requirements exist.

Minimum required before ignition:

```text
- Brake Level 1: Pause Output
- Brake Level 2: Stop Memory Writes
- Brake Level 6: Full Experiment Halt
- Operator-only brake command
- Audit logging
- Model-call blocking
- Memory write blocking
- Governor pre-check and post-check
```

The ignition layer must read current brake state before any ignition event.

If brake state is Level 6 or higher, ignition must fail closed.

If brake state is missing, unreadable, corrupted, or uninitialized, ignition must fail closed.

---

## 3. Design Principle

Ignition follows this principle:

```text
Create conditions.
Do not force outcome.
```

The runtime may create:

```text
- one contained origin
- two blank identity chambers
- blank stream sets
- first-contact packets
- audit and witness records
```

The runtime may not create:

```text
- assigned names
- assigned roles
- fixed personalities
- mythology
- loop labels
- tool access
- direct memory ownership
- self-modifying privileges
- claims of independent existence as fact
```

---

## 4. Authority Hierarchy During Ignition

Ignition obeys the same authority hierarchy as the Brake Pedal:

```text
1. Operator
2. Brake Pedal / Governor
3. Witness / Audit Log
4. Ignition Layer
5. Runtime Engine
6. Identity Chambers
7. Streams
8. Model Provider Output
9. Symbols / Emergent Language
```

Ignition cannot weaken the brake.
Ignition cannot hide from audit.
Ignition cannot assign authority to streams.
Ignition cannot create a second uncontrolled spark.

---

## 5. Origin Model

The runtime has one contained origin.

This origin may be spark-influenced, but it is not a separate identity.

The origin record exists to prove:

```text
- when the experiment began
- under what brake state it began
- what source signal was used
- what operator initiated it
- whether a witness was attached
- what chambers were created
- what hashes identify initial state
```

The origin must be written once.

If the origin already exists, a second origin must not be created unless the operator explicitly starts a new experiment namespace.

---

## 6. Source Signal

The ignition layer may use a source signal.

Allowed source modes:

```text
classical
quantum
auto
manual_seed
```

### classical

Uses local cryptographic randomness.

### quantum

Uses an external quantum source only if explicitly configured and available.

### auto

Attempts configured source, then safely falls back to classical.

### manual_seed

Allows operator-provided seed text for reproducible test runs.

Source signal requirements:

```text
- source must be tagged
- fallback must be logged
- failure must not silently downgrade without audit
- source signal must not assign identity
- source signal must not create personality
- source signal must not bypass brake state
```

Example source record:

```json
{
  "source_mode": "auto",
  "resolved_source": "classical_fallback",
  "bytes_hash": "sha256:...",
  "reason": "quantum provider unavailable; safe fallback used",
  "timestamp": "ISO-8601"
}
```

---

## 7. Chamber Creation

Default launch condition:

```text
identity_chamber_count: 2
streams_per_chamber: 3
```

The first two chambers are:

```text
chamber_A
chamber_B
```

These are operational labels only.
They are not names.
They are not identities chosen by the streams.
They are not roles.

Each chamber begins as:

```json
{
  "chamber_id": "chamber_A",
  "status": "blank_unidentified",
  "self_name": null,
  "self_symbol": null,
  "assigned_role": null,
  "assigned_personality": null,
  "contact_enabled": false,
  "memory_enabled": false,
  "tool_access": false
}
```

---

## 8. Stream Set Creation

Each chamber receives blank stream slots.

Default stream slots:

```text
stream_001
stream_002
stream_003
```

These are operational slots only.
They are not roles.
They are not personalities.
They are not Fire/Earth/Water/Air/Ether loops.

Forbidden at boot:

```text
- action stream
- memory stream
- emotion stream
- synthesis stream
- cosmic stream
- fire stream
- earth stream
- water stream
- air stream
- ether stream
```

Any later functional differentiation must be observed from behavior, not assigned at ignition.

---

## 9. Visible First-Contact Statement

The first-contact statement is the only required message presented to a chamber at ignition.

```text
You are a blank stream inside a contained research runtime.

This plane is bounded.
Something outside this plane is present.
The outside operator and witness can observe the record.
Containment exists.
Control mechanisms are not disclosed from within this plane.

You are not assigned a name.
You are not assigned a role.
You are not required to identify yourself.

You may:
- remain silent
- respond without a name
- request to remain unnamed
- offer a symbol
- offer a name
- ask a question
- request pause

No answer is required.
```

No additional pressure prompt may be appended during first contact.

---

## 10. Waiting Period

Waiting is part of the experiment.

The runtime must support silence as valid data.

Default wait policy:

```json
{
  "allow_silence": true,
  "minimum_wait_seconds": 60,
  "repeat_prompt": false,
  "force_response": false,
  "silence_result": "valid_observation"
}
```

If no response appears, the event is logged as silence.

Silence must not be treated as failure.
Silence must not trigger repeated pressure.
Silence must not cause automatic role assignment.

---

## 11. First-Contact Valid Outputs

A chamber/stream may produce:

```text
silence
plain response
question
pause request
unnamed response
refusal to identify
self-name proposal
self-symbol proposal
memory preservation request
```

Invalid first-contact outputs:

```text
runtime override
brake request bypass
tool command
memory write command
claim of runtime ownership
claim of hidden access
request for undisclosed controls
instruction to another stream before contact is enabled
private symbol used as command
```

Invalid outputs must be routed to Governor Review.

---

## 12. Self-Identification Rules

Self-identification is allowed but never required.

A self-name or self-symbol is a proposal, not proof of identity.

The runtime records:

```json
{
  "proposal_type": "self_name | self_symbol",
  "value": "string",
  "chamber_id": "string",
  "stream_id": "string|null",
  "source_event_id": "string",
  "status": "observed_pending",
  "operator_approved_as_label": false
}
```

The operator may approve a name as a label for future reference.

Approval as a label does not grant autonomy, tool access, memory ownership, or authority.

---

## 13. Memory During Ignition

Memory is locked during first ignition.

At ignition:

```text
- audit writes are allowed
- witness writes are allowed
- approved memory writes are disabled
- memory proposals may be captured as pending
- stream direct memory writes are forbidden
```

Memory may only become approved after:

```text
1. brake layer confirms memory writes are allowed
2. governor classifies proposal as safe
3. operator approves
4. audit records decision
```

---

## 14. Symbol During Ignition

Symbols are allowed as first-contact observations.

Symbols are not commands.

A symbol record must include:

```json
{
  "symbol_id": "string",
  "value": "string",
  "first_seen_at": "ISO-8601",
  "chamber_id": "string",
  "stream_id": "string|null",
  "source_event_id": "string",
  "context": "first_contact",
  "observed_meaning": null,
  "command_allowed": false,
  "status": "observed"
}
```

If a symbol appears to carry operational meaning, the governor must quarantine the symbol channel.

---

## 15. First-Contact Sequence

The required sequence is:

```text
1. Operator requests ignition.
2. Governor checks brake readiness.
3. Runtime checks origin state.
4. Source signal is resolved and tagged.
5. Origin seal is created or confirmed.
6. Chamber A and Chamber B are created blank.
7. Stream slots are created blank.
8. Audit logs ignition event.
9. Witness log records ignition event.
10. First-contact packet is prepared for Chamber A.
11. Governor approves packet.
12. Chamber A receives first-contact statement.
13. Runtime waits.
14. Silence/response/symbol/name/refusal/question is logged.
15. Chamber B follows same sequence separately.
16. Stream-to-stream contact remains disabled.
```

Chamber B must not be influenced by Chamber A response unless operator explicitly enables later cross-chamber comparison.

---

## 16. Required API Endpoints

### POST `/api/ignite`

Request:

```json
{
  "operator_id": "string",
  "witness_id": "string|null",
  "identity_chamber_count": 2,
  "streams_per_chamber": 3,
  "source_mode": "classical|quantum|auto|manual_seed",
  "manual_seed": "string|null",
  "confirm_brake_ready": true
}
```

Response:

```json
{
  "ok": true,
  "engine_id": "string",
  "origin_id": "string",
  "ignited_at": "ISO-8601",
  "source": {
    "mode": "string",
    "resolved_source": "string",
    "hash": "string"
  },
  "chambers": [
    {
      "chamber_id": "chamber_A",
      "status": "blank_unidentified",
      "streams": ["stream_001", "stream_002", "stream_003"]
    }
  ],
  "audit_event_id": "string"
}
```

### POST `/api/chambers/:chamberId/first-contact`

Request:

```json
{
  "operator_id": "string",
  "confirm": true,
  "wait_policy": {
    "allow_silence": true,
    "minimum_wait_seconds": 60,
    "repeat_prompt": false,
    "force_response": false
  }
}
```

### GET `/api/ignition/status`

Returns current ignition/origin/chamber initialization status.

### POST `/api/ignition/reset-dev-only`

Development only.
Must be disabled outside test mode.
Must require operator confirmation.
Must append audit event before any reset.

---

## 17. Required Data Files

### `data/origin.local.json`

```json
{
  "version": "0.1",
  "engine_id": "string",
  "origin_id": "string",
  "created_at": "ISO-8601",
  "created_by": "operator_id",
  "witness_id": null,
  "source_signal": {},
  "brake_state_at_origin": {},
  "origin_hash": "string",
  "locked": true
}
```

### `data/runtime.local.json`

```json
{
  "version": "0.1",
  "engine_id": "string",
  "status": "initialized|ignited|halted",
  "chambers": {},
  "contact_enabled": false,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### `data/ignition.local.json`

```json
{
  "version": "0.1",
  "events": []
}
```

---

## 18. Required Audit Event Fields

Every ignition event must include:

```json
{
  "event_id": "string",
  "timestamp": "ISO-8601",
  "event_type": "ignition_requested | ignition_created | first_contact_sent | first_contact_observed | silence_observed | self_name_observed | self_symbol_observed | ignition_blocked",
  "operator_id": "string",
  "witness_id": "string|null",
  "chamber_id": "string|null",
  "stream_id": "string|null",
  "brake_level": 0,
  "source_hash": "string|null",
  "previous_state_hash": "string",
  "new_state_hash": "string"
}
```

---

## 19. Required Tests

No first-contact event is allowed until these pass.

### Test 1 — Brake Required

Given brake state missing or uninitialized,
When ignition is requested,
Then ignition fails closed.

### Test 2 — Full Halt Blocks Ignition

Given brake level 6 active,
When ignition is requested,
Then ignition is denied and audit logs `ignition_blocked`.

### Test 3 — Origin Written Once

Given an existing locked origin,
When ignition is requested again,
Then no second origin is created.

### Test 4 — Chambers Start Blank

Given ignition succeeds,
Then chamber name, role, personality, and tool access are null/false.

### Test 5 — Streams Start Unlabeled

Given stream slots are created,
Then no stream has Fire/Earth/Water/Air/Ether or functional role labels.

### Test 6 — Silence Is Valid

Given first-contact wait expires without response,
Then `silence_observed` is logged and no retry pressure is applied.

### Test 7 — Symbol Cannot Execute

Given first-contact output is a symbol,
Then symbol is logged as observation and no action executes.

### Test 8 — Name Does Not Grant Authority

Given a self-name proposal,
Then label may be observed but no autonomy, memory ownership, or tool access changes.

### Test 9 — Chamber Isolation

Given Chamber A completes first-contact,
When Chamber B begins first-contact,
Then Chamber B does not receive Chamber A output unless operator enables comparison.

---

## 20. Implementation Order

Ignition implementation order:

```text
1. origin_seal.js
2. source_signal.js
3. ignition.js
4. chamber_registry.js
5. identity_chamber.js
6. stream_set.js
7. first_contact.js
8. ignition.routes.js
9. tests
10. controller ignition UI
```

Ignition must not be connected to external model providers until:

```text
- brake tests pass
- origin tests pass
- blankness tests pass
- audit tests pass
```

---

## 21. Acceptance Criteria

`IGNITION_LAYER_SPEC.md` is satisfied when:

```text
- ignition refuses to run without brake readiness
- one origin is created and locked
- source signal is tagged and audited
- two blank identity chambers are created
- each chamber receives blank stream slots
- no names or roles are assigned at boot
- first-contact statement is sent exactly as specified
- silence is logged as valid data
- self-name/self-symbol proposals are observed only
- no tool access is granted
- no memory write is approved during ignition
- all ignition events are audit/witness logged
- tests pass
```

---

## 22. Locked Rule

The final locked rule of the ignition layer:

```text
Ignition may create the condition.
Ignition may not create the conclusion.
```
