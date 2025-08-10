/**
 * Help System Components
 *
 * Default exports use lazy loading for optimal performance.
 * Use direct imports from individual files if you need non-lazy versions.
 */

// Export lazy-loaded components by default
export {
  HelpProvider,
  useHelp,
  ContextualHelpPanel,
  HelpTooltip,
  InteractiveTutorial,
  HelpSystemDemo,
  HelpIntegratedFlow,
} from "./lazy-help-components";

// Export types
export type {
  HelpContent,
  HelpContext,
  UserExperience,
  InteractiveTutorial as InteractiveTutorialType,
  TutorialStep,
  HelpTrigger,
} from "@/lib/help/help-types";
