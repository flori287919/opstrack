# E2E test Supabase — udhëzime instalimi (shqip)

Ky dokument shpjegon hap-pas-hapi si të krijosh një projekt të dytë
Supabase (vetëm për teste) dhe ta lidhësh me CI. Pas instalimit, çdo
push në `main` ose çdo Pull Request do të rrotullojë testin e plotë
**signup → aprovim → login → dashboard** automatikisht.

Pa këtë instalim, testet e plota anashkalohen — testet e tjera (forma,
landing, vitest) vazhdojnë të punojnë normalisht.

Koha totale: ~30 minuta.

---

## 1. Krijo projektin e dytë Supabase

Free tier i Supabase-it lejon dy projekte falas — projekti ekzistues
**OpsTrack** (production) dhe një i dytë vetëm për teste.

1. Hap https://supabase.com/dashboard
2. Klik **New project** (lart djathtas).
3. Plotëso:
   - **Name:** `opstrack-test`
   - **Database Password:** gjenero një password të ri (ruaje në password
     manager — s'do na nevojitet shpesh).
   - **Region:** `eu-west-3` (Paris) — i njëjtë me projektin kryesor.
   - **Pricing Plan:** **Free**
4. Klik **Create new project**. Prit ~2 minuta deri sa të jetë gati
   (do shohësh një badge të gjelbër "Active").

---

## 2. Aplikoji migrimet skemës

Projekti i ri është bosh. Duhet të ekzekutosh të 9 SQL migrimet që janë
te `supabase/migrations/` për të rikrijuar të njëjtën strukturë si
prodhimi.

**Metoda më e thjeshtë: kopjo-ngjit te SQL Editor.**

1. Në sidebar të Supabase-it, klik ikonën **🛠️ SQL Editor**.
2. Klik **+ New query**.
3. Hap fajllin lokal `supabase/migrations/0001_initial_schema.sql` me
   Notepad.
4. Kopjo **gjithë** përmbajtjen (Ctrl+A → Ctrl+C).
5. Ngjite te SQL Editor i Supabase-it (Ctrl+V).
6. Klik **Run** (poshtë djathtas, ose Ctrl+Enter).
7. Prit deri sa të shohësh **"Success. No rows returned"**.
8. Përsërit hapat 2-7 për secilin fajll, **në rend numerik**:
   - 0001_initial_schema.sql
   - 0002_audit_triggers.sql
   - 0003_deliverables.sql
   - 0004_people_costs.sql
   - 0005_security_hardening.sql
   - 0006_signup_approval.sql
   - 0007_app_config.sql
   - 0008_fix_org_members_rls.sql
   - 0009_reject_signup_cleans_auth_user.sql

⚠️ **Mos i përziej rendin** — çdo migrim mbështetet te ata para tij.

---

## 3. Çaktivizo konfirmimin e email-it

Testet do regjistrojnë përdorues të rinj. Nuk duam të presim emailet
e konfirmimit.

1. Sidebar → **🔒 Authentication** → **Sign In / Up**.
2. Te seksioni **Email**, gjej **"Confirm email"**.
3. **Çaktivizo (Off)** Confirm email.
4. Klik **Save**.

---

## 4. Krijo një super-admin për testet

Ky është një përdorues që testi do ta përdorë për të aprovuar
regjistrimet e reja.

1. Sidebar → **🔒 Authentication** → **Users**.
2. Klik **Add user** → **Create new user**.
3. Plotëso:
   - **Email:** `e2e-admin@example.com` (mund të jetë çfarëdo, por
     mbaje këtë për thjeshtësi)
   - **Password:** gjenero diçka të fortë, p.sh. `E2eAdmin!Test2026`
   - **Auto Confirm User:** ✅ aktive
4. Klik **Create user**.

Ruaj password-in — do na nevojitet në hapin 6.

---

## 5. Merr çelësat e API-t

1. Sidebar → **⚙️ Settings** → **API**.
2. Kopjo tre vlerat e mëposhtme në një vend të sigurt (do na nevojiten
   në hapin 6):

| Etiketa në Supabase | Si quhet te ne |
|---|---|
| **Project URL** | `TEST_SUPABASE_URL` |
| **anon public** key | `TEST_SUPABASE_ANON_KEY` |
| **service_role secret** key | `TEST_SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **Çelësi `service_role`** ka **qasje totale** — bypass-on çdo RLS.
Mos e shfaq askujt dhe mos e ngjit në kod publik. Përdoret VETËM nga
GitHub Actions për të pastruar përdoruesit e testit.

---

## 6. Shto secrets te GitHub

1. Hap https://github.com/flori287919/opstrack/settings/secrets/actions
2. Klik **New repository secret**.
3. Shto secret-et e mëposhtëm **një nga një**:

| Name | Value |
|---|---|
| `TEST_SUPABASE_URL` | URL nga hapi 5 |
| `TEST_SUPABASE_ANON_KEY` | anon key nga hapi 5 |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | service_role key nga hapi 5 |
| `TEST_SUPER_ADMIN_EMAIL` | `e2e-admin@example.com` |
| `TEST_SUPER_ADMIN_PASSWORD` | password-i i admin-it nga hapi 4 |

Pas çdo Add, GitHub e enkripton automatikisht.

---

## 7. (Opsionale) Vendos të njëjtat vlera lokalisht

Nëse dëshiron të rrotullosh testet e plota edhe nga laptop-i, krijo një
fajll `.env.test` te root i repos:

```
TEST_SUPABASE_URL=https://xxxxx.supabase.co
TEST_SUPABASE_ANON_KEY=eyJ...
TEST_SUPABASE_SERVICE_ROLE_KEY=eyJ...
TEST_SUPER_ADMIN_EMAIL=e2e-admin@example.com
TEST_SUPER_ADMIN_PASSWORD=E2eAdmin!Test2026
```

Pastaj nga PowerShell te folderi i projektit:

```
npm run e2e
```

`.env.test` është te `.gitignore` — kurrë nuk dërgohet në GitHub.

---

## 8. Verifikim — testi i parë

Krijo një PR të vogël (p.sh. shto një rresht në një README) dhe hape.
Te tab-i **Checks** të PR-së, do shohësh:

- ✅ `unit / Unit tests + build` — kalon në ~1 minutë
- ✅ `e2e / Playwright e2e` — kalon në ~3 minuta, përfshin edhe testin
  e plotë

Nëse `Playwright e2e` ka linja që fillojnë me `✓` për:
```
Full flow: signup → approve → login → dashboard
```
atëherë gjithçka punon. 🎉

---

## Si funksionon (shkurt, pa kod)

Testi i plotë sjell këtë skenar:

1. Hap `/sq/signup` me një **email të ri të rastësishëm** (p.sh.
   `e2e-1715533200@example.com`).
2. Plotëson formën (orgName, email, password) dhe klik "Krijo llogari".
3. Prite: aplikacioni e redirekton te `/sq/pending` (sepse jo i
   aprovuar).
4. Logout. Hyn me email-in e super-admin-it.
5. Shko te `/sq/admin`. Kliko "Aprovo" për përdoruesin e ri.
6. Logout. Hyn me përdoruesin e ri.
7. Verifiko që mbërrin te `/sq/dashboard` (jo `/sq/pending`).

Pas testit, përdoruesi i ri fshihet automatikisht nga `auth.users`.
Super-admin-i mbetet. Po t'i shohësh herë pas here, mund të pastrosh
manualisht nga Supabase Dashboard → Authentication → Users.

---

## Çfarë të bësh nëse diçka prishet

| Simptomë | Veprim |
|---|---|
| Testi i plotë anashkalohet ("skipped") | Verifiko që 5 secrets-et janë vendosur saktë në GitHub. |
| `permission denied for table` gjatë migrimit | Po vrapon SQL-të jashtë rendit. Fillo nga 0001 dhe vazhdo në rend. |
| `column does not exist` te 0008 ose 0009 | I njëjti shkak — migrimet duhen aplikuar në rend. |
| Login i super-admin-it dështon | Kontrollo te Authentication → Users që përdoruesi është "Confirmed". Nëse jo, redakto dhe klik "Confirm user". |
| Testi ngec te `expect(page).toHaveURL(/\/pending/)` | Konfirmimi i email-it ende është aktiv. Kthehu te hapi 3 dhe çaktivizoje. |

Për çdo problem, hap një Issue te repo me titullin "E2E setup: ..." dhe
trupin që përshkruan se në cilin hap dhe me çfarë mesazhi gabimi.
