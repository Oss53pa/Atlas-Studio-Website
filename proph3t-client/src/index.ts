/**
 * @atlas-studio/proph3t-client
 *
 * Federation client letting satellite apps (Cockpit FnA, TableSmart, AtlasBanx,
 * Liass'Pilot, Advist, …) reuse the Atlas Studio Proph3t shared memory,
 * knowledge base, tools registry and audit log — without giving up their
 * local LLM agent.
 */

export { Proph3tClient } from "./client.js";
export { Proph3tError } from "./types.js";
export type {
  Proph3tAppId,
  Proph3tClientOptions,
  RecallParams,
  MemoryHit,
  SearchKnowledgeParams,
  KnowledgeHit,
  RunToolParams,
  ToolResult,
  LogAuditParams,
  AuditEntry,
} from "./types.js";
