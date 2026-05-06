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

## What's NOT covered (yet)

The full happy-path flow:

```
landing → signup → /pending → super-admin approves → login → /dashboard
       → create project → create invoice → mark paid
```

This requires either:

1. **A dedicated Supabase test project** with seeded data, plus a
   `.env.test` pointing the dev server at it. Tear down between runs with
   `delete from auth.users`. (Cleanest approach.)
2. **Supabase response mocking** via `page.route()` — intercept calls to
   `*.supabase.co/auth/v1/**` and `*.supabase.co/rest/v1/**` and return
   fixtures from `src/test/fixtures.ts`. (Faster but brittle: each new RPC
   call must add a mock.)

Pick one and add `tests/e2e/full-flow.spec.ts`. Track the work via the
task system; this README is the canonical TODO.

## Why no Supabase mocks today

Mocking Supabase responses well requires modeling RLS, RPC behaviour, and
trigger side effects (signup → org auto-create) — easy to get wrong and
end up testing the mock instead of the app. The form-level tests here
catch most regressions cheaply; the full flow is best validated against
a real Supabase test project before each release.
