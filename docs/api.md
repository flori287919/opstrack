# API reference

Complete catalog of every server-side callable in OpsTrack: HTTP routes,
Next.js Server Actions, and Postgres RPCs reachable via `supabase.rpc()`.

> **Audience:** future contributors and AI assistants picking up the codebase.
> Most readers will not call these directly — the UI consumes them through
> `<form action={action}>` bindings and `useActionState`. This document exists
> so behaviour, side effects, and auth requirements are documented in one
> place.

---

## Auth & multi-tenancy model

| Concept | Implementation |
|---|---|
| Identity provider | Supabase Auth (email + password) |
| Tenancy boundary | `organizations` row, joined to users via `org_members` |
| Authz primitive | Postgres Row Level Security (RLS) |
| Tenant lookup | `public.user_orgs()` returns the caller's `org_id`s |
| Roles | Single role `director` per org (V1) |
| Super-admin | Separate gate via `is_super_admin()` (reads `app_config.super_admin_emails`); not a role |
| Session storage | HTTP-only cookies via `@supabase/ssr` |
| Approval gate | New signups land with `org_members.approved = false`; super-admin must approve before access |

All server actions and route handlers run in Node, get a Supabase client via
`createClient()` from `src/lib/supabase/server.ts` (cookie-bound), and rely on
RLS to enforce org isolation. **The app does not maintain an authorization
layer outside RLS** — bugs in RLS policies are security bugs.

---

## HTTP Routes

All routes live under `src/app/api/` and are invoked via standard HTTP from the
browser, the Vercel platform (cron in PR4), or external clients.

### `GET /api/auth/confirm`

OAuth/email-link callback. Verifies an OTP token from Supabase and redirects.

| | |
|---|---|
| File | `src/app/api/auth/confirm/route.ts` |
| Query params | `token_hash` (string), `type` (`EmailOtpType`), `next` (string, default `/sq`) |
| Auth | Anonymous (token is the credential) |
| Success | 302 → `next` param |
| Failure | 302 → `/sq/login?error=…` |
| Side effects | `supabase.auth.verifyOtp()` |

### `GET /api/export/org`

Full organisation export as JSON.

| | |
|---|---|
| File | `src/app/api/export/org/route.ts` |
| Auth | Authenticated + approved org member |
| Output | `application/json` attachment, includes 13 tables + `organizations` + `org_members` for every org the user belongs to |
| Side effects | None (read-only) |

### `GET /api/export/invoices`

Invoices as Excel (`.xlsx`).

| | |
|---|---|
| File | `src/app/api/export/invoices/route.ts` |
| Auth | Authenticated |
| Output | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, single sheet "Faturat" with project + client + deliverable joined |
| Side effects | None |

### `GET /api/export/costs`

Cost contracts and payments as Excel.

| | |
|---|---|
| File | `src/app/api/export/costs/route.ts` |
| Auth | Authenticated |
| Output | Two sheets: "Kontratat" (cost_contracts) and "Pagesat" (cost_payments) |
| Side effects | None |

### `GET /api/export/projects`

Projects as Excel.

| | |
|---|---|
| File | `src/app/api/export/projects/route.ts` |
| Auth | Authenticated |
| Output | Single sheet "Projektet" with BL, client, beneficiary, PM joined |
| Side effects | None |

---

## Server Actions

All actions are `'use server'` functions invoked from React forms via
`<form action={fn}>` or directly from client components. They use
`revalidatePath()` to invalidate cached pages and `redirect()` to navigate.

Conventions used throughout:

- Errors during validation redirect back to the source page with `?error=<key>`
  so the page can render a localized message.
- Permission errors (like a non-super-admin invoking an admin action) `throw new Error`
  rather than redirecting — these should never be reached through normal UI.
- All inserts rely on RLS; the action sets `org_id` from the caller's first
  membership when needed.

### Auth

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `login(formData)` | `[lang]/login/actions.ts` | `email`, `password` | Sign in, redirect to `/{lang}/dashboard` (or `/{lang}/pending` if unapproved) |
| `logout()` | `[lang]/login/actions.ts` | none | Sign out, redirect to `/{lang}/login` |
| `signup(formData)` | `[lang]/signup/actions.ts` | `email`, `password`, `password_confirm`, `orgName` | Validate (min 8 chars, match), `signUp` with org metadata, trigger creates org + unapproved member |
| `requestReset(lang, fd)` | `[lang]/forgot-password/actions.ts` | `email` | Send reset email; **always** redirect to `?sent=1` (do not leak email existence) |
| `setNewPassword(lang, fd)` | `[lang]/reset-password/actions.ts` | `password`, `confirm` | Validate, `updateUser`, `signOut`, redirect to login with `info=password_updated` |

