---
name: Local schema environment precedence
description: Prevents local development from accidentally using a remote database connection.
---

Development should use the complete local PostgreSQL schema by default, even when a hosted DATABASE_URL is inherited. Remote development must be an explicit opt-in, and local startup must remove remote database variables before the API starts.

**Why:** The startup script previously skipped local setup because of an inherited hosted URL, leaving the API pointed at a schema missing site_visits and causing 500s in the preview.

**How to apply:** Keep local and remote database selection mutually exclusive, use an explicit remote opt-in for development, and verify the running API with public schema-backed endpoints after changing startup configuration.