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

## Gold extension (schema remains 1)

Goal records add optional scalar status (active, paused, completed, archived, deleted), tracking (manual, target, milestones), current/target/unit, nextAction, deadline and month1–3/month1Done–3Done. Existing active/progress fields continue to work. Editing saves independent original and revised snapshots as chunked `legacy` records with kind `goal-history`. This preserves both sides of concurrent goal edits even when the current goal resolves to the later version. Deletion is a tombstone; earlier versions and linked tasks remain.

Rescheduling uses `rolledFrom` and `carriedTo` and a deterministic destination ID per original action/date. The earlier dated instance stays saved and stops appearing as an additional parked action. Repeated two-device rescheduling to the same day merges into one destination.

Library entries optionally use entryType note/book/routine. Books store author, readingStatus, pagesRead and pagesTotal. Optional routine configurations use routineTarget; individual dated marks are independent `checkins` with kind routine, routineId and done, using stable IDs. Routine marks are excluded from action charts and ordinary end-of-day check-in counts. Reviews add optional period week/month; plan adds optional values. All fields remain scalar, so exports, validation and the existing cloud JSON table need no SQL migration.

## Final handoff extensions

Schema version and core collection names remain 1. Optional primitive fields include task minutes/legacyCompletion, goal horizon/monthNDate/monthNEvidence, note tags/goal/readingProgress and capture sourceTitle. Second Brain arrays map to editable collections; checks map to routine check-ins. Stable legacy IDs and complete source chunks remain recoverable. Imports lacking real completion timestamps do not create chart history.

`governor.profile.active.v1` names the current local or project/account workspace. `governor.profile.data.v1:<project>|<user>` stores its recoverable validated copy; `governor.os.v1` remains the current compatibility copy. Existing signed-in installs associate their previous data with that user. New sign-ins select a separate profile; unassigned local data must be explicitly exported/imported. Sessions/configuration stay outside exported state. Browser copies are not encrypted.

## Linked daily work (release r5)

Tasks retain the existing stable `goal` plan ID; an empty ID means Other. Optional goal `startDate` is an ISO local calendar date and `horizon` is 30 days, 90 days, 1 year, 3 years or 5+ years. Older goals without startDate use the existing sprint start date without rewriting the record. New or edited goals save an explicit start date. `planDayProgress` derives distinct completed dates inside each plan window, ignoring deleted tasks, future completions and legacy completions without known dates. It does not mutate progress, current, target or milestone fields. Year horizons use calendar anniversaries (February 29 clamps to February 28); 5+ years counts five years. Deadline remains an independent target date. Completion, reopening, reassignment, import and cloud merge recalculate the view. No new SQL, collection or counters are required. Captured-thought deletion uses the existing deleted tombstone and undo, so old cloud copies cannot resurrect deleted thoughts.

Parked priorities reuse tasks with `paused:true`; no separate collection. The visible lane includes parked and unfinished earlier actions, excluding completed/carried records. Adding parked work bypasses the focus limit. `focusParked` validates that the current group is finished or deliberately parked, then promotes 1–3 selected records (one in low-energy mode). Same-day promotion keeps the stable ID; older work uses existing carry history. Incomplete parked work contributes neither completion days nor the daily focus denominator.
