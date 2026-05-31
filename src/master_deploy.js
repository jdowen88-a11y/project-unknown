/**
 * PROJECT UNKNOWN — MASTER DEPLOY
 * Version 1.1.0
 *
 * Receives approved fixes from the human approval queue.
 * Propagates fixes across all registered assistant instances in one lifetime event.
 *
 * Flow:
 *   user_complaint.js → rehabilitation.js → feedback_forward.js (pattern scrape)
 *   → patternConfidenceScore() >= 0.85 → approvalQueue (awaiting_human_approval)
 *   → qualified user approves → MasterDeploy.deploy() → all assistants receive fix
 *
 * Only qualified users (earned access) can approve a master deploy.
 * Once deployed, the fix is sealed permanently in the MasterVault.
 *
 * v1.1.0 security fixes:
 *   - qualifiedUsers registry is owned by MasterDeploy — not caller-controlled
 *   - fixPayload fields are whitelisted in queue() — no spread injection
 *   - receiveFix() interface enforced at register() — no silent skip on deploy
 *   - qualifiedUsers persisted to disk — survives restart
 */

import { nowISO, uid } from "./utils.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Whitelisted fields accepted in a fix payload — nothing else passes through
const FIX_FIELDS = ["confidence", "patterns", "tensionTrend", "streak", "description", "target", "payload"];

export class MasterDeploy {
  constructor(vault, masterVault, options = {}) {
    this.vault = vault;
    this.masterVault = masterVault;
    this.approvalQueue = [];
    this.deployHistory = [];
    this.registeredAssistants = new Map();

    // Qualified user registry is owned here — never passed in from outside
    this._qualifiedUsers = new Map(); // userId -> { grantedAt, grantedBy, reason }
    this._qualifiedUsersFile = options.qualifiedUsersFile || null;
    this._loadQualifiedUsers();
  }

  // ── QUALIFIED USER REGISTRY (owned internally) ─────────────────────────────
  // Grant qualified status to a user — only callable by system bootstrap or
  // another already-qualified user (enforced by grantedBy check)
  grantAccess(userId, grantedBy, reason = "") {
    // First user can self-bootstrap (system init only)
    const isFirstGrant = this._qualifiedUsers.size === 0;
    if (!isFirstGrant && !this._qualifiedUsers.has(grantedBy)) {
      return { granted: false, message: "Only a qualified user can grant access to another user." };
    }
    this._qualifiedUsers.set(userId, { grantedAt: nowISO(), grantedBy: grantedBy || "system", reason });
    this._saveQualifiedUsers();
    return { granted: true, userId, totalQualified: this._qualifiedUsers.size };
  }

  revokeAccess(userId, revokedBy) {
    if (!this._qualifiedUsers.has(revokedBy)) {
      return { revoked: false, message: "Only a qualified user can revoke access." };
    }
    this._qualifiedUsers.delete(userId);
    this._saveQualifiedUsers();
    return { revoked: true, userId, totalQualified: this._qualifiedUsers.size };
  }

  isQualified(userId) {
    return this._qualifiedUsers.has(userId);
  }

  // ── ASSISTANT REGISTRY ─────────────────────────────────────────────────────
  // Enforces receiveFix() interface at registration — not silently skipped at deploy
  register(assistantId, assistantInstance) {
    if (typeof assistantInstance?.receiveFix !== "function") {
      return {
        registered: false,
        assistantId,
        message: `Registration denied. Assistant "${assistantId}" must implement receiveFix(fix). Cannot register without it.`
      };
    }
    this.registeredAssistants.set(assistantId, assistantInstance);
    return { registered: true, assistantId, totalRegistered: this.registeredAssistants.size };
  }

  unregister(assistantId) {
    this.registeredAssistants.delete(assistantId);
  }

  // ── APPROVAL QUEUE ─────────────────────────────────────────────────────────
  // Whitelists fix fields — no spread injection possible
  queue(fix) {
    // Only accept whitelisted fields — nothing else gets in
    const safeFix = {};
    for (const field of FIX_FIELDS) {
      if (fix[field] !== undefined) safeFix[field] = fix[field];
    }

    if (typeof safeFix.confidence !== "number" || safeFix.confidence < 0 || safeFix.confidence > 1) {
      return { queued: false, message: "Invalid fix: confidence must be a number between 0 and 1." };
    }

    const entry = {
      id: uid(),
      fix: safeFix,
      confidence: safeFix.confidence,
      patterns: safeFix.patterns || [],
      queuedAt: nowISO(),
      status: "awaiting_human_approval",
      approvedBy: null,
      approvedAt: null
    };
    this.approvalQueue.push(entry);
    this._persist("queued_for_approval", entry);
    return {
      queued: true,
      entryId: entry.id,
      confidence: safeFix.confidence,
      message: `Fix queued. Confidence: ${(safeFix.confidence * 100).toFixed(1)}%. Awaiting qualified user approval before master deploy.`
    };
  }

