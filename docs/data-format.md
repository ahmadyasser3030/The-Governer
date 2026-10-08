# Data and backup format

The new device key is `governor.os.v1`; the old `governor-data` key is never deleted. A separate random device identifier supports deterministic conflict resolution.

Restorable exports are UTF-8 JSON:

```json
{
  "format": "governor-backup",
  "version": 1,
  "exportedAt": "2026-10-08T18:00:00.000Z",
  "data": {
    "schemaVersion": 1,
    "tasks": {}, "captures": {}, "notes": {}, "goals": {},
    "reviews": {}, "checkins": {}, "settings": {}, "legacy": {}
  }
}
```

Each collection is an object keyed by stable record ID. Every record has `id`, a monotonic numeric `updatedAt` and a `device` ID. Additional fields are scalar values. The merge picks the later timestamp, breaking ties by device ID. Independent records merge; concurrent edits to the same record use the later complete record. There is no per-field conflict editor. Soft archives and deletion tombstones prevent removed records from reappearing after sync.

- Tasks: `title`, `action`, `goal`, planned `date`, `done`, optional `completedAt`, `paused`, `order`. Bringing an older action into today parks the old record and creates a new daily instance, preserving the earlier month's plan. Monthly completed-action history uses completion date when available.
- Captures: `text`, `date`, `archived`.
- Notes: `title`, `category`, `body`, `url`, `archived`.
- Goals: `title`, `subtitle`, `outcome`, `milestone`, `progress` (0–100), `evidence`, `active`.
- Reviews: `date`, `wins`, `obstacles`, `next`, `archived`.
- Check-ins: `date`, `note`, `energy`.
- Settings: `plan` (start/horizon/military/Why fields), `mode` (normal/low/maintenance).
- Legacy: readable copies of each old record with original JSON in `body`. Source archives are split into ordered chunks; concatenating their bodies reconstructs the complete original import. The app exposes a source-export action.

Imports validate structure and size before mutation, download a pre-import backup and merge rather than wipe existing records. A monthly report is an analysis/export file, not a restorable full backup; the buttons distinguish them.

Authentication sessions, public cloud connection settings, timer state and capture drafts are stored outside the restorable data document. New sign-in passwords are never persisted. Exported original legacy sources intentionally preserve all fields present in that source; review them before sharing.

The hosted app cannot read browser storage belonging to another website. Export JSON on the old site and import it here. Automatic migration applies only when `governor-data` exists in this app's origin. Existing V2 cloud payloads are read only when the new table is empty and the same project/account is connected; the old cloud table is never written by this version.
