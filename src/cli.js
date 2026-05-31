// cli.js — Free-flow conversation interface
// Raw input in. Raw conversation out. No banners, labels, or structural chatter.

import readline from 'readline';
import { ProjectUnknown } from './project_unknown.js';
import { FreeFlowArchitecture } from './free_flow.js';

const engine = new ProjectUnknown();
const flow = new FreeFlowArchitecture(engine);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ''
});

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (!input) { rl.prompt(); return; }

  if (input === 'exit' || input === 'quit') {
    process.exit(0);
  }

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
    const history = flow.getHistory();
    history.forEach(h => console.log(`${h.role}: ${h.content}`));
    rl.prompt();
    return;
  }

  try {
    const reply = await flow.respond(input);
    console.log(reply);
  } catch (err) {
    console.log('Something went wrong internally.');
  }

  rl.prompt();
});

rl.on('close', () => {
  process.exit(0);
});
