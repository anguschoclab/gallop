"use strict";
/**
 * pipeline.ts - Pipeline execution framework
 *
 * This file provides the pipeline execution framework for day advancement,
 * including PipelineContext, PipelinePhase, and executePipeline function.
 *
 * Dependencies: @/game/types (GameState), @/game/rng (Rng), @/core/resolver/intents (AnyIntent), @/core/resolver/impacts/index (AnyImpact), @/core/resolver/resolver (ImpactLogEntry)
 * Related files: advance.ts (uses pipeline), phases/index.ts (provides phases)
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executePipeline = executePipeline;
exports.createPhase = createPhase;
/**
 * Execute pipeline phases in order.
 *
 * Phases are sorted by order field before execution.
 *
 * @param phases - Array of phases to execute
 * @param context - Initial pipeline context
 * @returns Final pipeline context after all phases execute
 */
function executePipeline(phases, context) {
    var sortedPhases = __spreadArray([], phases, true).sort(function (a, b) { return a.order - b.order; });
    var currentContext = context;
    for (var _i = 0, sortedPhases_1 = sortedPhases; _i < sortedPhases_1.length; _i++) {
        var phase = sortedPhases_1[_i];
        if (phase.skipIf && phase.skipIf(currentContext)) {
            continue;
        }
        currentContext = phase.execute(currentContext);
    }
    return currentContext;
}
/**
 * Create a pipeline phase from a function.
 *
 * @param name - Human-readable name of the phase
 * @param order - Execution order (lower runs first)
 * @param execute - The core execution function
 * @param skipIf - Optional predicate to skip this phase
 * @returns Complete PipelinePhase object
 */
function createPhase(name, order, execute, skipIf) {
    return { name: name, order: order, execute: execute, skipIf: skipIf };
}
