// cli.js — Free-flow conversation interface
// Raw input in. Raw conversation out. No banners, labels, or structural chatter.
// Vision commands: eye:on, eye:off, eye:state

import readline from 'readline';
import { ProjectUnknown } from './project_unknown.js';
import { FreeFlowArchitecture } from './free_flow.js';
import { VisionIdentity } from './vision_identity.js';

const engine = new ProjectUnknown();
const flow = new FreeFlowArchitecture(engine);
const vision = new VisionIdentity(engine.vault);

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
    const reg = engine.selfAssessment ? engine.selfAssessment() : 'Status unavailable.';
    console.log(reg);
    rl.prompt();
    return;
  }

  if (input === 'recall') {
    flow.getHistory().forEach(h => console.log(`${h.role}: ${h.content}`));
    rl.prompt();
    return;
  }

  // Vision commands
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

  // Pass vision state into the stream context silently
  const visionContext = vision.isPresent()
    ? `[vision:present sessionId=${vision.state().sessionId}]`
    : null;

  const enriched = visionContext ? `${input} ${visionContext}` : input;

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
  process.exit(0);
});
