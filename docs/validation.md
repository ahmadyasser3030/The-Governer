# Validation evidence

Tests ran in the actual cloud workspace using Node 24, Python 3 and system Chromium with Playwright. The report below distinguishes verified local behavior from external work still required.

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

- Live Supabase sign-in, SQL execution, unauthorized-user access denial, or phone/laptop sync against the user's project. Cloud API responses were simulated; they do not prove live cloud readiness.
- Actual Safari/iPhone and Android installation or OS storage retention during long absences.
- Public HTTPS website deployment, GitHub push, or replacement of any original Floot app.
- Actual personal-data migration from Floot or another website.
- Permanent free-provider availability or guarantees against project pausing.
- Direct `file://` opening of the portable HTML: the cloud-managed browser blocks local-file navigation. Its embedded code can be exercised through a local server with networking disabled after loading; this is distinct from testing a user's laptop file-opening policy.

The app files are prepared and tested locally. Hosting and live private sync require a user-owned account and its public project configuration. Do not treat environment snapshot publication as website deployment.
