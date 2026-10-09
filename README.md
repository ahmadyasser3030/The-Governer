# The Governor

A free, personal, offline-capable web app that reduces daily planning to a concrete next action. Responsive on phone and laptop; no runtime dependencies or paid AI.

**Open the app:** https://ahmadyasser3030.github.io/The-Governer/

The owner enabled free GitHub Pages hosting from `governor-site`. The actual HTTPS website passed all 14 browser workflows on October 9, 2026, including mobile layout, persistence, backup restoration and network-disabled reopening. The owner subsequently ran the private storage setup, created their app login, signed in on the laptop, and confirmed that the laptop's test capture appeared on their phone. Reverse-direction sync and actual phone offline reopening have not separately been reported.

- **Tunnel:** at most three priorities, one-click completion, thought capture, an optional focus timer, short check-ins and gentle low-energy/maintenance modes.
- **Compass:** BAUER, KAITECH and personal capacity outcomes, evidence-based milestones, weekly reviews, 1/3/5-year Why, military planning horizon and monthly history.
- **Vault:** searchable practical reference cards and your own notes covering all discussed interests. Legacy categories remain preserved and accessible.

`npm start` serves the app; `npm test` runs the data tests. Run `npm ci --cache /workspace/.cache/npm` for development tools. With the server running and Chromium installed, `npm run test:browser` verifies the UI, offline workflow and simulated cloud conflicts.

Run `python3 scripts/package.py` for a static hosting ZIP and a standalone offline HTML copy. No bundler is needed for hosting. Private cloud sync uses the owner's free Supabase project; `connect.html` saves its public connection details on each device. The owner's live laptop-to-phone sync was confirmed by the user, not by supplying an authentication session to this workspace. The original Floot deployment was not modified.

**Privacy:** the website and source are public; personal cloud rows require the owner's login under the supplied row-level rules. The app also stores a local browser copy for offline work. Signing out does not lock, hide or erase that device copy. Use a private browser profile on a device you control. Other users can use the public interface locally or configure their own project; their accounts in the owner's project cannot sync under the owner-email rules.

See the [short user guide](docs/guide.html), [cloud connection guide](docs/cloud-setup.html), [audit](docs/audit.md), [backup format](docs/data-format.md), [deployment and recovery instructions](docs/deployment.md), [verified free-tier limits](docs/free-tier.md), and [validation evidence](docs/validation.md).
