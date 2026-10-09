# The Governor

A free, personal, offline-capable web app that reduces daily planning to a concrete next action. Responsive on phone and laptop; no runtime dependencies or paid AI.

**Open the app:** https://ahmadyasser3030.github.io/The-Governer/

The owner enabled free GitHub Pages hosting from `governor-site`. The actual HTTPS website passed all 14 browser workflows on October 9, 2026, including mobile layout, persistence, backup restoration and network-disabled reopening. The owner subsequently ran the private storage setup, created their app login, signed in on the laptop, and confirmed that the laptop's test capture appeared on their phone. Reverse-direction sync and actual phone offline reopening have not separately been reported.

- **Tunnel:** at most three priorities, one-click completion, thought capture, an optional focus timer, short check-ins and gentle low-energy/maintenance modes.
- **Compass:** BAUER, KAITECH and personal capacity outcomes, evidence-based milestones, weekly reviews, 1/3/5-year Why, military planning horizon and monthly history.
- **Vault:** searchable practical reference cards and your own notes covering all discussed interests. Legacy categories remain preserved and accessible.

`npm start` serves the app; `npm test` runs the data tests. Run `npm ci --cache /workspace/.cache/npm` for development tools. With the server running and Chromium installed, `npm run test:browser` verifies the UI, offline workflow and simulated cloud conflicts.

Run `python3 scripts/package.py` for a static hosting ZIP and a standalone offline HTML copy. No bundler is needed for hosting. Private cloud sync uses the owner's free Supabase project; `connect.html` saves its public connection details on each device. The owner's live laptop-to-phone sync was confirmed by the user, not by supplying an authentication session to this workspace. The original Floot deployment was not modified.

**Privacy:** the site and source are public; cloud records require an authenticated account under the installed row-level rules. Existing owner-only cloud sync is retained. Browser workspaces are separated by project/account; signing out hides the account's records and signing back in restores them. Copies are not encrypted, so lock your device. Additional cloud accounts require the optional `multi-user.sql` permissions upgrade in Settings; actual live two-account isolation has not been verified.

See the [short user guide](docs/guide.html), [cloud connection guide](docs/cloud-setup.html), [audit](docs/audit.md), [backup format](docs/data-format.md), [deployment and recovery instructions](docs/deployment.md), [verified free-tier limits](docs/free-tier.md), and [validation evidence](docs/validation.md).

## Gold Edition

Published at the same website. All 18 core tests and 25 browser workflows passed against the deployed Gold app on October 9, 2026, including 360px layouts, offline reopening, real-data chart updates and backup restoration. See `governor-publish-status:governor-gold-check.json` for fresh evidence. Cloud cases in automated tests use a simulated API; the owner previously confirmed live syncing.

One app with Today, Plans and Library: crown branding, generated local construction hero, up to three daily actions, quick capture, optional timer and check-in, goal lifecycle and retained history, real targets and monthly milestones, weekly/monthly execution chart, active-goal progress chart, calendar scheduling, categorized notes, book reading progress, optional routines, core values and weekly/monthly reviews. Cloud and backup formats remain compatible; no runtime packages, paid services or new cloud setup are required for an already-connected device.

Run `npm run test:gold` for the additional lifecycle, calendar, charts, library, compatibility, backup and mobile/offline workflows. Close all Governor tabs and reopen online after publication to activate the updated offline cache.

## Final handoff integration

The approved dashboard composition now includes the crown, construction hero, duration selector, three priorities, date/progress, four quick actions and exactly two charts from real records. Tasks include durations, deletion confirmation and undo. Plans retains editable targets and history and adds milestone dates/evidence and goal horizons. Library supports tags, goal links and note-to-priority conversion. Second Brain JSON imports map its real tasks/statuses, goals/links, books, routine checks, notes, values and weekly/monthly/daily reviews into editable records; no legacy source is discarded. Undated old completions are excluded from charts.

Run `npm test`, `npm run test:browser`, `npm run test:gold` and `npm run test:handoff`. The new account tests use a simulated service; actual Supabase administration is not available to the coding workspace. See docs/handoff-audit.md for the feature inventory and rollback branches.
