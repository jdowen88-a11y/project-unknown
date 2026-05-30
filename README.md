# Project Unknown

**The premise:**
Instead of one permanent feedback loop, every thought creates its own feedback loop. Each loop processes through seven semantic models. Each loop resolves and stores itself permanently in the vault. The vault is the intelligence. It grows forever.

## The seven semantic models

Each is an independent working unit processing a distinct layer of meaning:

1. **Conceptual** — denotative/dictionary meaning, what words literally refer to
2. **Connotative** — emotional and cultural associations beyond literal meaning
3. **Collocative** — word combination patterns and collocations
4. **Affective** — emotional charge and arousal level
5. **Social** — power, formality, and relational role
6. **Reflected** — implied attitude, belief, and speaker stance
7. **Thematic** — topic structure and information flow

## Architecture

- `ThoughtLoop` — one thought, one self-contained loop. Opens, runs seven models, resolves, closes.
- `FeedbackVault` — permanent store of every resolved loop. Never shrinks. TF-IDF retrieval.
- `ProjectUnknown` — the main engine. Every `think()` call generates a new loop.

## Conceived

May 30, 2026. Built from an iPhone with no computer.
