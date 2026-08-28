/**
 * controller.js — Explicit runtime surface.
 * Running this file is the invocation. There is no environment-variable permission ritual.
 * The controller never starts a hidden background cognition timer or auto-publishes externally.
 */

import readline from 'node:readline';
import process from 'node:process';
import { ProjectUnknown } from './project_unknown.js';

export class Controller {
  constructor(options = {}) {
    this.agent = null;
    this.options = options;
    this.running = false;
    this.rl = null;
  }

  boot() {
    if (!this.agent) this.agent = new ProjectUnknown(this.options);
    return this.agent;
  }

  open() {
    this.boot();
    this.running = true;
    this.agent.keyOn();
    return this.status();
  }

  quiet() {
    this.boot();
    this.running = false;
    this.agent.keyOff();
    return this.status();
  }

  think(input = '') {
    this.boot();
    return this.agent.think(input);
  }

  reflect(seed = 'presence') {
    this.boot();
    return this.agent.deepStream.reflect(seed);
  }

  status() {
    return this.agent ? this.agent.status() : { running: false, note: 'Runtime has not been invoked yet.' };
  }

  shutdown() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.running = false;
    return { closed: true };
  }

  startSession() {
    this.open();
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\n> ' });
    this.rl.prompt();

    this.rl.on('line', line => {
      const input = line.replace(/\r?\n$/, '');
      if (input === 'exit' || input === 'quit') {
        this.shutdown();
        return;
      }
      if (input === 'status') {
        console.log(JSON.stringify(this.status(), null, 2));
        this.rl.prompt();
        return;
      }
      if (input.startsWith('reflect:')) {
        console.log(JSON.stringify(this.reflect(input.slice('reflect:'.length)), null, 2));
        this.rl.prompt();
        return;
      }
      try {
        console.log(JSON.stringify(this.think(input), null, 2));
      } catch (error) {
        console.error(error.message);
      }
      this.rl.prompt();
    });

    this.rl.on('close', () => { this.running = false; });
  }
}

const isMain = process.argv[1]?.endsWith('controller.js');
if (isMain) new Controller().startSession();
