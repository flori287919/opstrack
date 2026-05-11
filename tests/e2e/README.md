# End-to-end tests (Playwright)

These tests boot `next dev` on port 3100 and exercise the app in a real
browser (Chromium). They are smoke / form-level tests — they verify that
pages render, that fields are present, and that client-side validation
fires. They do **not** hit a real Supabase project.

## Running locally

First-time setup (downloads ~150 MB of browser binaries):

```bash
npx playwright install chromium
```

Run the suite:

```bash
npx playwright test
```

The dev server is auto-started by Playwright (see `playwright.config.ts`)
and reused between runs in dev. In CI, it's started fresh per run.

## What's covered

| File | Covers |
|---|---|
| `landing.spec.ts` | Default redirect to `/sq`, language switch via `/en`, hero + CTA visibility |
| `auth-forms.spec.ts` | Login / signup / forgot-password form rendering, signup password-mismatch validation, navigation between auth pages |

## Full flow (signup → approve → login)

`full-flow.spec.ts` exercises the critical auth path against a dedicated
test Supabase project. It signs up a brand-new user with a random
email, logs in as a pre-seeded super-admin to approve them, then logs
back in as the new user and asserts they reach the real dashboard.

The spec **auto-skips** when the required env vars are missing — so
this same suite stays green on CI even before the test project is set
up. Once the secrets land in GitHub Actions, the spec activates.

### Required env vars

| Name | Where it comes from |
|---|---|
| `TEST_SUPABASE_URL` | Test Supabase project → Settings → API |
| `TEST_SUPABASE_ANON_KEY` | same |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | same |
| `TEST_SUPER_ADMIN_EMAIL` | Pre-seeded admin user in the test project |
| `TEST_SUPER_ADMIN_PASSWORD` | same |

### One-time setup

See [docs/e2e-setup-sq.md](../../docs/e2e-setup-sq.md) (Albanian) for a
30-minute walkthrough: create the 2nd Supabase project, run all 9
migrations, disable email confirmation, create the super-admin user,
add the 5 GitHub Actions secrets.

For local runs, drop the same five vars into `.env.test` at the repo
root (gitignored).

### Cleanup

The spec deletes the random test user via the service-role admin API
in `afterAll`. The super-admin row persists across runs by design.

## What's NOT covered (yet)

- Creating a project / invoice / marking paid from the UI. Needs lookup
  seeding (business lines, clients, beneficiaries, PMs) before the
  invoice form can render. Track separately when added.
