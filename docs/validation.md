# Validation evidence

Tests ran in the actual cloud workspace using Node 24, Python 3 and system Chromium with Playwright. The report below distinguishes verified local behavior from external work still required.

On October 9, 2026, all 14 browser workflows also passed against the actual deployed HTTPS site, https://ahmadyasser3030.github.io/The-Governer/, in a GitHub Actions browser. The result reported `ready: true`, source branch `governor-site`, build status `built`, zero browser errors, and successful mobile and offline checks. Cloud tests in that run still used a simulated API; the user's live Supabase project has not been connected.

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
