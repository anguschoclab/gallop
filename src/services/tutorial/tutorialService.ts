/**
 * tutorialService.ts - Service facade for tutorial step derivation
 *
 * Components must not import from @/core directly. This service re-exports
 * the tutorial step derivation functions so components can consume them
 * without a layering violation.
 */

export {
  deriveTutorialStep,
  tutorialStepToAction,
  type TutorialStep,
} from "@/core/tutorial/deriveTutorialStep";
