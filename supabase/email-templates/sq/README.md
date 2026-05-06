# Email templates — shqip

Tekste për Supabase Auth Email Templates, të përkthyera në shqip.

## Si t'i instalosh

1. Hap dashboard-in e Supabase-it për projektin OpsTrack.
2. **Authentication → Email Templates**.
3. Për secilin nga template-et e mëposhtëm:
   - Klik te emri i template-it në Supabase (p.sh. *Confirm signup*).
   - Hap fajllin përkatës këtu.
   - Kopjo **Subject**-in nga blloku i parë në fillim të fajllit te fusha **Subject heading** në Supabase.
   - Kopjo **Body HTML**-in (gjithçka pas vijës ndarëse `<!-- BODY -->`) te fusha **Message body**.
   - Klik **Save**.
4. (Opsionale) Dërgo një email-test për të verifikuar paraqitjen.

## Template-et

| Supabase Template       | Fajlli                                | Kur dërgohet                                     |
|-------------------------|---------------------------------------|--------------------------------------------------|
| Confirm signup          | [confirm-signup.html](confirm-signup.html) | Pas regjistrimit, për të konfirmuar email-in |
| Reset password          | [reset-password.html](reset-password.html) | Kur përdoruesi kërkon rivendosjen e fjalëkalimit |
| Magic link              | [magic-link.html](magic-link.html)         | Login pa fjalëkalim (i çaktivizuar nga V1, por mbahet për të ardhmen) |
| Invite user             | [invite-user.html](invite-user.html)       | Kur super-admin fton një përdorues të ri |
| Change email address    | [change-email.html](change-email.html)     | Kur përdoruesi ndryshon email-in e llogarisë |
| Reauthentication        | [reauthentication.html](reauthentication.html) | OTP për operacione të ndjeshme |

## Variablat që përdor Supabase

- `{{ .ConfirmationURL }}` — link-u që duhet klikuar (përfshin token)
- `{{ .SiteURL }}` — URL-ja bazë e aplikacionit (`https://opstrack-xi.vercel.app`)
- `{{ .Email }}` — email-i i përdoruesit
- `{{ .Token }}` — kod 6-shifror (vetëm për reauthentication)

Mos i ndrysho emrat e variablave — Supabase i zëvendëson në kohë reale kur dërgon email-in.

## Test pas instalimit

Pas çdo instalimi:
1. Bëj signup me një email të ri (përdor `+test1@gmail.com` etj. për test).
2. Verifiko që email-i mbërrin në shqip.
3. Klik linkun, sigurohu që funksionon.

Nëse email-i s'mbërrin, kontrollo:
- Spam folder
- Resend dashboard (Logs) — a u dërgua?
- Supabase Auth logs — a u thirr?
