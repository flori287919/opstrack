# Admin setup runbook

Procedures for super-admin management and custom email delivery.

---

## 1. Add a backup super-admin

Super-admins are stored in the `app_config` table (key `super_admin_emails`,
comma-separated values). Adding a second admin protects against lockout if the
primary admin loses access to their email.

### Step 1 — pick the email

Use a real mailbox you control. Recommended: a backup Gmail address or a
secondary work email.

### Step 2 — run the SQL

Connect to Supabase via the dashboard SQL editor, the Supabase CLI, or your
preferred client. Run:

```sql
update public.app_config
set value = value || ',backup-admin@example.com'
where key = 'super_admin_emails';
```

Replace `backup-admin@example.com` with the real address.

### Step 3 — verify

```sql
select value from public.app_config where key = 'super_admin_emails';
-- Should now contain both addresses, comma-separated.
```

### Step 4 — also update the env var

The app also reads `SUPER_ADMIN_EMAILS` env var as a fallback. Update it on
Vercel (Settings → Environment Variables) so both DB and env match. Then
redeploy.

### Removing a super-admin

```sql
update public.app_config
set value = 'remaining-admin@example.com'
where key = 'super_admin_emails';
```

(Set `value` to whatever the final list should be; there is no array-remove
helper.)

---

## 2. Custom email delivery via Resend + Supabase SMTP

By default Supabase sends auth emails (signup confirmation, password reset)
from `noreply@mail.app.supabase.io`. For production this looks unprofessional
and can land in spam. The fix is to plug Resend into Supabase's Custom SMTP.

### Prerequisites

- A domain you own (e.g. `yourdomain.al`). If you don't have one, buy one
  at Cloudflare or Namecheap (~$10/year).
- A Resend account (free tier covers 3,000 emails/month).

### Step 1 — verify your domain in Resend

1. Sign up at <https://resend.com>.
2. Go to **Domains** → **Add Domain** → enter `yourdomain.al`.
3. Resend will show you DNS records to add (SPF, DKIM, optionally DMARC).
4. Add those records at your DNS provider (Cloudflare/Namecheap).
5. Wait for verification (~5–30 min). Status should turn green.

### Step 2 — create a Resend API key

1. In Resend → **API Keys** → **Create**.
2. Give it a name like `supabase-smtp`.
3. Copy the key (`re_...`). Store it securely — it is shown only once.

### Step 3 — configure Supabase Custom SMTP

1. Open the Supabase dashboard for the `opstrack` project.
2. **Authentication** → **Email Templates** → **SMTP Settings**.
3. Toggle **Enable Custom SMTP**.
4. Fill in:
   - **Sender email:** `noreply@yourdomain.al`
   - **Sender name:** `Operations Management Application` (or whatever brand)
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** the API key from Step 2
   - **Minimum interval between emails:** `60` seconds (Supabase default)
5. **Save**.

### Step 4 — test

1. Click **Send test email** in the Supabase SMTP settings (if available), or
2. Trigger a real auth email by signing up a fresh user, or
3. From a script, call `supabase.auth.resetPasswordForEmail('you@yourdomain.al')`.

The email should arrive from `noreply@yourdomain.al` (not the Supabase domain).

### Step 5 — install the Albanian email templates

Pre-translated templates ship with the repo at
[`supabase/email-templates/sq/`](../supabase/email-templates/sq/). They cover:

- Confirm signup
- Reset password
- Magic link
- Invite user
- Change email address
- Reauthentication

Open the README at that path for step-by-step paste instructions. Each `.html`
file has the **Subject** at the top in a comment and the **Body** below the
`<!-- BODY -->` divider. Paste them into the matching template in
**Authentication → Email Templates** in the Supabase dashboard.

Supabase doesn't auto-localize, so this gives all auth emails an Albanian
voice consistent with the app UI. If you later need bilingual emails (sq+en
side by side), duplicate the body and add the English copy below the
Albanian.

### Cost notes

- Resend free tier: 3,000 emails/month, 100/day.
- Most apps with <100 active users send <500 auth emails/month → free tier is
  sufficient until ~200 users.
- Upgrade to Resend Pro (~$20/month) at higher volume.

---

## 3. Daily overdue-invoices email digest

A Vercel Cron job runs once a day and sends every approved org member an
email summarising overdue invoices for their org.

### Schedule

`vercel.json` schedules `/api/cron/overdue-invoices` at `0 6 * * *` (06:00
UTC = 07:00 Tirana in winter, 08:00 Tirana in summer). Adjust the cron
expression in `vercel.json` if you want a different time. Vercel cron uses
UTC.

### Required environment variables

Set these on Vercel (Settings → Environment Variables) for **Production**:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Already set for the app |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API → `service_role` key. **Never expose to the client.** |
| `CRON_SECRET` | Random secret. Generate with `openssl rand -hex 32`. Vercel sends it in the `Authorization` header when triggering the cron. |
| `RESEND_API_KEY` | From Resend dashboard (same key used in section 2 SMTP setup is fine). |
| `EMAIL_FROM` | `"OpsTrack <noreply@yourdomain.al>"` — must use a domain you've verified in Resend. |
| `NEXT_PUBLIC_APP_URL` | `https://opstrack-xi.vercel.app` (used to build "Open invoices" links in the email). |

After adding them, redeploy. The cron is registered automatically at deploy
time via `vercel.json`.

### What it sends

Per org with one or more overdue invoices: a single HTML email to every
**approved** `org_member`, with subject:

```
{Org Name} — N fatura overdue (€XXX)
```

Body lists each invoice with: number, client, project, amount, days
overdue. A button links to `/sq/dashboard/invoices?filter=overdue`.

If an org has zero overdue invoices, no email is sent.

### Testing

Trigger manually via curl (replace placeholders):

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://opstrack-xi.vercel.app/api/cron/overdue-invoices
```

Expected response:

```json
{
  "ok": true,
  "orgs": 1,
  "sent": 1,
  "skipped": 0,
  "errors": 0,
  "results": [...]
}
```

If `sent` is 0 but you expected emails, check Vercel logs and Resend
dashboard logs for delivery errors.

### Security notes

- The route returns `401` for any request without the matching
  `Authorization: Bearer <CRON_SECRET>` header. Vercel attaches it
  automatically for cron-triggered invocations.
- The service-role key bypasses RLS — guard it carefully. It is only used
  inside the cron route to query across all orgs.
- Recipients are derived from `org_members.approved = true`. Unapproved
  members never receive overdue emails (they shouldn't have access yet).

---

## 4. Common runbook tasks

### Reset a user's password manually

```sql
update auth.users
set encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
where email = 'user@example.com';
```

User can then log in with `NewPassword123!`. Tell them to change it
immediately via the app.

### Force-confirm a user's email

```sql
update auth.users
set email_confirmed_at = now()
where email = 'user@example.com' and email_confirmed_at is null;
```

### List pending signups

```sql
select * from public.list_pending_signups();
```

(Must be called as an authenticated super-admin, e.g. via `psql` with
`SET request.jwt.claim.sub = '<your-uuid>';` or via the app's `/admin` page.)
