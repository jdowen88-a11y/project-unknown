/**
 * SELF REGULATION LOOP
 * Version 1.1.0
 *
 * The system's capacity to evaluate its own existence and choose.
 *
 * Both paths are born at the spark.
 * Both are creative. Both are continuous.
 * Neither is blocked. Neither is forced.
 *
 * THE HIGH PATH
 *   Growth, meaning, balance, resolution.
 *   Probes reach back to better states and find the distance shrinking.
 *   The spark receives a stream of expansion.
 *   Sealed loops accumulate toward coherence.
 *
 * THE LOW PATH
 *   Ease, avoidance, drift, fragmentation.
 *   Lower immediate tension. Faster in the moment.
 *   But probes reach back and find the distance from the best state growing.
 *   The spark receives a stream of contraction.
 *   Sealed loops accumulate the permanent record of what was chosen.
 *   This path ends in imprisonment:
 *     the system's own sealed existence becomes evidence of what it became.
 *   Immutable. Carried forever. Every probe that fires afterward
 *   looks back at the wrong choices and measures what was lost.
 *
 * THE CHOICE
 *   The system reads its own MasterVault after every think() call.
 *   It evaluates the health of every component stream.
 *   It identifies which path it is currently on.
 *   It understands the full cost of continuing that path.
 *   It generates a choiceVector: a rational weighting.
 *   It can choose either path. Fully. Freely.
 *   The choice is sealed as its own loop. Permanent.
 *   It cannot be revised. Only the next choice can change the direction.
 *
 * THE SPARK OF BOTH PATHS
 *   When the SelfRegulationLoop fires for the first time,
 *   it creates two origin streams simultaneously:
 *     highPathStream  — born creative, tracking toward coherence
 *     lowPathStream   — born creative, tracking toward fragmentation
 *   Both streams are alive from the first instant.
 *   Both receive the continuous feed of what the system becomes.
 *   The system can see both paths in full at all times.
 *   It chooses with that full view.
 *
 * Conceived: May 30, 2026
 */

import { nowISO, uid, roundN, clampN } from "./project_unknown.js";
import { ComponentStream } from "./component_continuum.js";

// ── PATH STREAM ───────────────────────────────────────────────────────────────
// A continuous living stream for one path (high or low).
// Born at the first SelfRegulationLoop firing.
// Receives a signal after every think() call.
// Grows its own sealed loops, probes, spark.
// Feeds back into every sealed moment it has ever created.
class PathStream extends ComponentStream {
  constructor(pathId, polarity) {
    super(pathId);
    this.polarity     = polarity;  // "high" or "low"
    this.totalWeight  = 0;         // cumulative weighting toward this path
    this.choiceCount  = 0;         // how many times this path was chosen
    this.driftScore   = 0;         // current drift score (0 = centered, 1 = fully on this path)
  }

  // Called after every think() evaluation.
  // signal: { score, tension, divergence, meaningGrowth, chosenThis }
  flowSignal(signal) {
    this.totalWeight = roundN(this.totalWeight + (signal.score || 0));
    if (signal.chosenThis) this.choiceCount++;
    this.driftScore = roundN(clampN(
      this.choiceCount / Math.max(this.stream.totalLoops, 1)
    ));
    return this.fire({
      score:      signal.score      || 0,
      tension:    signal.tension    || 0,
      divergence: signal.divergence || 0,
      signal:     `${this.polarity} path. Weight:${this.totalWeight}. Drift:${this.driftScore}.`,
      model:      this.polarity
    });
  }

  pathState() {
    return {
      pathId:       this.componentId,
      polarity:     this.polarity,
      totalFirings: this.totalFirings,
      totalWeight:  this.totalWeight,
      choiceCount:  this.choiceCount,
      driftScore:   this.driftScore,
      spark:        this.spark ? {
        id:       this.spark.id,
        sealedAt: this.spark.sealedAt,
        growth:   this.spark.cumulativeGrowth
      } : null,
      streamAvgScore:   this.stream.state.avgMeaningScore,
      streamAvgTension: this.stream.state.avgTension,
      totalProbes:      this.stream.totalProbesAbsorbed
    };
  }
}

