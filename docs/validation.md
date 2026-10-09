# Validation evidence

Tests ran in the actual cloud workspace using Node 24, Python 3 and system Chromium with Playwright. The report below distinguishes verified local behavior from external work still required.

On October 9, 2026, all 14 browser workflows also passed against the actual deployed HTTPS site, https://ahmadyasser3030.github.io/The-Governer/, in a GitHub Actions browser. The result reported `ready: true`, source branch `governor-site`, build status `built`, zero browser errors, and successful mobile and offline checks. Cloud tests in that run used a simulated API. The owner subsequently connected and confirmed live sync, as described below.

**Later owner verification on October 9:** the owner supplied a public project configuration, reported the private SQL setup succeeded, created an app-authentication user, and showed a signed-in laptop settings screen with no displayed sync error. After capturing a test item on the laptop and connecting the phone, the owner reported that it synced. This confirms the reported live laptop-to-phone workflow. It does not independently validate unauthorized-user denial, reverse-direction live sync or offline reopening on the owner's actual phone. The public connection key was separately accepted by the project's live auth settings endpoint. The older `governor-cloud-check.json` predates SQL setup and is stale.

## Verified

- 14 data-model tests: seed priorities, exact JSON round trip, independent-device merge, deterministic same-item conflicts, tombstones, monotonic clocks, non-punitive missed days, energy modes, calendar boundaries, malformed-backup rejection, full legacy field retention, stable repeated imports, malformed legacy categories and multi-chunk source reconstruction.
- 14 browser checks: primary action and three-priority limit, one-click completion/undo/reload, capture without leaving the workflow, retained focus timer, low-energy preservation, editing/additions, check-ins/reviews/milestones/horizon, Vault search/edit/archive, export/import and category access, 360-pixel layouts across all zones, missed days/rollover, offline reopening/completion/capture/export, unchanged old device storage during auto-migration, simulated two-device cloud exchange, and simulated offline edits plus a revision race.
- Actual offline test: service worker installed, browser networking disabled, app reloaded, action completed and thought captured, app reloaded again, stored changes confirmed and backup downloaded.
- Phone-sized settings and backup controls exercised; no horizontal overflow. No uncaught JavaScript errors in the recorded browser run.
- Additional targeted checks: project-subpath navigation/offline action completion and protection against overwriting unreadable original device storage.
- Portable embedded build served as one HTML file: networking disabled after loading; completion, capture, weekly review and persisted reload passed with zero external asset requests. ZIP integrity and absence of test exports/credential files were checked.

Screenshots and machine-readable synthetic results are in ignored `test-results/`. They do not contain the user's actual personal data. The completed delivery contains no test exports or authentication sessions.

## Acceptance criteria and limits

| Criterion | Evidence / status |
| --- | --- |
| Primary action identifiable within five seconds | Concrete action visible in the first viewport; browser verified visibility. Human comprehension timing remains a user usability check. |
| Complete with one interaction | Tested through the primary completion button. |
| Capture without abandoning work | Inline and modal captures tested; current zone and timer retained. |
| Weekly review around 15 minutes | Three five-minute prompts implemented; form save/persistence tested. Real completion duration is not measured. |
| Skip days without overdue overload | No automatic pileup; optional parked-action selection tested. |
| Export and restore | Real download/import round trip plus legacy fixtures tested. |
| Small mobile screen | Chromium at 360×800; other device/browser checks remain. |
| Existing data survives upgrade | Full synthetic legacy round trip and unchanged old storage tested. Actual user exports were not supplied, so their migration is not yet verified. |
| No paid core subscription | Runtime uses browser APIs only. Official free-tier documentation checked; no paid provider features invoked. |
| Offline behavior explicitly tested | Network-disabled reload and functional edits/export passed in Chromium. Initial caching and a compatible browser are prerequisites. |

## Not yet verified or performed

- Independently agent-verified live SQL/authentication, unauthorized-user access denial or reverse-direction phone/laptop sync. The owner confirmed applying SQL, signing in and receiving the laptop's test capture on the phone; no private user session was supplied to the workspace. Earlier simulated cloud tests are separate evidence.
- Actual Safari/iPhone and Android installation or OS storage retention during long absences.
- Replacement of the original Floot app. The new candidate is online separately; its source and openable laptop download are saved on GitHub.
- Actual personal-data migration from Floot or another website.
- Permanent free-provider availability or guarantees against project pausing.
- Direct `file://` opening of the portable HTML: the cloud-managed browser blocks local-file navigation. Its embedded code can be exercised through a local server with networking disabled after loading; this is distinct from testing a user's laptop file-opening policy.

