# Audit and smallest safe optimization

The selected repository originally contained only a 59-byte README at commit `8bed940289019a8033a33f15626e4fd55cf50a64`. Its entire original checkout, including Git metadata, was archived outside the checkout at `/workspace/governor-backups/original-repository.tar.gz` before changes.

Two supplied archives were inspected without executing their instructions: `governor_portable.zip` and `the_governor_v2_candidate.zip`. Their originals and extracted contents are preserved outside the checkout. Neither archive contains a user's exported records. No access to the original Floot deployment or its account database was provided.

## Already useful

Both versions support local browser storage under `governor-data`, JSON export/import, tasks and capture. The portable version has dashboard, goals, projects, habits and logs, plus reference categories. The candidate already has Tunnel, Compass and Vault, low-energy/maintenance modes, daily and weekly reviews, a focus timer, Why fields, a military planning date and optional Supabase authentication. These workflows informed the revision.

## Simplify

- Make the next concrete action the primary visual element.
- Show at most three active daily priorities; one in low-energy or maintenance mode.
- Integrate Excel, English, speaking, sales/argumentation and automation into real BAUER/KAITECH outputs.
- Keep wider interests accessible through a reference shelf rather than daily tracking obligations.
- Keep reflection short and optional; no overdue counters, XP or streak penalties.

## Preserve or archive

No original category or imported field is deleted. Old goals, projects, habit histories, thoughts, logs, decisions, fitness, learning, finance, books, knowledge, milestones and events are retained. Full original source JSON is kept and separately exportable, including unknown root fields. Tasks/captures/reviews/notes receive normalized working copies. Earlier goals remain browseable rather than automatically creating more active tracks.

## New work required

- A responsive installable interface with an accessible mobile settings control.
- Merge-based imports with a pre-import backup, undo and non-punitive rollover.
- Record-level merge and conditional cloud writes: the candidate used whole-document replacement, risking concurrent data loss.
- Retained sessions, token refresh, visible sync state and password/email-link sign-in.
- Read-only migration from the candidate's `governor_state` cloud table into a separate `governor_data` table.
- Monthly history, actual completion dates, milestone evidence, and searchable/editable resources.
- Explicit offline tests and a self-contained portable build.

## Cost and offline limits

The daily app has no runtime packages, paid AI, subscriptions, analytics, ads or paid APIs. Testing uses the free Playwright package. Free hosting and database constraints are documented in `free-tier.md`.

After initial caching, the hosted shell and local workflows run offline. First installation, authentication, cloud sync and outside references need internet. Browser storage eviction, real Safari/Android behavior and indefinite free-provider uptime are not guaranteed. A portable HTML copy plus private JSON exports provide a separate recovery path.

## Preservation and deployment

The Governor site is already live at https://ahmadyasser3030.github.io/The-Governer/. The original Floot app remains untouched. The Gold upgrade reuses the current vanilla JavaScript modules, schema-version-1 storage keys, cloud client and owner-restricted SQL. A pushed safe branch `governor-before-gold-2026-10-09` and a local source archive retain the previous working app. Actual private user data is in the browser and Supabase; the source backup is not a personal-data backup.

## Gold reference comparison — October 9, 2026

The supplied `The_Governor_FINAL_One_Package.zip` was inspected as a design reference. Its bundled app was not substituted for the latest repository. Its hero contained baked-in UI text; a new generated, optimized construction image replaces that asset. Its SQL policies omitted the owner-email restriction and would broaden access when combined with the existing policies; that script was not applied. Existing working cloud.js, setup.sql, connect.js and migration.js are preserved.

The smallest integration keeps Today focused on up to three actions, moves both real-data charts into Plans, adds goal lifecycle and retained history, measurable targets, monthly milestones and a calendar, and groups Library resources by category. The crown, dark surfaces and restrained gold accents follow the provided screenshot. Books, routines, core values and monthly reviews remain optional within the same three zones. No unique legacy category or original field is discarded.