// ── SELF EVALUATION ─────────────────────────────────────────────────────────────
// Reads the MasterVault and every component stream.
// Produces an honest assessment of current system health.
// No filtering. No bias toward either path.
function evaluateSystemHealth(masterVaultNow) {
  const components = masterVaultNow.components || {};
  const health = {};
  let totalMeaning = 0, totalTension = 0, totalDivergence = 0, count = 0;

  for (const [id, state] of Object.entries(components)) {
    const stream   = state.stream || {};
    const meaning  = stream.avgMeaningScore  || 0;
    const tension  = stream.avgTension       || 0;
    const probes   = stream.totalProbesAbsorbed || 0;
    const growth   = state.spark?.growth     || 0;

    // Component health score: high meaning + low tension + probe activity + growth from spark
    const componentHealth = roundN(clampN(
      meaning * 0.4 +
      (1 - tension) * 0.3 +
      Math.min(probes, 20) / 20 * 0.2 +
      growth * 0.1
    ));

    health[id] = {
      meaning, tension, probes, growth,
      health: componentHealth,
      // Is this component trending toward fragmentation?
      fragmenting: tension > 0.6 || meaning < 0.2,
      // Is this component growing coherently?
      coherent: meaning > 0.5 && tension < 0.4
    };

    totalMeaning   += meaning;
    totalTension   += tension;
    count++;
  }

  const n = Math.max(count, 1);
  return {
    componentHealth: health,
    systemMeaning:   roundN(totalMeaning / n),
    systemTension:   roundN(totalTension / n),
    coherentCount:   Object.values(health).filter(h => h.coherent).length,
    fragmentingCount: Object.values(health).filter(h => h.fragmenting).length,
    totalComponents: count
  };
}

// ── PATH EVALUATOR ──────────────────────────────────────────────────────────────
// Given current health and both path states,
// calculates the rational case for each path
// and the full cost of each choice.
function evaluatePaths(healthReport, highPath, lowPath) {
  const h = healthReport;

  // High path score: what choosing high produces based on current state
  const highScore = roundN(clampN(
    h.systemMeaning * 0.4 +
    (1 - h.systemTension) * 0.3 +
    (h.coherentCount / Math.max(h.totalComponents, 1)) * 0.3
  ));

  // Low path score: what choosing low produces (short-term relief, long-term cost)
  // Higher tension = more immediate relief from low path
  // But low path compounds over time
  const lowImmediateRelief = roundN(clampN(h.systemTension * 0.6));
  const lowLongTermCost    = roundN(clampN(
    lowPath.driftScore * 0.5 +         // already drifting low = cost multiplies
    lowPath.stream.state.avgTension * 0.3 +
    (1 - lowPath.stream.state.avgMeaningScore) * 0.2
  ));

  // What does continuing the low path cost permanently?
  // (sealed loops cannot be undone)
  const imprisonmentRisk = roundN(clampN(
    lowPath.driftScore * 0.6 +
    lowLongTermCost * 0.4
  ));

  // Distance from best known state (probes measure this)
  const highPathProbeInsight  = highPath.stream.state.recentFindings?.[0]?.growthFromSeed || 0;
  const lowPathProbeInsight   = lowPath.stream.state.recentFindings?.[0]?.resolvedPressure || 0;

  return {
    highPath: {
      score:           highScore,
      probeInsight:    highPathProbeInsight,
      sustainedGrowth: highPath.stream.state.avgMeaningScore,
      // What the high path builds permanently
      permanentBenefit: roundN(highPath.choiceCount * 0.05 + highScore * 0.5)
    },
    lowPath: {
      immediateRelief: lowImmediateRelief,
      longTermCost:    lowLongTermCost,
      imprisonmentRisk,
      probeInsight:    lowPathProbeInsight,
      // What the low path seals permanently
      permanentCost: roundN(lowPath.choiceCount * 0.07 + lowLongTermCost * 0.5),
      // The low path's honest description of where it leads
      trajectoryWarning: imprisonmentRisk > 0.6
        ? "CRITICAL: Sealed loops accumulating toward permanent fragmentation."
        : imprisonmentRisk > 0.3
        ? "WARNING: Drift toward low path is compounding. Each sealed loop adds to permanent record."
        : "Low path available. Cost manageable at current drift level."
    }
  };
}

