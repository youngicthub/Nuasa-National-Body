---
name: MySQL 8.0 startup on Replit
description: The exact init + startup flag combination that works for embedded MySQL 8.0 in this project.
---

# MySQL 8.0 startup on Replit

## The working formula

**Initialize** WITHOUT `--innodb-undo-directory`:
```bash
mysqld --initialize-insecure \
  --datadir=/home/runner/.mysql-data \
  --basedir=/nix/store/s2lbn1axpc79kwnc829k5idkwabfq459-mysql-8.0.42 \
  --user=runner
```

**Start** WITH `--innodb-undo-directory` pointing to a **separate, initially empty** directory:
```bash
mysqld \
  --datadir=/home/runner/.mysql-data \
  --basedir=/nix/store/s2lbn1axpc79kwnc829k5idkwabfq459-mysql-8.0.42 \
  --innodb-undo-directory=/home/runner/.mysql-undo \
  --socket=/home/runner/.mysql-run/mysqld.sock \
  --mysqlx=OFF --user=runner ...
```

## Why

MySQL 8.0's `--initialize-insecure` places undo tablespace files in the datadir (not the undo dir). On the first real startup, mysqld tries to CREATE new undo tablespaces at the location specified by `--innodb-undo-directory`. If that directory is empty, it creates them there successfully. If any undo files already exist at that path (e.g. from a prior `--initialize` that used `--innodb-undo-directory`), it fails with "Can't create UNDO tablespace since ... already exists."

## Failure modes to avoid

- Initializing WITH `--innodb-undo-directory` then starting WITH the same flag → conflict
- Starting WITHOUT `--innodb-undo-directory` from the datadir as CWD → conflict (`./undo_001` already exists)
- Killing mysqld abruptly (SIGKILL or shell exit) corrupts the data directory → wipe and reinitialize

## How to apply

The startup script `scripts/start-api.sh` implements this. If MySQL fails to start in the workflow:
1. Stop the workflow
2. `rm -rf /home/runner/.mysql-data /home/runner/.mysql-undo /home/runner/.mysql-run`
3. Restart the workflow — the script reinitializes from scratch

## Data persistence

`/home/runner/.mysql-data` and `/home/runner/.mysql-undo` persist across workflow restarts but are lost on full Repl resets. The schema import is idempotent (checks table count before importing).
