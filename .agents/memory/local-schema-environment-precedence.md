---
name: Local schema environment precedence
description: Prevents local development from accidentally using a remote database connection.
---

When the API startup script selects the local PostgreSQL fallback, it must remove remote database environment variables from the child process before the API starts.

**Why:** The startup script can successfully initialize and populate local PostgreSQL while the `pg` client still prefers an inherited `DATABASE_URL`, producing misleading missing-relation errors against a different schema.

**How to apply:** Keep local and remote database selection mutually exclusive. Verify the running API with public schema-backed endpoints after changing startup configuration.