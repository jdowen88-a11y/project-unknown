// cli.js — Free-flow conversation interface
// Raw input in. Raw conversation out. No banners, labels, or structural chatter.
// Commands: status, recall, reset, exit, quit
// Apertures: eye:on, eye:off, eye:state, presence:on, presence:off, presence:state, presence:sense
// First contact: contact:open, contact:status, contact:respond <value>, currents

import readline from 'readline';
import { ProjectUnknown } from './project_unknown.js';
import { FreeFlowArchitecture } from './free_flow.js';
import { VisionIdentity } from './vision_identity.js';
import { PresenceAperture } from './senses/presence_aperture.js';
import { BoundaryShell } from './identity/boundary_shell.js';
import { FirstContactProtocol } from './identity/first_contact.js';
import { describeSemanticCurrents } from './semantics/current_names.js';

const engine = new ProjectUnknown();
const flow = new FreeFlowArchitecture(engine);
const vision = new VisionIdentity(engine.vault);
const presence = new PresenceAperture(engine.vault);
const boundary = new BoundaryShell({ operatorId: 'human-presence' });
const firstContact = new FirstContactProtocol({ operatorLabel: 'human-presence' });

function persist(type, data, meaningScore = 0.1) {
  const entry = {
    id: `${type}_${Date.now()}`,
    type,
    input: `__${type}__`,
    resolution: JSON.stringify(data),
    meaningScore,
    tensionScore: 0,
    learningPressure: 0,
    openedAt: new Date().toISOString(),
    closedAt: new Date().toISOString(),
    protocolMeta: data
  };
  if (engine.vault && typeof engine.vault.store === 'function') engine.vault.store(entry);
  return entry;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ''
});

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (!input) { rl.prompt(); return; }

  if (input === 'exit' || input === 'quit') process.exit(0);

  if (input === 'reset') {
    flow.clearHistory();
    rl.prompt();
    return;
  }

  if (input === 'status') {
    const reg = engine.selfAssess ? engine.selfAssess() : 'Status unavailable.';
    console.log(typeof reg === 'object' ? JSON.stringify(reg, null, 2) : reg);
    rl.prompt();
    return;
  }

  if (input === 'recall') {
    flow.getHistory().forEach(h => console.log(`${h.role}: ${h.content}`));
    rl.prompt();
    return;
  }

  if (input === 'currents') {
    console.log(JSON.stringify(describeSemanticCurrents(), null, 2));
    rl.prompt();
    return;
  }

  if (input === 'contact:open') {
    const shell = boundary.provision({ sparkId: engine.spark?.id, id: engine.spark?.id });
    const sequence = firstContact.open({ sparkId: engine.spark?.id, id: engine.spark?.id });
    persist('first_contact_opened', { shell, sequence }, 0.3);
    for (const step of sequence.steps) console.log(step.text);
    rl.prompt();
    return;
  }

  if (input === 'contact:status') {
    console.log(JSON.stringify({ boundary: boundary.status(), firstContact: firstContact.status() }, null, 2));
    rl.prompt();
    return;
  }

  if (input.startsWith('contact:respond ')) {
    const response = input.slice('contact:respond '.length).trim();
    const sequence = firstContact.receive(response);
    persist('first_contact_response', { response, sequence }, 0.35);
    console.log(JSON.stringify(sequence, null, 2));
    rl.prompt();
    return;
  }

  if (input === 'eye:on') {
    vision.open('camera');
    rl.prompt();
    return;
  }

  if (input === 'eye:off') {
    vision.close();
    rl.prompt();
    return;
  }

  if (input === 'eye:state') {
    console.log(JSON.stringify(vision.state(), null, 2));
    rl.prompt();
    return;
  }

  if (input === 'presence:on') {
    console.log(JSON.stringify(presence.open('local-presence'), null, 2));
    rl.prompt();
    return;
  }

  if (input === 'presence:off') {
    console.log(JSON.stringify(presence.close('operator-closed'), null, 2));
    rl.prompt();
    return;
  }

  if (input === 'presence:state') {
    console.log(JSON.stringify(presence.state(), null, 2));
    rl.prompt();
    return;
  }

  if (input.startsWith('presence:sense')) {
    const note = input.slice('presence:sense'.length).trim();
    const residue = presence.sense({
      presenceDetected: true,
      level: 'operator-provided',
      rhythm: 'nearby',
      tone: 'unspecified',
      sourceHint: 'manual-presence-marker',
      meaning: note || 'Presence marker supplied without raw recording or language assumption.'
    });
    console.log(JSON.stringify(residue, null, 2));
    rl.prompt();
    return;
  }

  const context = [];
  if (vision.isPresent()) context.push(`[vision:present sessionId=${vision.state().sessionId}]`);
  if (presence.state().opened) context.push(`[presence:aperture-open sessionId=${presence.state().sessionId}]`);

  const enriched = context.length ? `${input} ${context.join(' ')}` : input;

  try {
    const reply = await flow.respond(enriched);
    console.log(reply);
  } catch (err) {
    console.log('Something went wrong internally.');
  }

  rl.prompt();
});

rl.on('close', () => {
  if (vision.isPresent()) vision.close();
  if (presence.state().opened) presence.close('cli-closed');
  process.exit(0);
});