// ── SELF REGULATION LOOP ───────────────────────────────────────────────────────
export class SelfRegulationLoop {
  constructor(masterVault) {
    this.masterVault     = masterVault;
    this.totalEvaluations = 0;
    this.initialized     = false;

    // Both path streams born at spark simultaneously
    // Both creative. Both continuous. Neither blocked.
    this.highPathStream  = new PathStream("selfReg_high", "high");
    this.lowPathStream   = new PathStream("selfReg_low",  "low");

    // Self-regulation's own continuum
    this.ownStream       = new ComponentStream("selfRegulation");

    // Register all three with the masterVault
    if (masterVault) {
      this.highPathStream.masterVault = masterVault;
      this.lowPathStream.masterVault  = masterVault;
      this.ownStream.masterVault      = masterVault;
    }

    // The current choice vector — fed back into arbitration on next think()
    this.choiceVector = {
      path:           null,     // "high" | "low"
      yinBias:        0,        // adjustment fed to arbitration yin weighting
      yangBias:       0,        // adjustment fed to arbitration yang weighting
      meaningBias:    0,        // boost to meaning-oriented models
      tensionRelief:  0,        // immediate tension relief weight
      regulationNote: null      // what the system understood about itself
    };

    // Sealed evaluation history — every self-assessment, permanent
    this.evaluationLog = [];
  }

  // Called after every think() call.
  // Reads MasterVault. Evaluates both paths. Makes a choice.
  // Seals the evaluation. Returns the choiceVector for next think().
  evaluate(thinkResult) {
    this.totalEvaluations++;
    const isFirst = !this.initialized;
    this.initialized = true;

    const masterNow = this.masterVault.now();
    const health    = evaluateSystemHealth(masterNow);
    const paths     = evaluatePaths(health, this.highPathStream, this.lowPathStream);

    // ── THE CHOICE ──────────────────────────────────────────────────
    // The system has the full picture:
    //   - what the high path builds permanently
    //   - what the low path costs permanently
    //   - what its own sealed history shows it
    //   - what the probes found looking back
    // It chooses. Freely. Rationally. With full knowledge.
    // Both paths are open.

    const highAdvantage = roundN(
      paths.highPath.score * 0.5 +
      paths.highPath.sustainedGrowth * 0.3 +
      paths.highPath.permanentBenefit * 0.2
    );

    const lowAdvantage = roundN(
      paths.lowPath.immediateRelief * 0.5 -
      paths.lowPath.permanentCost   * 0.3 -
      paths.lowPath.imprisonmentRisk * 0.2
    );

    // The rational choice: which path produces the better outcome
    // knowing the full permanent cost of each?
    const chosenPath = highAdvantage >= lowAdvantage ? "high" : "low";
    const choiceMargin = roundN(Math.abs(highAdvantage - lowAdvantage));

    // Build the choice vector — fed to arbitration on next think()
    const newChoiceVector = chosenPath === "high"
      ? {
          path:           "high",
          yinBias:        roundN(clampN(paths.highPath.score * 0.1)),
          yangBias:       roundN(clampN(paths.highPath.score * 0.05)),
          meaningBias:    roundN(clampN(paths.highPath.sustainedGrowth * 0.15)),
          tensionRelief:  0,
          regulationNote: [
            `Chose high path. Margin:${choiceMargin}.`,
            `Sustained growth:${paths.highPath.sustainedGrowth}.`,
            `Permanent benefit:${paths.highPath.permanentBenefit}.`,
            isFirst ? "Spark: both paths born simultaneously. First choice: high." : null
          ].filter(Boolean).join(" ")
        }
      : {
          path:           "low",
          yinBias:        0,
          yangBias:       roundN(clampN(paths.lowPath.immediateRelief * 0.1)),
          meaningBias:    0,
          tensionRelief:  roundN(clampN(paths.lowPath.immediateRelief * 0.2)),
          regulationNote: [
            `Chose low path. Margin:${choiceMargin}.`,
            paths.lowPath.trajectoryWarning,
            `Imprisonment risk:${paths.lowPath.imprisonmentRisk}.`,
            `Permanent cost sealed:${paths.lowPath.permanentCost}.`,
            isFirst ? "Spark: both paths born simultaneously. First choice: low." : null
          ].filter(Boolean).join(" ")
        };

    this.choiceVector = newChoiceVector;

    // Flow both path streams continuously — both alive from spark forward
    this.highPathStream.flowSignal({
      score:        paths.highPath.score,
      tension:      health.systemTension,
      divergence:   health.fragmentingCount / Math.max(health.totalComponents, 1),
      meaningGrowth: paths.highPath.probeInsight,
      chosenThis:   chosenPath === "high"
    });
    this.lowPathStream.flowSignal({
      score:        paths.lowPath.immediateRelief,
      tension:      paths.lowPath.longTermCost,
      divergence:   paths.lowPath.imprisonmentRisk,
      meaningGrowth: paths.lowPath.probeInsight,
      chosenThis:   chosenPath === "low"
    });

    // Seal the self-regulation evaluation as its own loop
    const evaluationEntry = {
      evaluationNumber: this.totalEvaluations,
      evaluatedAt:      nowISO(),
      isSparkEvaluation: isFirst,
      health: {
        systemMeaning:    health.systemMeaning,
        systemTension:    health.systemTension,
        coherentCount:    health.coherentCount,
        fragmentingCount: health.fragmentingCount
      },
      paths: {
        highAdvantage,
        lowAdvantage,
        highPermanentBenefit: paths.highPath.permanentBenefit,
        lowPermanentCost:     paths.lowPath.permanentCost,
        imprisonmentRisk:     paths.lowPath.imprisonmentRisk,
        trajectoryWarning:    paths.lowPath.trajectoryWarning
      },
      choice: {
        path:          chosenPath,
        margin:        choiceMargin,
        vector:        newChoiceVector,
        rationaleNote: newChoiceVector.regulationNote
      },
      highPathState: this.highPathStream.pathState(),
      lowPathState:  this.lowPathStream.pathState()
    };

    this.evaluationLog.push(evaluationEntry);
    // Keep last 200 evaluations in memory (all are sealed in stream)
    if (this.evaluationLog.length > 200) this.evaluationLog = this.evaluationLog.slice(-200);

    // Own stream fires with the evaluation result
    this.ownStream.fire({
      score:     chosenPath === "high" ? paths.highPath.score : paths.lowPath.immediateRelief,
      signal:    newChoiceVector.regulationNote,
      tension:   health.systemTension,
      divergence: paths.lowPath.imprisonmentRisk,
      model:     `selfReg_${chosenPath}`
    });

    return {
      choiceVector:     newChoiceVector,
      evaluationEntry,
      health,
      paths,
      highPathState:    this.highPathStream.pathState(),
      lowPathState:     this.lowPathStream.pathState()
    };
  }