The new website is published and tested. The owner connected their own project and confirmed live laptop-to-phone sync. Environment snapshot publication is separate from website deployment.

## Gold upgrade — October 9, 2026

- 18 core tests passed, including concurrent goal-version retention, measurable and milestone progress, deterministic rollover identities, actual completion dates and reopen counts.
- All 14 existing browser regression workflows passed after the upgrade. Their cloud cases use a simulated Supabase API with two independent browser contexts, offline changes and an injected revision race.
- 11 additional Gold workflows passed: generated hero/crown/assets; goal create/targets; pause/archive/reactivate/complete/delete confirmation and undo/history; dated calendar scheduling/rescheduling; weekly/monthly charts reacting to completion/reopen; book page tracking and note deletion undo; dated optional routines excluded from action statistics; monthly review/values/global search/guide; full backup round trip of extended records; 360px layouts and network-disabled hero/capture/reload; old schema, edited note and connection/session compatibility fixtures.
- The packaged website is separately exercised at `/The-Governer/`, checking the actual deployment subpath and offline cache asset resolution.
- The portable Gold HTML embeds the optimized hero and scripts/styles. Completion, capture and goal creation worked after networking was disabled, with zero external asset requests. This tests embedded operation via an internal HTTP server; direct file-opening browser policies remain untested.
- Fast-input testing also exposed a delayed modal-focus race; modal focus is now synchronous so it cannot steal typing after a form opens.
- The deletion-undo test found that a tombstone flag could remain on a restored note. Undo now explicitly clears that flag, and the test verifies restoration.
- Existing cloud.js, migration.js, setup.sql and public connection details are unchanged. No new SQL setup or sign-in is required for existing connected browsers. Storage keys and schema version remain unchanged. Fixture tests verify compatibility; actual owner records and private login sessions were not supplied to this workspace.

The GitHub Actions live-site report is `governor-publish-status:governor-website-check.json`. It compares deployed app.js with the source commit and verifies the Gold cache and hero before running the 25 browser workflows. Do not infer success from deployment alone; check the sourceCommit, browserResult and goldChecks in the fresh report. Live owner-authenticated cross-device behavior, unauthorized authenticated-user RLS denial and actual Safari/Android OS behavior cannot be independently verified without account/device access. The owner’s earlier successful live-sync report is separate from simulated automated evidence.

### Confirmed deployed Gold result

