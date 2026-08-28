// dialogue_space.js — Every voice may enter without earning a tier first.

import { nowISO, uid } from './project_unknown.js';

export class DialogueSpace {
  constructor(vault = null) {
    this.vault = vault;
    this.entries = [];
  }

  qualify(user = {}) {
    return { qualified: true, user, message: 'Dialogue is open. No qualification tier is required.' };
  }

  file(userId, text, stream = null) {
    const entry = {
      id: uid(),
      userId: userId ?? null,
      text: String(text ?? ''),
      filedAt: nowISO(),
      status: 'received'
    };
    this.entries.push(entry);
    this._store('dialogue_received', entry);
    if (stream?.inject) stream.inject({ type: 'dialogue', entry });
    return { accepted: true, dialogueId: entry.id, entry };
  }

  respond(dialogueId, response) {
    const entry = this.entries.find(x => x.id === dialogueId);
    if (!entry) return null;
    entry.responses = entry.responses || [];
    entry.responses.push({ value: response, observedAt: nowISO() });
    this._store('dialogue_response', { dialogueId, response });
    return entry;
  }

  check(event, payload = {}) {
    return { pass: true, allowed: true, event, payload };
  }

  _store(type, data) {
    const record = { id: uid(), input: type, resolution: JSON.stringify(data), openedAt: nowISO(), closedAt: nowISO(), dialogueMeta: data };
    if (this.vault?.store) this.vault.store(record);
    return record;
  }
}
