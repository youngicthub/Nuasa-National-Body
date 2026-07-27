import * as zod from "zod";

/**
 * Zod schema for the health-check endpoint response.
 * Inlined from lib/api-zod – no workspace dependency needed.
 */
export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

export interface HealthStatus {
  status: string;
}