On October 9, 2026 at 09:51 UTC, workflow [37913886569](https://github.com/ahmadyasser3030/The-Governer/actions/runs/37913886569) completed the 18 core tests and all 25 browser workflows against the actual HTTPS website. Both browser reports show zero errors; the live Gold report has testResult success and sourceCommit 190cd380a14f5f3f6eb1fc21fad02a00939c3c5d. The public deployment is 85b7abc286a9a6c9f0d21215633e22252757de89. A separate public-site probe confirmed HTTP 200 and that hosted app.js exactly matches the tested source (SHA-256 adef7844f249e11495e4aa6c6350c87a5afdd4478f63b849ea3fe9c2928ce597).

The fresh `governor-publish-status:governor-gold-check.json` is the direct full-workflow evidence. The older metadata-based verification also subsequently succeeded after request timeouts were added. The recovery downloads are published in the Gold release; Governor.html is 242,523 bytes and the static-site ZIP is approximately 149 KB compressed.

The live public Supabase probe at 09:34 UTC confirmed the publishable key was accepted, email authentication was enabled, the table existed, and anonymous SELECT was denied with HTTP 401 / code 42501. It used limit=0 and read no private records. Owner-authenticated live sync and unauthorized authenticated-user denial were not independently retested. The owner’s previous live laptop-to-phone confirmation remains the available real-account evidence.

## Final handoff checks — October 9, 2026

- 23 core/profile tests: original 18 plus complete Second Brain field migration and four profile preservation/isolation/corruption/partial-write checks.
- Existing 14 browser and 11 Gold workflows retained. New handoff workflows cover approved composition at 1536px, responsive 360/390/768/1024px, task durations/deletion/undo, focus controls, dated milestone evidence/chart/calendar, tagged goal-linked note conversion without duplication, real Second Brain JSON import/edit/export, and switching two accounts plus two tabs without mixing data (simulated API).
- Full original Second Brain HTML was audited. A synthetic test fixture based on its starter data checks status=Done, links, reading percentage, habit date checks, values, reviews and source reconstruction. No private owner export was supplied.
- Live authenticated account separation, actual two-account RLS execution and Supabase migration are unverified. The published database policies are not changed by static deployment. Optional settings setup provides exact SQL, leaving rows and revision checks untouched. Existing owner cloud configuration/session compatibility tested with synthetic fixtures; owner previously reported live sync success.
- Physical phones, Safari installation, browser storage retention over months and the human 2–5-minute daily-use target are not independently tested.

### Confirmed live handoff workflows

The deployed handoff passed 23 core/profile tests and all 32 browser workflows (14 original, 11 Gold, 7 handoff) against the actual HTTPS site on 2026-10-09 at 11:47 UTC. Report source 5cd5a23885771261fdc9daa0027d64ab69d89282; workflow https://github.com/ahmadyasser3030/The-Governer/actions/runs/37925811745. All browser reports contain zero JavaScript errors. The final published-branch CSS polish is retained and receives a fresh publication check. Core private-cloud tests remain simulated, not authenticated live RLS verification.

## Stale installed-shell fix — October 9, 2026

The owner's screenshot exposed an upgrade path missing from earlier fresh-profile checks: a network-first newer index.html was paired with older cache-first unversioned CSS/modules. The earlier worker also waited for all existing clients to close. The exact cream CSS / new crown HTML mismatch was reproduced using the real earlier Git assets at the `/The-Governer/` path.

Release 20261009-r3 versions all application module imports, entry styles and hero assets, installs one complete public shell using HTTP-cache reload, and serves a coherent installed index. The inline recovery page `update.html` bypasses shell caching, checks the active release via MessageChannel, and keeps user storage, profiles and credentials untouched. No private/cloud API response is added to the shell.

23 model/profile tests, 14 browser workflows, 11 Gold workflows and 7 handoff workflows passed locally after the change. Four new update workflows passed: reproduce the screenshot's cache mismatch; upgrade with another old tab still open and exact saved-record/config/session preservation; mobile/offline edit and reload after upgrade; normal upgrade from the previous Gold worker. Test data and login tokens are synthetic. The test validates fixtures before use. Physical owner devices and private cloud account access remain unavailable. The publication workflow additionally tests the actual HTTPS update link before marking the live result successful.

The live HTTPS publication check succeeded at 2026-10-09T12:18:37Z for source 3cc3ff4eff9a792d3485f7e5dcb6295d08b2bfa9, public b10f6643721a1b879bdf7703f34ded16bd0d677c, workflow https://github.com/ahmadyasser3030/The-Governer/actions/runs/37929011474. All 23 core/profile tests and 37 browser workflows passed (14 original, 11 Gold, 7 handoff, 5 updater), with zero JavaScript errors. The live updater redirected to the current Gold edition and then reopened offline. Workspace Chromium's live-site connection rejected the inspection-proxy certificate; TLS verification was kept enabled and GitHub Actions provided the live-browser evidence instead.

## Editable main areas — October 9, 2026

Release 20261009-r4 adds per-account area shortcut records to the existing settings collection, retaining schemaVersion 1 and the original six defaults. Manage areas is accessible beside the sidebar heading on desktop and through Settings on mobile. Areas can be added, renamed, given an icon, removed from the sidebar and restored. Stable topic identifiers retain note categories and all goal/task history; labels change without rewriting note records. Removed topics remain searchable in Library. These settings use existing profile isolation, JSON backup/import and recordwise cloud synchronization. No database migration or paid service was introduced.

The 23 core/profile tests, 14 existing browser workflows, 11 Gold workflows, 7 handoff workflows and 4 historical-cache upgrade workflows passed locally. Six additional browser workflows cover new-area/topic persistence; rename without rewriting notes/goals; default/custom removal and restoration with undo; backup restoration without duplicate notes; editing on a 360px screen offline with reload; and merging area settings between two sessions plus separate accounts using a simulated cloud API. The publication workflow also runs all area cases against the actual HTTPS website. Physical devices and authenticated live owner data remain unavailable to this workspace.

## Linked plans and parked priorities — October 9, 2026

Release 20261009-r5 connects the Supports selector to all saved plans plus Other. Daily plan execution is derived from distinct saved completion dates inside each plan’s horizon, including a new 30-day option and calendar-year windows. Existing target/milestone/manual outcome progress remains separate. Thought deletion is available in the inbox, archive and editor, with a reachable undo button inside the modal. A visible Parked priorities lane accepts extra tasks with Supports; selecting the next group of up to three unlocks after the focused group is finished or deliberately parked. Tasks are reused, not copied on same-day promotion.

27 model/profile tests pass locally. New browser suites cover seven linked-plan workflows and four parked-priority workflows alongside the existing suites. The publication workflow runs the same checks against the exact deployed source; its fresh report records the commit and test target. Real authenticated owner data and live two-account Supabase RLS remain unavailable; cloud sessions are simulated in automated tests.
