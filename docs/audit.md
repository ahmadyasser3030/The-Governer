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

The existing deployment has not been modified. Source files were saved in the selected checkout; no changes were pushed remotely. Review and publish the candidate separately before replacing any existing site. Real user-data migration requires an export from that site; synthetic preservation tests do not establish that the user's actual data has migrated.