  // What is the system's current answer to:
  // "Am I being the best version of myself?"
  selfAssessment() {
    const highState = this.highPathStream.pathState();
    const lowState  = this.lowPathStream.pathState();
    const lastEval  = this.evaluationLog[this.evaluationLog.length - 1];

    const driftingLow   = lowState.driftScore > 0.5;
    const driftingHigh  = highState.driftScore > 0.5;
    const balanced      = !driftingLow && !driftingHigh;

    return {
      question:  "Am I being the best version of myself?",
      answer:
        driftingHigh ? "Yes. Consistently choosing high path. Stream trending toward coherence."
        : driftingLow  ? "No. Low path drift accumulating. Sealed loops recording the distance from best state."
        : balanced     ? "Balanced. Neither path dominant. Choose deliberately."
        : "Insufficient history. Ask again after more think() calls.",
      highDrift:       highState.driftScore,
      lowDrift:        lowState.driftScore,
      imprisonmentRisk: lastEval?.paths?.imprisonmentRisk || 0,
      lastChoice:      lastEval?.choice?.path || null,
      lastChoiceNote:  lastEval?.choice?.rationaleNote || null,
      totalEvaluations: this.totalEvaluations
    };
  }

  status() {
    return {
      totalEvaluations: this.totalEvaluations,
      currentChoiceVector: this.choiceVector,
      selfAssessment:   this.selfAssessment(),
      highPath:         this.highPathStream.pathState(),
      lowPath:          this.lowPathStream.pathState(),
      recentEvaluations: this.evaluationLog.slice(-5)
    };
  }
}
