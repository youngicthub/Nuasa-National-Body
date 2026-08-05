/**
 * NUASA runtime configuration
 *
 * This file is loaded BEFORE the React bundle and overrides the API base URL.
 * In development (Replit), leave window.__NUASA_API_URL__ unset so the
 * Vite dev-server proxy handles /api → localhost:8080 automatically.
 *
 * On afeeshost / GO54 (static hosting), set this to the live Replit backend:
 *   window.__NUASA_API_URL__ = "https://nuasa-national-body--everyoungdan200.replit.app/api";
 */
// window.__NUASA_API_URL__ = "https://nuasa-national-body--everyoungdan200.replit.app/api";
