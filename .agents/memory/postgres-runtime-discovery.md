---
name: PostgreSQL runtime discovery
description: Keeps local NUASA PostgreSQL startup resilient across Replit runtime refreshes.
---

Local PostgreSQL tools are provided through a Replit-managed Nix runtime path whose store hash can change between environment refreshes.

**Why:** A hard-coded historical store path caused the API workflow to fail before initialization, even though `initdb`, `postgres`, `pg_isready`, and `psql` were installed under a newer path.

**How to apply:** Resolve the runtime directory dynamically by checking candidate Nix `*-replit-runtime-path/bin` or PostgreSQL bin directories for an executable `initdb` before starting the local database.