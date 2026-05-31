/**
 * PROJECT UNKNOWN — MASTER DEPLOY
 * Version 1.0.0
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
 */

import { nowISO, uid } from "./utils.js";

export class MasterDeploy {
  constructor(vault, masterVault) {
    this.vault = vault;
    this.masterVault = masterVault;
    this.approvalQueue = [];
    this.deployHistory = [];
    this.registeredAssistants = new Map(); // assistantId -> assistant instance
  }

  // ── ASSISTANT REGISTRY ─────────────────────────────────────────────────────
  register(assistantId, assistantInstance) {
    this.registeredAssistants.set(assistantId, assistantInstance);
    return { registered: true, assistantId, totalRegistered: this.registeredAssistants.size };
  }

  unregister(assistantId) {
    this.registeredAssistants.delete(assistantId);
  }

  // ── APPROVAL QUEUE ─────────────────────────────────────────────────────────
  // Called by feedback_forward when confidence >= 0.85
  // Holds fix for human approval — never auto-deploys
  queue(fix) {
    const entry = {
      id: uid(),
      fix,
      confidence: fix.confidence,
      patterns: fix.patterns || [],
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
      confidence: fix.confidence,
      message: `Fix queued. Confidence: ${(fix.confidence * 100).toFixed(1)}%. Awaiting qualified user approval before master deploy.`
    };
  }

  // ── HUMAN APPROVAL ─────────────────────────────────────────────────────────
  // Only qualified users can approve — checked against UserComplaintSystem qualified list
  approve(entryId, qualifiedUserId, qualifiedUsers) {
    if (!qualifiedUsers || !qualifiedUsers.has(qualifiedUserId)) {
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
    entry.approvedBy = qualifiedUserId;
    entry.approvedAt = nowISO();
    this._persist("approved_for_deploy", entry);

    return this.deploy(entry);
  }

  // ── MASTER DEPLOY ──────────────────────────────────────────────────────────
  // Propagates approved fix to all registered assistant instances simultaneously
  deploy(approvedEntry) {
    if (!approvedEntry || approvedEntry.status !== "approved") {
      return { deployed: false, message: "Cannot deploy. Entry must be approved first." };
    }

    const deployId = uid();
    const deployedTo = [];
    const failed = [];

    for (const [assistantId, assistant] of this.registeredAssistants) {
      try {
        if (typeof assistant.receiveFix === "function") {
          assistant.receiveFix(approvedEntry.fix);
          deployedTo.push(assistantId);
        }
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
      history: this.deployHistory.slice(-10)
    };
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
