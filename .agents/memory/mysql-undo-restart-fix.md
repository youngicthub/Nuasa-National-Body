---
name: MySQL 8.0 undo tablespace restart fix (Replit Nix)
description: MySQL 8.0.42 on this Nix build runs srv_undo_tablespaces_create() on EVERY startup and aborts if undo_* files already exist. Fix: delete them before every mysqld start.
---

## Rule
Always `rm -f "$MYSQL_DATADIR"/undo_*` in the **cleanup block that runs before every `mysqld` start** — not just after `--initialize`, and not conditionally.

**Why:** MySQL 8.0.42 on this Replit Nix build calls `srv_undo_tablespaces_create()` on every startup, not only on fresh init. If `undo_001`/`undo_002` exist in the datadir it aborts with `Can't create UNDO tablespace since './undo_001' already exists`. After a clean shutdown undo logs are empty, so deleting the files is safe — mysqld recreates them with the same fixed space-IDs (0xFFFFFFFE / 0xFFFFFFFD) each time, keeping the data dictionary consistent.

**How to apply:** In `scripts/start-api.sh`, the pre-start cleanup block (step 2) must include `rm -f "$MYSQL_DATADIR"/undo_*`. Do NOT use a separate undo directory (`--innodb-undo-directory`) — mixing init (no flag) with start (with flag) causes the opposite crash ("Could not find any file associated with the tablespace ID").

## Anti-patterns that cause crashes
- **`--innodb-undo-directory` + init without it**: data dictionary references files in the external dir, subsequent deletion causes "tablespace ID not found".
- **Not deleting undo files before every start**: `srv_undo_tablespaces_create()` finds existing files and aborts.
- **Deleting the entire datadir to recover**: also wipes all user tables; only valid for full reinit.
