## Copilot Guidance for Maatje AI

### Mission
- Onderhoud en verbeter de Abrona-gebrandmerkte Maatje AI chatbot.
- Zorg dat Supabase-authenticatie met e-mail/wachtwoord verplicht blijft voordat de chat zichtbaar is.
- Bewaar gebruikers- en botberichten in Supabase `chat_history` zodat gesprekken persistent zijn.
- Waarborg veiligheid via het stille alarmsysteem.

### Tech Stack Overzicht
- **Frontend:** HTML, CSS en vanilla JavaScript. Let op dat elk bestand zowel in de root als in `public/` bestaat; houd ze gelijk.
- **State & Data:** Supabase JavaScript client (`window.supabase.createClient`) + Supabase Auth & Database.
- **Backend:** `server.js` (Node/Express) dat de OpenAI Assistant API benadert. Frontend praat alleen met `/api/chat`.
- **Hosting:** Vercel. Houd rekening met relative paths (`images/logo_abrona.png`) en statische assets onder `public/`.

### Belangrijkste Richtlijnen
1. **Authenticatie bewaken:** 
   - Niet-ingelogde gebruikers -> `login.html`.
   - Wachtwoord herstel: Detecteer `PASSWORD_RECOVERY` event en toon prompt voor nieuw wachtwoord.
   - Registratie: Vraag om `firstName` (opslaan als `full_name`) en `caretaker_email`.
2. **Chat-flow & Veiligheid:** 
   - Gebruik `public/script.js` als bron van waarheid.
   - **Stil Alarm:** Als de bot `[ALERT]` antwoordt:
     1. Sla bericht EERST op in `chat_history`.
     2. Trigger `sendSilentAlert()` (gebruik `caretaker_email` uit profiel).
     3. Toon bericht aan gebruiker zonder `[ALERT]` tag.
3. **Mobile First & Layout:**
   - **Volgorde:** Gebruik CSS `order` om de layout op mobiel te forceren: Chat (1), Welkom (2), Info (3), Footer Logo (100).
   - **Hoogte:** Gebruik `dvh` (dynamic viewport height) voor chat-secties om Safari-balken te respecteren.
   - **Fullscreen:** Ondersteun fullscreen modus via `.fullscreen-mode` en `body.no-scroll`.
4. **Bestanden synchroniseren:** Houd `index.html`, `login.html`, `register.html`, `privacy.html`, `style.css` en `script.js` identiek in root en `public/`.
5. **Branding:** Gebruik alleen `images/logo_abrona.png`. Bewaak consistente styling (Abrona kleuren).

### Werkproces
- Begin wijzigingen in `public/` en spiegel ze naar de root indien nodig.
- Controleer Supabase-functies via handmatige flow.
- Na codewijzigingen: `npm install` is niet vereist tenzij nieuwe packages nodig zijn.
- Houd `git status` schoon; commit logisch en push naar `main`.

### Do & Don’t
- ✅ Documenteer nieuwe configuratie in deze file of `README.md`.
- ✅ Respecteer environment secrets; gebruik `.env` voor gevoelige sleutels.
- ✅ Gebruik `safe-area-inset-bottom` voor iPhone optimalisatie.
- ❌ Geen directe OpenAI calls vanuit de frontend.
- ❌ Geen breaking changes deployen zonder fallbackmelding.

### Snelle Checklist voor Releases
- [ ] Login/registratie werkt (ook First Name & Caretaker Email).
- [ ] Wachtwoord herstel flow (email + prompt) werkt.
- [ ] Chatberichten worden verzonden en ontvangen.
- [ ] Stil alarm (`[ALERT]`) wordt opgeslagen in History én Alerts.
- [ ] Privacy pagina (`privacy.html`) bereikbaar vanuit footer.
- [ ] Mobiele layout toont Chat bovenaan en Footer onderaan.
- [ ] Fullscreen modus werkt en blokkeert scrollen van body.
- [ ] `git status` heeft geen ongeplande wijzigingen.
