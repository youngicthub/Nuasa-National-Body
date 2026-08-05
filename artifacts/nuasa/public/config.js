/**
 * NUASA runtime configuration
 * This file is loaded BEFORE the React bundle, so window.__NUASA_API_URL__ overrides
 * the build-time VITE_API_URL value in all API calls.
 *
 * On GO54 (static hosting): the API is hosted on Replit at the URL below.
 * Leave this value as-is — it points to the live Replit backend.
 *
 * To point at a different backend (e.g. local dev), change the URL here:
 *   window.__NUASA_API_URL__ = "http://localhost:8080/api";
 */
window.__NUASA_API_URL__ = "https://nuasa-national-body--marlemqas123.replit.app/api";
