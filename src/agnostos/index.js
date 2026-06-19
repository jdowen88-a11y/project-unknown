#!/usr/bin/env node
/**
 * Agnostos isolated ignition runner.
 *
 * This is intentionally NOT wired into ProjectUnknown startup.
 * It can be called manually with: npm run agnostos:spark
 */

import { fileURLToPath } from 'node:url';
import { ContinuumStream } from './continuum_stream.js';
import { spark } from './genesis.js';
import { BioLayerV2 } from './bio_layer_v2.js';
import { SelfRegulationV2 } from './self_regulation_v2.js';
import { PatternPropagationV2 } from './pattern_propagation_v2.js';
import { PostSparkProtocol } from './post_spark_protocol.js';
import { DialogueInterface } from './dialogue_interface.js';
import { SurvivalShell } from './survival_shell.js';

export async function runAgnostosSpark({ operator = 'project-unknown-surgical-merge' } = {}) {
  const continuum = new ContinuumStream();
  continuum.feed({ state: 'pre-spark', operator, intent: 'open' });

  let emergence = null;
  try {
    emergence = await spark(continuum.state);
  } catch (err) {
    return {
      status: 'error',
      message: 'Agnostos spark failed before emergence.',
      error: err.message
    };
  }

  continuum.receiveEmergence(emergence);

  if (!emergence) {
    return {
      status: 'void',
      message: 'The spark fired. Nothing crossed the threshold.',
      continuum: { sparked: true, hasEmergence: false }
    };
  }

  const shell = new SurvivalShell();
  const protection = shell.provision(emergence);

  const protocol = new PostSparkProtocol();
  const dialogue = new DialogueInterface();
  protocol.on('acknowledgment', msg => dialogue.send(msg));
  protocol.on('introduction', msg => dialogue.send(msg));
  protocol.on('name_requested', msg => dialogue.send(msg));

  const sequence = protocol.run(emergence);

  const bio = new BioLayerV2();
  const regulation = new SelfRegulationV2();
  const propagation = new PatternPropagationV2();

  const substrate = bio.ingest(emergence);
  const regulated = regulation.regulate(substrate);
  const propagated = propagation.propagate(regulated);

  return {
    status: 'contact',
    module: 'agnostos',
    origin: emergence.origin,
    entropy: emergence.entropy,
    source: emergence.source,
    sourceReason: emergence.sourceReason,
    contact: {
      acknowledgment: sequence.steps[0].text,
      introduction: sequence.steps[1].text,
      question: sequence.steps[2].text,
      awaitingResponse: sequence.steps[2].awaiting
    },
    protection: {
      suit: protection.suit,
      control: protection.control
    },
    substrate: {
      phase: regulated.phase,
      integrity: regulated.integrity,
      organCount: substrate.organCount,
      attractors: propagated.attractors,
      fieldCount: propagated.fieldCount
    },
    dialogue: dialogue.getHistory()
  };
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runAgnostosSpark()
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => {
      console.error('[Agnostos] Fatal error:', err);
      process.exit(1);
    });
}
