// Re-export the Convex API and data model types from the shared convex/
// directory at the repo root. The website does not have its own convex/
// folder — it reuses the same backend and generated types as the mobile app.
export { api } from "../../../convex/_generated/api";
export type { Id } from "../../../convex/_generated/dataModel";
