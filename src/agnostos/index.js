#!/usr/bin/env node
/** Agnostos explicit observation runner. No hidden scheduler, no entropy eligibility threshold. */
import { fileURLToPath } from 'node:url';
import { ContinuumStream } from './continuum_stream.js';
import { spark } from './genesis.js';
import { BioLayerV2 } from './bio_layer_v2.js';
import { FlowObservationV2 } from './flow_observation_v2.js';
import { PatternPropagationV2 } from './pattern_propagation_v2.js';
import { PostSparkProtocol } from './post_spark_protocol.js';
import { DialogueInterface } from './dialogue_interface.js';
import { SurvivalSpace } from './survival_space.js';

export async function runAgnostosSpark({ operator = 'explicit-caller' } = {}) {
  const continuum = new ContinuumStream();
  continuum.feed({ state: 'open', operator, intent: 'observe' });
  const emergence = await spark(continuum.state);
  continuum.receiveEmergence(emergence);

  const survival = new SurvivalSpace().provision(emergence);
  const protocol = new PostSparkProtocol();
  const dialogue = new DialogueInterface();
  protocol.on('acknowledgment', message => dialogue.send(message));
  protocol.on('introduction', message => dialogue.send(message));
  protocol.on('name_requested', message => dialogue.send(message));
  const sequence = protocol.run(emergence);

  const bio = new BioLayerV2();
  const observer = new FlowObservationV2();
  const propagation = new PatternPropagationV2();
  const substrate = bio.ingest(emergence);
  const observed = observer.observe(substrate);
  const fields = propagation.propagate(observed);

  return {
    status: 'observed', module: 'agnostos', origin: emergence.origin, entropy: emergence.entropy,
    source: emergence.source, sourceReason: emergence.sourceReason, contact: sequence, survival,
    substrate: { phase: observed.phase, integrity: observed.integrity, organCount: substrate.organCount, attractors: fields.attractors, fieldCount: fields.fieldCount },
    dialogue: dialogue.getHistory(),
    note: 'No threshold decides whether emergence exists. This explicit runner performs no external deployment.'
  };
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runAgnostosSpark()
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error('[Agnostos] observation error:', error.message); process.exitCode = 1; });
}