### Admin

Both require super-admin (verified by `is_super_admin()` via the underlying
RPC). The action layer also pre-checks `isSuperAdmin()` from `src/lib/admin.ts`
to fail fast with a clear error.

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `approveMembership(orgId, userId)` | `[lang]/admin/actions.ts` | UUIDs | Calls RPC `approve_signup(p_org_id, p_user_id)` |
| `rejectMembership(orgId)` | `[lang]/admin/actions.ts` | UUID | Calls RPC `reject_signup(p_org_id)` (cascades members; deletes user if orphaned) |

### Dashboard — Clients

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `createClientRecord(fd)` | `dashboard/clients/actions.ts` | `name`*, `country`, `contact_person`, `email`, `phone`, `payment_terms_days`, `default_modality`, `notes` | Insert, redirect |
| `softDeleteClient(id)` | `dashboard/clients/actions.ts` | UUID | Set `deleted_at` |

### Dashboard — Projects

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `createProject(fd)` | `dashboard/projects/actions.ts` | `project_code`*, `name`*, FKs (`bl_id`, `client_id`, `beneficiary_id`, `project_manager_id`), dates, modality, approval flags, value, margin, payment terms, notes | Insert, redirect to `/dashboard/projects` |
| `updateProject(id, fd)` | `dashboard/projects/actions.ts` | id + same fields | Update, redirect to detail |
| `softDeleteProject(id)` | `dashboard/projects/actions.ts` | UUID | Set `deleted_at` |
| `restoreProject(id)` | `dashboard/projects/actions.ts` | UUID | Clear `deleted_at` |

### Dashboard — Deliverables

Scoped to a project — all take `projectId` first.

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `createDeliverable(projectId, fd)` | `dashboard/projects/[id]/deliverables-actions.ts` | `code`*, `name`*, `description`, `planned_date`, `actual_date`, `planned_value_no_vat`, `status` (default `Planned`), `notes` | Insert |
| `updateDeliverable(projectId, id, fd)` | same | id + same fields | Update |
| `setDeliverableStatus(projectId, id, status, markActualToday?)` | same | enum status, optional bool | Update; if `markActualToday`, also set `actual_date = today` |
| `softDeleteDeliverable(projectId, id)` | same | UUIDs | Set `deleted_at` |

### Dashboard — People allocations and timesheets

Scoped to a project.

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `createAllocation(projectId, fd)` | `dashboard/projects/[id]/allocations-actions.ts` | `person_id`*, `start_date`*, `allocation_pct` (default 1.0), `end_date`, `billable_daily_rate`, `notes` | Insert into `people_allocations` |
| `softDeleteAllocation(projectId, id)` | same | UUIDs | Set `deleted_at` |
| `createTimesheet(projectId, fd)` | same | `person_id`*, `date`*, `hours`*, `description` | Insert into `timesheets` |
| `softDeleteTimesheet(projectId, id)` | same | UUIDs | Set `deleted_at` |

### Dashboard — Invoices

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `createInvoice(fd)` | `dashboard/invoices/actions.ts` | `project_id`*, `invoice_number`, `deliverable_id`, four date fields, `amount_no_vat`, `status` (default `Scheduled`), `notes` | Insert |
| `updateInvoice(id, fd)` | same | id + same fields | Update |
| `softDeleteInvoice(id)` | same | UUID | Set `deleted_at`, redirect to list |
| `restoreInvoice(id)` | same | UUID | Clear `deleted_at` |
| `markInvoicePaid(id, fd)` | same | id, optional `collection_date` (defaults today) | `status='Paid'` + `collection_date` |

### Dashboard — Costs (subko / non-people)

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `createCostContract(fd)` | `dashboard/costs/actions.ts` | `project_id`*, `contract_name`*, `beneficiary_name`, `modality`, `status` (default `Active`), values + taxes, payment terms, `notes` | Insert into `cost_contracts` |
| `updateCostContract(id, fd)` | same | id + same fields | Update |
| `softDeleteCostContract(id)` | same | UUID | Set `deleted_at`, redirect to list |
| `restoreCostContract(id)` | same | UUID | Clear `deleted_at` |
| `createCostPayment(contractId, fd)` | same | `receipt_number`, `payment_schedule_pct`, dates, `amount`, `cost_no_taxes`, `wht`, `status` (default `Scheduled`), `notes` | Insert into `cost_payments` |
| `markPaymentPaid(paymentId, contractId, fd)` | same | optional `actual_payment_date` (defaults today) | `status='Paid'` + `actual_payment_date` |
| `softDeleteCostPayment(paymentId, contractId)` | same | UUIDs | Set `deleted_at` |

