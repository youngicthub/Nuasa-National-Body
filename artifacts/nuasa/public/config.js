/**
 * NUASA runtime configuration
 * Edit this file on your hosting server to point the frontend at the correct API.
 * This file is loaded BEFORE the React bundle, so window.__NUASA_API_URL__ overrides
 * the build-time VITE_API_URL value in all API calls.
 *
 * On GO54 (static hosting): set __NUASA_API_URL__ to your Replit backend URL, e.g.:
 *   window.__NUASA_API_URL__ = "https://your-api.replit.app/api";
 *
 * Leave it as an empty string to use the same-origin relative path "/api"
 * (works when the frontend and backend are on the same domain / behind a proxy).
 */
window.__NUASA_API_URL__ = "";
