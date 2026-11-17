/**
 * Global route prefix: every Nest route (UI API, authentication, health, `@nestjs/mcp`'s endpoint) lives under it, set
 * once by `setupApplication` (`app.setGlobalPrefix`). Controllers declare their path without it.
 */
export const API_PREFIX = "api";

/** Path of the MCP endpoint (`@nestjs/mcp`'s default, `mcp`, below the global prefix). */
export const MCP_PATH = `/${API_PREFIX}/mcp`;

/** Path of the health endpoint. */
export const HEALTH_PATH = `/${API_PREFIX}/health`;
