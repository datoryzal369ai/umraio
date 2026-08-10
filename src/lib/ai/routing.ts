import type { AiTaskType, TaskClass } from "./types";

/**
 * Task routing table.
 *
 * "deterministic" work (pricing, quotation maths, permissions, booking status,
 * validation) is intentionally absent: it must never reach a model. The
 * decision gate enforces that separately.
 */
const TASK_CLASS: Record<AiTaskType, Exclude<TaskClass, "deterministic">> = {
  intent_classification: "fast",
  language_detection: "fast",
  entity_extraction: "fast",
  message_tagging: "fast",
  faq_classification: "fast",

  customer_reply: "reasoning",
  objection_handling: "reasoning",
  package_recommendation: "reasoning",
  next_best_action: "reasoning",
  conversation_analysis: "reasoning",
  conversation_evaluation: "reasoning",
  business_decision: "reasoning",
  content_generation: "reasoning",
};

export function classifyTask(taskType: AiTaskType): Exclude<TaskClass, "deterministic"> {
  return TASK_CLASS[taskType] ?? "reasoning";
}

/** Operations that must stay in application code, never delegated to a model. */
export const DETERMINISTIC_OPERATIONS = [
  "quotation_calculation",
  "package_pricing",
  "arithmetic",
  "database_validation",
  "permission_check",
  "authentication",
  "payment_status",
  "booking_status",
  "system_constraint",
] as const;

export type DeterministicOperation = (typeof DETERMINISTIC_OPERATIONS)[number];

export function isDeterministicOperation(name: string): name is DeterministicOperation {
  return (DETERMINISTIC_OPERATIONS as readonly string[]).includes(name);
}
