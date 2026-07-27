---
name: Artifact-managed workflows
description: How imported services should be run after artifact registration
---

Artifact-managed workflows are the canonical runners for registered services. Do not keep duplicate legacy workflows for the same frontend or API; they can remain failed or conflict with the artifact-provided ports and routing.

**Why:** Imported projects may retain older workflow definitions after artifact metadata is generated, which makes the workspace appear unhealthy even when the artifact services are running correctly.

**How to apply:** Prefer the exact `artifacts/<name>: <service>` workflow names and their injected `PORT`/routing configuration. Remove obsolete duplicate workflows rather than modifying them into a second runner.