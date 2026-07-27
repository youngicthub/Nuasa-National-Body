---
name: Imported workflow naming
description: Runtime workflow names can differ from artifact metadata in imported Replit projects.
---

# Imported workflow naming

Imported projects can contain valid `.replit-artifact/artifact.toml` files while the active runtime still exposes the original workflow names rather than artifact-prefixed managed names.

**Why:** Restarting a guessed artifact-prefixed workflow failed even though the services were configured and running under the imported names.

**How to apply:** Check the active workflow list or workflow logs first. Restart the exact names currently registered, and do not create duplicate workflows solely to match artifact metadata.