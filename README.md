# The Governor

A free, personal, offline-capable web app that reduces daily planning to a concrete next action. Responsive on phone and laptop; no runtime dependencies or paid AI.

- **Tunnel:** at most three priorities, one-click completion, thought capture, an optional focus timer, short check-ins and gentle low-energy/maintenance modes.
- **Compass:** BAUER, KAITECH and personal capacity outcomes, evidence-based milestones, weekly reviews, 1/3/5-year Why, military planning horizon and monthly history.
- **Vault:** searchable practical reference cards and your own notes covering all discussed interests. Legacy categories remain preserved and accessible.

`npm start` serves the app; `npm test` runs the data tests. Run `npm ci --cache /workspace/.cache/npm` for development tools. With the server running and Chromium installed, `npm run test:browser` verifies the UI, offline workflow and simulated cloud conflicts.

Run `python3 scripts/package.py` for a static hosting ZIP and a standalone offline HTML copy. No bundler is needed for hosting. Private cloud sync is implemented using a user-owned free Supabase project; it is **not connected in this delivery**. Live account and row-level security validation are still required. The original deployment was not modified.

See the [short user guide](docs/guide.html), [cloud connection guide](docs/cloud-setup.html), [audit](docs/audit.md), [backup format](docs/data-format.md), [deployment and recovery instructions](docs/deployment.md), [verified free-tier limits](docs/free-tier.md), and [validation evidence](docs/validation.md).