### Dashboard — People (master data)

| Action | File | Inputs | Behaviour |
|---|---|---|---|
| `createPerson(fd)` | `dashboard/people/actions.ts` | `name`*, `role`, `email`, `employment_type` (default `Salaried`), `monthly_salary`, `daily_rate`, `hourly_rate`, `default_billable_daily_rate`, `start_date`, `end_date`, `notes` | Insert |
| `updatePerson(id, fd)` | same | id + same fields | Update |
| `softDeletePerson(id)` | same | UUID | Set `deleted_at`, redirect to list |

### Dashboard — Lookups

Three small lookup tables, each with create + soft-delete.

| Table | Create action | Delete action | Required fields |
|---|---|---|---|
| `business_lines` | `createBL(fd)` | `deleteBL(id)` | `code`, `name` (+ `description`) |
| `beneficiaries` | `createBeneficiary(fd)` | `deleteBeneficiary(id)` | `name` (+ `country`, `notes`) |
| `project_managers` | `createPM(fd)` | `deletePM(id)` | `name` (+ `email`, `role`) |

All in `src/app/[lang]/dashboard/lookups/actions.ts`.

---

## Postgres RPCs

Callable from the client via `supabase.rpc('<name>', { ... })`. Defined as
`SECURITY DEFINER` functions with locked `search_path` (see migration 0005),
and `grant execute to authenticated` so RLS doesn't block them.

### `user_orgs() → setof uuid`

| | |
|---|---|
| Migration | `0001_initial_schema.sql` |
| Auth | Authenticated |
| Returns | UUIDs of all orgs the caller belongs to |
| Used by | Every RLS policy in the schema |

### `is_super_admin() → boolean`

| | |
|---|---|
| Migration | `0007_app_config.sql` |
| Auth | Authenticated |
| Returns | `true` if caller's email is in `app_config.super_admin_emails` (CSV), else `false` |
| Used by | `list_pending_signups`, `approve_signup`, `reject_signup`; also called from app code via `src/lib/admin.ts` |

### `list_pending_signups() → table(...)`

| | |
|---|---|
| Migration | `0007_app_config.sql` (supersedes the `0006` definition) |
| Auth | Super-admin (returns empty for everyone else) |
| Returns | `org_id, user_id, email, org_name, created_at` for unapproved memberships, ordered by `created_at desc` |

### `approve_signup(p_org_id uuid, p_user_id uuid) → void`

| | |
|---|---|
| Migration | `0007_app_config.sql` |
| Auth | Super-admin (raises `Forbidden` otherwise) |
| Side effects | Sets `org_members.approved = true` for the given pair |

### `reject_signup(p_org_id uuid) → void`

| | |
|---|---|
| Migration | `0009_reject_signup_cleans_auth_user.sql` (supersedes `0006`) |
| Auth | Super-admin (raises `Forbidden` otherwise) |
| Side effects | Deletes the organization (cascades to memberships); deletes `auth.users` row if the rejected user has no other memberships left |

---

## Conventions for new endpoints

When adding a new route handler or server action:

1. **Get a Supabase client** via `createClient()` from `src/lib/supabase/server.ts`. Never instantiate one with the service role key from app code.
2. **Don't bypass RLS in app code.** If you need to bypass RLS (e.g. cross-tenant admin actions), write a `SECURITY DEFINER` Postgres function and call it via RPC.
3. **Set `org_id` server-side** from the caller's membership — never trust the client to set it.
4. **Soft delete, don't hard delete.** Set `deleted_at = now()` on domain tables. Audit triggers detect this and emit `DELETE`/`RESTORE` rows.
5. **Validate at the boundary.** Use server actions for form submissions so validation errors can redirect with `?error=<key>` for localized rendering.
6. **Revalidate the affected pages** with `revalidatePath()` after mutations.
7. **Lock `search_path`** on any new Postgres function: `set search_path = public`. Without this, `SECURITY DEFINER` functions are vulnerable to schema hijacking.