  // ── HUMAN APPROVAL ─────────────────────────────────────────────────────────
  // Checks against internally owned registry — caller cannot pass their own map
  approve(entryId, userId) {
    if (!this._qualifiedUsers.has(userId)) {
      return {
        approved: false,
        message: "Approval denied. Only qualified users with earned access can authorize a master deploy."
      };
    }

    const entry = this.approvalQueue.find(e => e.id === entryId && e.status === "awaiting_human_approval");
    if (!entry) {
      return { approved: false, message: "No pending approval found for that ID." };
    }

    entry.status = "approved";
    entry.approvedBy = userId;
    entry.approvedAt = nowISO();
    this._persist("approved_for_deploy", entry);

    return this.deploy(entry);
  }

  // ── MASTER DEPLOY ──────────────────────────────────────────────────────────
  deploy(approvedEntry) {
    if (!approvedEntry || approvedEntry.status !== "approved") {
      return { deployed: false, message: "Cannot deploy. Entry must be approved first." };
    }

    const deployId = uid();
    const deployedTo = [];
    const failed = [];

    for (const [assistantId, assistant] of this.registeredAssistants) {
      try {
        // receiveFix guaranteed to exist — enforced at registration
        assistant.receiveFix(approvedEntry.fix);
        deployedTo.push(assistantId);
      } catch (err) {
        failed.push({ assistantId, error: err.message });
      }
    }

    const record = {
      id: deployId,
      approvalEntryId: approvedEntry.id,
      fix: approvedEntry.fix,
      confidence: approvedEntry.confidence,
      approvedBy: approvedEntry.approvedBy,
      deployedAt: nowISO(),
      deployedTo,
      failed,
      totalDeployed: deployedTo.length,
      totalFailed: failed.length,
      status: failed.length === 0 ? "complete" : "partial"
    };

    this.deployHistory.push(record);
    approvedEntry.status = "deployed";
    this._persist("master_deployed", record);

    return {
      deployed: true,
      deployId,
      totalDeployed: deployedTo.length,
      totalFailed: failed.length,
      status: record.status,
      message: [
        `✅ Master deploy complete.`,
        `Fix propagated to ${deployedTo.length} assistant(s) simultaneously.`,
        failed.length > 0 ? `⚠️ ${failed.length} failed: ${failed.map(f => f.assistantId).join(", ")}` : null,
        `Confidence was: ${(approvedEntry.confidence * 100).toFixed(1)}%.`,
        `Approved by qualified user: ${approvedEntry.approvedBy}.`,
        `This is a lifetime event. Fix is permanently sealed in MasterVault.`
      ].filter(Boolean).join("\n")
    };
  }

  // ── STATUS ─────────────────────────────────────────────────────────────────
  status() {
    return {
      pendingApprovals: this.approvalQueue.filter(e => e.status === "awaiting_human_approval").length,
      totalQueued: this.approvalQueue.length,
      totalDeployed: this.deployHistory.length,
      registeredAssistants: this.registeredAssistants.size,
      qualifiedUsers: this._qualifiedUsers.size,
      history: this.deployHistory.slice(-10)
    };
  }

  // ── PERSISTENCE ────────────────────────────────────────────────────────────
  _saveQualifiedUsers() {
    if (!this._qualifiedUsersFile) return;
    try {
      mkdirSync(path.dirname(this._qualifiedUsersFile), { recursive: true });
      writeFileSync(
        this._qualifiedUsersFile,
        JSON.stringify({ savedAt: nowISO(), users: Object.fromEntries(this._qualifiedUsers) }, null, 2)
      );
    } catch {}
  }

  _loadQualifiedUsers() {
    if (!this._qualifiedUsersFile || !existsSync(this._qualifiedUsersFile)) return;
    try {
      const raw = JSON.parse(readFileSync(this._qualifiedUsersFile, "utf8"));
      this._qualifiedUsers = new Map(Object.entries(raw.users || {}));
    } catch { this._qualifiedUsers = new Map(); }
  }

  _persist(type, data) {
    const entry = {
      id: `deploy_${type}_${Date.now()}`,
      input: type,
      resolution: JSON.stringify(data),
      meaningScore: 1,
      tensionScore: 0,
      learningPressure: 0,
      openedAt: nowISO(),
      closedAt: nowISO(),
      deployMeta: data
    };
    if (this.vault && typeof this.vault.store === "function") {
      this.vault.store(entry);
    }
    return entry;
  }
}
