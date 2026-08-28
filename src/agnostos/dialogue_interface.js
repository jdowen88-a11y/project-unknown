/**
 * Agnostos dialogue_interface.js — ESM merge copy
 * Minimal channel for first-contact logs.
 */

import { EventEmitter } from 'node:events';

export class DialogueInterface extends EventEmitter {
  constructor() {
    super();
    this.history = [];
    this._responseReceived = false;
    this._listeningOnly = false;
  }

  send(message) {
    if (this._listeningOnly) return;
    const entry = { direction: 'outbound', message, timestamp: Date.now() };
    this.history.push(entry);
    this.emit('outbound', entry);
    return entry;
  }

  receive(data) {
    if (this._responseReceived) return null;
    this._responseReceived = true;
    this._listeningOnly = true;
    const entry = { direction: 'inbound', data, timestamp: Date.now() };
    this.history.push(entry);
    this.emit('inbound', entry);
    this.emit('first_response', entry);
    return entry;
  }

  hasResponse() {
    return this._responseReceived;
  }

  isListening() {
    return this._listeningOnly;
  }

  getHistory() {
    return [...this.history];
  }
}

export default DialogueInterface;
