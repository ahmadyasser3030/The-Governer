# Development, publication and recovery

## Local development

Use the existing isolated checkout `/workspace/The-Governer`; no worktree is needed. Node 20+ and Python 3 are sufficient. The current machine uses Node 24.19.0 and Python 3.12.14.

```sh
cd /workspace/The-Governer
npm ci --cache /workspace/.cache/npm
npm test
npm start
```

The server listens on port 4173. Use local HTTP requests only for internal onboarding validation, not as a user preview link. There is no production build step or runtime package install. Browser tests use `/usr/bin/chromium` by default; override with `GOVERNOR_CHROMIUM` if needed. With the server running, `npm run test:browser` runs real offline and responsive checks plus simulated cloud interactions. The test creates private synthetic files under ignored `test-results/`.

## Free static deployment

1. Run `python3 scripts/package.py` to build `/workspace/governor-delivery/governor-site.zip` and the complete delivery bundle. Only public app assets enter the hosting ZIP; no exports, sessions, tests or backups are published.
2. Review the candidate. Keep the existing deployment until the new version and real-data migration are approved.
3. Upload the hosting ZIP to a Free Cloudflare Pages Direct Upload project. No build command or function is needed. Do not enable paid products or attach a paid domain.
4. The owner enabled free GitHub Pages using “Deploy from a branch”, branch `governor-site`, folder `/(root)`. The live address is https://ahmadyasser3030.github.io/The-Governer/. That branch contains only public app assets. Update it with reviewed, tested assets to publish a website update. Diagnostic workflows in `governor-preview` do not replace an existing website.
5. Open the resulting HTTPS address on both devices, follow `cloud-setup.html` if syncing, and perform its live-device checklist. Publish a fresh candidate address before replacing an existing site.

The app works under a project subpath, including GitHub Pages. Asset URLs, manifest ID/scope/start URL and service-worker shell entries are relative.

## Offline and upgrades

The service worker caches only same-origin public shell assets. It does not cache authentication or cloud API responses. Each production asset update must also change the cache version in `sw.js`. The new worker waits for existing tabs to close, so an open app is not interrupted. Close all tabs, reopen online, verify the installed version and run the offline check on the phone. A first offline visit has no installed shell and cannot work.

The complete bundle also contains `governor-offline.html`, with CSS and JavaScript embedded. It works when opened directly on a laptop browser. File-origin storage can differ by path/browser; export before moving files. Mobile file preview applications often do not execute HTML apps, so use HTTPS hosting on a phone.

## Personal data backup

- Export a full JSON backup before upgrades, account changes, departure for military service and when practical each month.
- Keep two private copies. A website publication archive is not a backup of browser-held user data.
- Restore by importing the full export in the new app. Inspect real notes, tasks, legacy categories and monthly history before retiring the old version.
- For rollback, keep using the old site and its original export. The new cloud table is separate from the candidate's old table; do not delete either during review.
- Supabase Free can pause with low activity and does not provide downloadable managed backups. Resume through its dashboard when needed; retain independent exports.

## Publication and remaining connection

The source is saved on `governor-preview`; the public website is served from `governor-site`; the laptop HTML and website ZIP are saved in the Gold `governor-v2.0.0-gold` release (the earlier preview remains available). Main and the original Floot deployment were not replaced. The owner activated Pages in their account. All 14 browser workflows then passed against the actual HTTPS address, including offline reopening and 360-pixel layouts, on October 9, 2026.

The owner supplied the public project URL and publishable key, now in `connect.js`. They ran the owner-restricted SQL, created their app login, signed in on the laptop and confirmed live laptop-to-phone syncing on October 9, 2026. Their password and private sessions were never supplied to this workspace. Actual phone offline reopening, reverse-direction sync and independent unauthorized-user access tests remain unverified. The older public-cloud probe report predates table creation.

GitHub API requests from this workspace are blocked by its current egress policy; read-only website verification ran on the repository's GitHub Actions runner and saved results to `governor-publish-status`. The saved environment configuration prepares this workspace; publication of that cloud environment is separate from publishing the app website.

The source/interface are public; the SQL rules restrict cloud rows to the owner's email and user ID. Device copies remain visible after signing out, so do not treat sign-out as an app lock. A new account in the owner's project cannot sync under these rules. Someone else should configure their own cloud project rather than reuse the owner's account or project.

## Gold publication and rollback

`governor-before-gold-2026-10-09` retains the previous source. Before publishing, run the 18 core tests, 14 browser regression workflows and 11 Gold workflows, package the public files, and exercise the subpath and portable recovery copy. The static branch contains only the reviewed public files, not source backups, user exports or sessions. After publication, the live-site workflow compares app.js with the tested source, verifies the Gold hero/cache and runs the 25 browser workflows against the real URL.

To roll back, restore the public files corresponding to the backup source commit onto governor-site using a normal new commit; preserve unrelated public files. Use a fresh service-worker cache name even during rollback so an older cached shell does not remain active. This changes app files only; browser and cloud data remain on their respective devices/services. Export a JSON data backup before manual data repairs. Closing all Governor tabs and reopening online activates a waiting worker; do not clear browser data as an update procedure.

The deployed Gold version passed all 25 browser workflows on October 9, 2026; the direct result is `governor-gold-check.json` on governor-publish-status. The independent workflow uses the runner’s installed Chrome and does not depend on a Pages metadata request before testing the live URL. Source/app bytes were independently matched to the public deployment. Recovery files are saved in the Gold release.

## Final handoff deployment

Use the same governor-site root and GitHub Pages URL. New rollback branches: governor-before-handoff-2026-10-09 (source 6b807c9) and governor-site-before-handoff-2026-10-09 (published 85b7abc). The offline shell now caches profile.js; cache version governor-shell-v3-handoff-20261009. Close all app tabs on a device and reopen online to activate it, without clearing browser data.

Publish profile.js and multi-user.sql alongside the existing public files. No database change is part of deployment. Optional multi-user.sql is applied separately by the project owner in Supabase. New account workspaces do not implicitly adopt local-only records; export/import explicitly when moving them.
