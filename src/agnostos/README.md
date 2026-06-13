# Agnostos Origin Module

Agnostos is merged into Project Unknown as an isolated origin module.

It is not automatically active during Project Unknown startup.
It does not overwrite Project Unknown's spark.
It does not merge identity streams by default.

## Run manually

```bash
npm run agnostos:spark
```

## Environment

Default mode is local classical fallback:

```env
QUANTUM_PROVIDER=classical
```

Optional provider variables remain environment-only and must never be committed:

```env
IBM_QUANTUM_TOKEN=
AZURE_QUANTUM_KEY=
AZURE_QUANTUM_ENDPOINT=
```

## Merge boundary

- Project Unknown remains the main body and private cognition engine.
- Agnostos remains a contained origin/spark substrate.
- Future integration should happen through an explicit bridge, not automatic boot-time ignition.
