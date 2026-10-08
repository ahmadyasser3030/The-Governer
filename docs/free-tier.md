# Free operation

Checked October 8, 2026 against the providers' official documentation repositories (the public pricing pages were blocked by the cloud environment's network policy).

| Component | Published free allowance | Governor uses |
| --- | --- | --- |
| Supabase | Two free projects; 500 MB database per project; 5 GB egress; 50,000 monthly active users | One project, one user, one JSON row. No file storage, AI, Functions, Realtime or paid add-ons. |
| Cloudflare Pages | 500 builds/month, 20,000 files/site, 25 MiB maximum per asset | 13 static files, approximately 120 KB in total; no server functions. |
| GitHub Pages | 1 GB published site; soft 100 GB/month bandwidth limit; free availability depends on repository/account type | The same small static site, manually published after review. Public source is usually required on GitHub Free. |

Sources retrieved directly over verified HTTPS:

- [Supabase billing](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/platform/billing-on-supabase.mdx)
- [Supabase production guidance](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/deployment/going-into-prod.mdx)
- [Supabase backups](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/platform/backups.mdx)
- [Cloudflare Pages limits](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/pages/platform/limits.mdx)
- [GitHub Pages limits](https://github.com/github/docs/blob/main/content/pages/getting-started-with-github-pages/github-pages-limits.md)

Supabase may pause free applications with low activity over a seven-day period. Free database backups are not available for download through the managed backup feature. The Governor therefore includes independent JSON exports and a self-contained offline HTML copy. Keep two private backup copies before long absences. No free provider guarantees indefinite availability or unchanged terms.

The app downloads a full cloud document only when its revision changes. Unchanged visible-session checks fetch revision metadata once per minute. It stops periodic checks while the app is hidden. Edits upload after a short delay and retry compare-and-swap conflicts. This avoids repeatedly downloading years of history on every check.

The supplied SQL caps the cloud document at 5 MB; actual database overhead is additional. Large legacy archives and long notes consume that allowance faster than tasks. No automatic paid upgrade is initiated. Stay on Free, do not add a payment method, and export if a limit is reached. The local app remains usable if the cloud project is paused or a quota blocks sync.

The website shell and its source may be public. Private records live in browser storage and a row protected by authentication plus owner-email and user-ID checks. Provider transport/database encryption is not end-to-end encryption. Use your own locked devices; sign-out does not erase their local records.
