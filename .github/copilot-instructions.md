## Copilot Guidance for Maatje AI

### Mission
- Onderhoud en verbeter de Abrona-gebrandmerkte Maatje AI chatbot.
- Zorg dat Supabase-authenticatie met e-mail/wachtwoord verplicht blijft voordat de chat zichtbaar is.
- Bewaar gebruikers- en botberichten in Supabase `chat_history` zodat gesprekken persistent zijn.

### Tech Stack Overzicht
- **Frontend:** HTML, CSS en vanilla JavaScript. Let op dat elk bestand zowel in de root als in `public/` bestaat; houd ze gelijk.
- **State & Data:** Supabase JavaScript client (`window.supabase.createClient`) + Supabase Auth & Database.
- **Backend:** `server.js` (Node/Express) dat de OpenAI Assistant API benadert. Frontend praat alleen met `/api/chat`.
- **Hosting:** Vercel. Houd rekening met relative paths (`images/logo_abrona.png`) en statische assets onder `public/`.

### Belangrijkste Richtlijnen
1. **Authenticatie bewaken:** Niet-ingelogde gebruikers moeten worden doorgestuurd naar `login.html`; ingelogde gebruikers zien de chat en een uitlogknop.
2. **Chat-flow behouden:** Gebruik `public/script.js` als bron van waarheid. Deze initialiseert Supabase, stuurt berichten naar `/api/chat`, toont een fallback als de backend uitvalt en logt alles in Supabase.
3. **Bestanden synchroniseren:** Houd `index.html`, `login.html`, `register.html`, `style.css` en `script.js` identiek in root en `public/`. Public-versies zijn wat Vercel serveert.
4. **Branding & toegankelijkheid:** Gebruik alleen `images/logo_abrona.png`. Bewaak consistente styling, leesbaarheid en toetsenbordnavigatie.
5. **Geen oude artefacten terughalen:** `public/script_old.js` blijft verwijderd; gebruik geen verouderde Supabase-initialisatie.

### Werkproces
- Begin wijzigingen in `public/` en spiegel ze naar de root indien nodig.
- Controleer Supabase-functies via handmatige flow: inloggen → bericht versturen → antwoord ontvangen → validatie van opslag.
- Na codewijzigingen: `npm install` is niet vereist tenzij nieuwe packages nodig zijn. Turnaround-tests zijn handmatige browserchecks.
- Houd `git status` schoon; commit logisch en push naar `main`.

### Do & Don’t
- ✅ Documenteer nieuwe configuratie in deze file of `README.md`.
- ✅ Respecteer environment secrets; gebruik `.env` voor gevoelige sleutels.
- ❌ Geen directe OpenAI calls vanuit de frontend.
- ❌ Geen breaking changes deployen zonder fallbackmelding voor gebruikers.

### Snelle Checklist voor Releases
- [ ] Login/registratie werkt en redirect juist.
- [ ] Chatberichten worden verzonden en ontvangen (fallback bericht beschikbaar).
- [ ] Supabase tabel `chat_history` krijgt nieuwe rijen.
- [ ] UI toont `logo_abrona.png` en blijft responsive.
- [ ] `git status` heeft geen ongeplande wijzigingen.
