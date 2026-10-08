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
4. Alternatively, enable GitHub Pages with source “GitHub Actions” and trigger the supplied workflow manually from the reviewed branch. It does not deploy automatically on pushes. GitHub account/repository eligibility must be checked.
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

## What is not published or connected here

No hosting account credentials or Supabase project configuration were supplied. The GitHub read operation succeeded, while GitHub API access was blocked by the environment's egress policy. No remote push, deployment, database creation or real cross-device sync was performed. The saved environment configuration prepares this workspace; publication of that cloud environment is separate from publishing the app website.
