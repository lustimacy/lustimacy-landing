// Lustimacy auth — translations.
//
// The sign-in flow was built English-only while the marketing pages were
// localised, so a French visitor read French all the way to the sign-in button
// and then fell into English for the whole of signup — the highest-intent
// moment on the site.
//
// Runtime rather than build-time, on purpose. Roughly half these strings never
// exist in the HTML at all: "Uploading 3 of 6", the validation errors, the
// gender and orientation chips are all written by auth.js. Templating the
// markup would have localised one half and left the other, so there would be a
// dictionary either way. This is the single source for both.
//
// Locale resolution: ?lang= → the lustimacy-locale cookie → the lustimacy-lang
// cookie → <html lang> → navigator.language → en. Once a session exists,
// auth.js overrides all of it with the language recorded on the auth user. The query parameter leads because the
// middleware redirects by IP and language without setting a cookie, so a French
// visitor arrives at /fr/ with nothing to carry forward; the site's links
// append it.
//
// It is deliberately NOT appended to the magic-link callback URL. Supabase
// validates redirect_to against an allow list holding the exact callback URL,
// and an exact entry does not match one carrying a query string — adding it
// would strand every non-English sign-in at the Site URL. The lustimacy-lang
// cookie carries the language across the email round trip on the same device,
// and on any device the auth user's own metadata settles it — see
// adoptUserLang() in auth.js.

(function () {
    'use strict';

    var DICT = {
        en: {
            'login.title': 'Sign in or create an account',
            'login.lede': 'No password either way. The same account works in the app.',
            'login.google': 'Continue with Google',
            'login.or': 'or',
            'login.email': 'Email',
            'login.submit': 'Email me a link',
            'login.sentTitle': 'Check your inbox',
            'login.sentBody1': 'We sent a sign-in link to ',
            'login.sentBody2': '. It is good for one use. If it is not there in a minute, look in spam — it comes from a lustimacy.com address.',
            'login.legal1': 'By continuing you agree to our ',
            'login.legalTerms': 'Terms',
            'login.legal2': ' and ',
            'login.legalPrivacy': 'Privacy Policy',
            'login.legal3': '. You must be 18 or over.',
            'login.pageTitle': 'Sign in — Lustimacy',
            'login.sending': 'Sending…',
            'login.googleFail': 'Could not reach Google. Try the email link instead?',
            'login.linkFail': 'Could not send the link. Try again in a moment?',
            'login.netFail': 'Could not reach the server. Check your connection and try again.',

            'login.errEmail': "That doesn't look like an email address.",
            'ob.errPartnerDob': "We need your partner's date of birth too.",
            'ob.errPartnerGender': "Pick your partner's gender too.",
            'cb.pageTitle': "Signing you in — Lustimacy",
            'cb.signingIn': "Signing you in…",
            'cb.moment': "One moment.",
            'cb.failTitle': "That link did not work",
            'cb.newLink': "Send me a new link",
            'cb.expired': 'That link has expired or has already been used. Request a new one and it will work.',
            'cb.direct': 'This page is only reachable from a sign-in link. Request one and you will land back here.',
            'cb.generic': 'Could not complete sign-in. Request a fresh link and try again.',

            'ob.pageTitle': 'Set up your profile — Lustimacy',
            'ob.s1Title': "Let's start with you",
            'ob.s1Lede': 'Two short steps. Three short steps and you are done.',
            'ob.name': 'Your name',
            'ob.namePlaceholder': 'What people call you',
            'ob.dob': 'Your date of birth',
            'ob.who': 'Who is this profile for?',
            'ob.partnerDob': "Your partner's date of birth",
            'ob.continue': 'Continue',
            'ob.s2Title': 'Who you are, who you want',
            'ob.s2Lede': 'All taps. Nothing here is public until you say so.',
            'ob.gender': 'Your gender',
            'ob.partnerGender': "Your partner's gender",
            'ob.lookingFor': 'What are you here for?',
            'ob.orientation': 'Your orientation',
            'ob.back': '← Back',
            'ob.s3Title': 'Add a photo',
            'ob.s3Lede': 'One is all we need. You can add up to six, and change them whenever you like.',
            'ob.s3Verify': 'Use photos of you. In the app you will take a quick selfie, and we check that it is the same person.',
            'ob.choosePhotos': 'Choose photos',
            'ob.finish': 'Finish my profile',
            'ob.saving': 'Saving…',
            'ob.finishing': 'Finishing…',
            'ob.of': ' of ',
            'ob.uploading': 'Uploading ',
            'ob.photoAlt': 'Photo ',
            'ob.removePhoto': 'Remove photo ',
            'ob.errName': 'What should people call you?',
            'ob.errDob': 'We need your date of birth to confirm you are 18 or over.',
            'ob.errDate': 'That date does not look right.',
            'ob.errAge': 'You have to be 18 or over to use Lustimacy.',
            'ob.errAccount': 'Is this profile just for you, or for the two of you?',
            'ob.errBothAge': 'Both of you have to be 18 or over.',
            'ob.errGender': 'Pick the option closest to how you identify.',
            'ob.errLooking': 'Tell us roughly what you are here for.',
            'ob.errOrientation': 'Pick the option closest to your orientation.',
            'ob.errSave': 'Could not save that. Try again in a moment?',
            'ob.errNet': 'Could not reach the server. Check your connection and try again.',
            'ob.errMaxPhotos': 'You can add up to {n} photos.',
            'ob.errReadFile': 'Could not read {n} file.',
            'ob.errReadFiles': 'Could not read {n} files.',
            'ob.errOnePhoto': 'One photo is all we need, but we do need one.',
            'ob.errUpload': 'Could not upload that. Check your connection and try again.',

            'welcome.pageTitle': "You're in — Lustimacy",
            'welcome.title': "You're in",
            'welcome.signedInAs': 'Signed in as ',
            'welcome.checking': 'Checking your profile…',
            'welcome.ready': 'Your profile is ready. On Android, open the app and you are straight into the deck.',
            'welcome.readyVerify': 'Your profile is ready. One step left: open the app and verify with a quick selfie.',
            'verify.title': 'Lustimacy is verified-only',
            'verify.b1': 'Everyone here has shown us a real face. No bots, no stolen photos, nobody hiding behind someone else.',
            'verify.b2': 'And they will know you are real. Your profile carries the same badge, so the people you message can trust it is you.',
            'verify.b3': 'One selfie in the app. It takes about a minute, and you only do it once.',
            'verify.privacy': 'Only our safety team sees that photo. It is never added to your profile and it is never shown to other members.',
            'welcome.unfinished': 'Your profile is not finished yet, so nobody can see you.',
            'welcome.exists': 'Your account exists. Open the app to finish your profile.',
            'welcome.finishLink': 'Finish your profile here',
            'welcome.finishRest': ' — a minute, and one photo. Until then you are not in anyone’s deck.',
            'welcome.openPlay': 'Open Lustimacy on Google Play',
            'welcome.iphone': 'On an iPhone? There is no iOS app yet, but your profile is live either way — people on Android can find and like you, and you will be waiting for them when iOS lands.',
            'welcome.iphoneLink': 'Tell us where to reach you',
            'welcome.iphoneRest': ' and you will hear first.',
            'welcome.signout': 'Sign out',
            'welcome.outTitle': "You're not signed in",
            'welcome.outLede': 'Your session has expired, or you landed here without one. Getting a fresh link takes a few seconds.',
            'welcome.outCta': 'Email me a link',

            'acct.0': 'Just me', 'acct.1': 'The two of us',
            'g.0': 'Man', 'g.1': 'Woman', 'g.2': 'Non-binary', 'g.3': 'Trans man',
            'g.4': 'Trans woman', 'g.5': 'Genderqueer', 'g.6': 'Genderfluid',
            'g.7': 'Agender', 'g.8': 'Two-spirit', 'g.9': 'Other',
            'o.0': 'Straight', 'o.1': 'Gay', 'o.2': 'Lesbian', 'o.3': 'Bisexual',
            'o.4': 'Pansexual', 'o.5': 'Asexual', 'o.6': 'Demisexual',
            'o.7': 'Queer', 'o.8': 'Questioning',
            'lf.10': 'One-Time Encounter', 'lf.11': 'Friends with Benefits',
            'lf.12': 'Ethical Non-Monogamy', 'lf.13': 'Casual Dates',
            'lf.14': 'Friends', 'lf.15': 'Still Figuring Out'
        },

        de: {
            'login.title': 'Anmelden oder Konto erstellen',
            'login.lede': 'Kein Passwort, so oder so. Dasselbe Konto gilt auch in der App.',
            'login.google': 'Weiter mit Google',
            'login.or': 'oder',
            'login.email': 'E-Mail',
            'login.submit': 'Schick mir einen Link',
            'login.sentTitle': 'Schau in dein Postfach',
            'login.sentBody1': 'Wir haben einen Anmeldelink geschickt an ',
            'login.sentBody2': '. Er gilt einmal. Wenn er nicht innerhalb einer Minute da ist, schau im Spam — er kommt von einer lustimacy.com-Adresse.',
            'login.legal1': 'Mit der Anmeldung akzeptierst du unsere ',
            'login.legalTerms': 'Nutzungsbedingungen',
            'login.legal2': ' und die ',
            'login.legalPrivacy': 'Datenschutzerklärung',
            'login.legal3': '. Du musst 18 oder älter sein.',
            'login.pageTitle': 'Anmelden — Lustimacy',
            'login.sending': 'Wird gesendet…',
            'login.googleFail': 'Google war nicht erreichbar. Probier es mit dem E-Mail-Link?',
            'login.linkFail': 'Der Link konnte nicht gesendet werden. Gleich noch einmal versuchen?',
            'login.netFail': 'Server nicht erreichbar. Prüf deine Verbindung und versuch es erneut.',

            'login.errEmail': "Das sieht nicht nach einer E-Mail-Adresse aus.",
            'ob.errPartnerDob': "Wir brauchen auch das Geburtsdatum deines Partners.",
            'ob.errPartnerGender': "Wähl auch das Geschlecht deines Partners.",
            'cb.pageTitle': "Anmeldung läuft — Lustimacy",
            'cb.signingIn': "Du wirst angemeldet…",
            'cb.moment': "Einen Moment.",
            'cb.failTitle': "Dieser Link hat nicht funktioniert",
            'cb.newLink': "Schick mir einen neuen Link",
            'cb.expired': 'Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere einen neuen an, dann klappt es.',
            'cb.direct': 'Diese Seite ist nur über einen Anmeldelink erreichbar. Fordere einen an und du landest wieder hier.',
            'cb.generic': 'Die Anmeldung konnte nicht abgeschlossen werden. Fordere einen frischen Link an.',

            'ob.pageTitle': 'Profil einrichten — Lustimacy',
            'ob.s1Title': 'Fangen wir mit dir an',
            'ob.s1Lede': 'Zwei kurze Schritte. Drei kurze Schritte, dann bist du fertig.',
            'ob.name': 'Dein Name',
            'ob.namePlaceholder': 'Wie man dich nennt',
            'ob.dob': 'Dein Geburtsdatum',
            'ob.who': 'Für wen ist dieses Profil?',
            'ob.partnerDob': 'Geburtsdatum deines Partners',
            'ob.continue': 'Weiter',
            'ob.s2Title': 'Wer du bist, wen du willst',
            'ob.s2Lede': 'Alles nur Tippen. Nichts davon ist öffentlich, bis du es sagst.',
            'ob.gender': 'Dein Geschlecht',
            'ob.partnerGender': 'Geschlecht deines Partners',
            'ob.lookingFor': 'Wofür bist du hier?',
            'ob.orientation': 'Deine Orientierung',
            'ob.back': '← Zurück',
            'ob.s3Title': 'Foto hinzufügen',
            'ob.s3Lede': 'Eines reicht uns. Du kannst bis zu sechs hochladen und sie jederzeit ändern.',
            'ob.s3Verify': 'Nimm Fotos von dir. In der App machst du ein kurzes Selfie, und wir prüfen, ob es dieselbe Person ist.',
            'ob.choosePhotos': 'Fotos auswählen',
            'ob.finish': 'Profil fertigstellen',
            'ob.saving': 'Wird gespeichert…',
            'ob.finishing': 'Fast fertig…',
            'ob.of': ' von ',
            'ob.uploading': 'Lädt hoch ',
            'ob.photoAlt': 'Foto ',
            'ob.removePhoto': 'Foto entfernen ',
            'ob.errName': 'Wie sollen dich die Leute nennen?',
            'ob.errDob': 'Wir brauchen dein Geburtsdatum, um zu bestätigen, dass du 18 oder älter bist.',
            'ob.errDate': 'Dieses Datum sieht nicht richtig aus.',
            'ob.errAge': 'Du musst 18 oder älter sein, um Lustimacy zu nutzen.',
            'ob.errAccount': 'Ist dieses Profil nur für dich oder für euch beide?',
            'ob.errBothAge': 'Ihr müsst beide 18 oder älter sein.',
            'ob.errGender': 'Wähl die Option, die dir am nächsten kommt.',
            'ob.errLooking': 'Sag uns ungefähr, wofür du hier bist.',
            'ob.errOrientation': 'Wähl die Option, die deiner Orientierung am nächsten kommt.',
            'ob.errSave': 'Das konnte nicht gespeichert werden. Gleich noch einmal versuchen?',
            'ob.errNet': 'Server nicht erreichbar. Prüf deine Verbindung und versuch es erneut.',
            'ob.errMaxPhotos': 'Du kannst bis zu {n} Fotos hinzufügen.',
            'ob.errReadFile': '{n} Datei konnte nicht gelesen werden.',
            'ob.errReadFiles': '{n} Dateien konnten nicht gelesen werden.',
            'ob.errOnePhoto': 'Ein Foto reicht uns — aber eines brauchen wir.',
            'ob.errUpload': 'Das konnte nicht hochgeladen werden. Prüf deine Verbindung.',

            'welcome.pageTitle': 'Du bist dabei — Lustimacy',
            'welcome.title': 'Du bist dabei',
            'welcome.signedInAs': 'Angemeldet als ',
            'welcome.checking': 'Wir prüfen dein Profil…',
            'welcome.ready': 'Dein Profil ist fertig. Auf Android öffnest du die App und bist direkt im Deck.',
            'welcome.readyVerify': 'Dein Profil ist fertig. Ein Schritt fehlt noch: Öffne die App und bestätige dich mit einem kurzen Selfie.',
            'verify.title': 'Lustimacy ist nur für verifizierte Mitglieder',
            'verify.b1': 'Alle hier haben uns ihr echtes Gesicht gezeigt. Keine Bots, keine geklauten Fotos, niemand, der sich hinter jemand anderem versteckt.',
            'verify.b2': 'Und die anderen wissen, dass du echt bist. Dein Profil trägt dasselbe Abzeichen, also können die Leute, denen du schreibst, dir vertrauen.',
            'verify.b3': 'Ein Selfie in der App. Es dauert etwa eine Minute, und du machst es nur einmal.',
            'verify.privacy': 'Nur unser Sicherheitsteam sieht dieses Foto. Es kommt nie in dein Profil und wird nie anderen Mitgliedern gezeigt.',
            'welcome.unfinished': 'Dein Profil ist noch nicht fertig, also sieht dich niemand.',
            'welcome.exists': 'Dein Konto existiert. Öffne die App, um dein Profil fertigzustellen.',
            'welcome.finishLink': 'Profil hier fertigstellen',
            'welcome.finishRest': ' — eine Minute und ein Foto. Bis dahin bist du in niemandes Deck.',
            'welcome.openPlay': 'Lustimacy bei Google Play öffnen',
            'welcome.iphone': 'Auf einem iPhone? Eine iOS-App gibt es noch nicht, aber dein Profil ist trotzdem live — Leute auf Android finden und liken dich, und du wartest auf sie, wenn iOS kommt.',
            'welcome.iphoneLink': 'Sag uns, wie wir dich erreichen',
            'welcome.iphoneRest': ', dann erfährst du es zuerst.',
            'welcome.signout': 'Abmelden',
            'welcome.outTitle': 'Du bist nicht angemeldet',
            'welcome.outLede': 'Deine Sitzung ist abgelaufen, oder du bist ohne eine hier gelandet. Ein frischer Link dauert ein paar Sekunden.',
            'welcome.outCta': 'Schick mir einen Link',

            'acct.0': 'Nur ich', 'acct.1': 'Wir zwei',
            'g.0': 'Mann', 'g.1': 'Frau', 'g.2': 'Nicht-binär', 'g.3': 'Trans Mann',
            'g.4': 'Trans Frau', 'g.5': 'Genderqueer', 'g.6': 'Genderfluid',
            'g.7': 'Agender', 'g.8': 'Two-Spirit', 'g.9': 'Andere',
            'o.0': 'Hetero', 'o.1': 'Schwul', 'o.2': 'Lesbisch', 'o.3': 'Bisexuell',
            'o.4': 'Pansexuell', 'o.5': 'Asexuell', 'o.6': 'Demisexuell',
            'o.7': 'Queer', 'o.8': 'Noch unsicher',
            'lf.10': 'Einmaliges Treffen', 'lf.11': 'Freundschaft Plus',
            'lf.12': 'Ethische Nicht-Monogamie', 'lf.13': 'Lockere Dates',
            'lf.14': 'Freundschaften', 'lf.15': 'Weiß ich noch nicht'
        },

        nl: {
            'login.title': 'Inloggen of een account maken',
            'login.lede': 'Geen wachtwoord, hoe dan ook. Hetzelfde account werkt in de app.',
            'login.google': 'Verder met Google',
            'login.or': 'of',
            'login.email': 'E-mailadres',
            'login.submit': 'Stuur me een link',
            'login.sentTitle': 'Kijk in je inbox',
            'login.sentBody1': 'We hebben een inloglink gestuurd naar ',
            'login.sentBody2': '. Hij werkt één keer. Is hij er binnen een minuut niet, kijk dan in je spam — hij komt van een lustimacy.com-adres.',
            'login.legal1': 'Door verder te gaan ga je akkoord met onze ',
            'login.legalTerms': 'Voorwaarden',
            'login.legal2': ' en het ',
            'login.legalPrivacy': 'Privacybeleid',
            'login.legal3': '. Je moet 18 of ouder zijn.',
            'login.pageTitle': 'Inloggen — Lustimacy',
            'login.sending': 'Versturen…',
            'login.googleFail': 'Google was niet bereikbaar. Probeer de e-maillink?',
            'login.linkFail': 'De link kon niet worden verstuurd. Zo nog eens proberen?',
            'login.netFail': 'Server niet bereikbaar. Controleer je verbinding en probeer opnieuw.',

            'login.errEmail': "Dat lijkt geen e-mailadres.",
            'ob.errPartnerDob': "We hebben ook de geboortedatum van je partner nodig.",
            'ob.errPartnerGender': "Kies ook het gender van je partner.",
            'cb.pageTitle': "Je wordt ingelogd — Lustimacy",
            'cb.signingIn': "Je wordt ingelogd…",
            'cb.moment': "Een moment.",
            'cb.failTitle': "Deze link werkte niet",
            'cb.newLink': "Stuur me een nieuwe link",
            'cb.expired': 'Deze link is verlopen of al gebruikt. Vraag een nieuwe aan, dan lukt het wel.',
            'cb.direct': 'Deze pagina is alleen bereikbaar via een inloglink. Vraag er een aan en je komt hier weer uit.',
            'cb.generic': 'Inloggen is niet gelukt. Vraag een nieuwe link aan en probeer opnieuw.',

            'ob.pageTitle': 'Je profiel instellen — Lustimacy',
            'ob.s1Title': 'We beginnen bij jou',
            'ob.s1Lede': 'Twee korte stappen. Drie korte stappen en je bent klaar.',
            'ob.name': 'Je naam',
            'ob.namePlaceholder': 'Hoe mensen je noemen',
            'ob.dob': 'Je geboortedatum',
            'ob.who': 'Voor wie is dit profiel?',
            'ob.partnerDob': 'Geboortedatum van je partner',
            'ob.continue': 'Verder',
            'ob.s2Title': 'Wie je bent, wie je zoekt',
            'ob.s2Lede': 'Alleen tikken. Niets hiervan is openbaar tot jij dat zegt.',
            'ob.gender': 'Je gender',
            'ob.partnerGender': 'Gender van je partner',
            'ob.lookingFor': 'Waarvoor ben je hier?',
            'ob.orientation': 'Je oriëntatie',
            'ob.back': '← Terug',
            'ob.s3Title': 'Voeg een foto toe',
            'ob.s3Lede': 'Één is genoeg. Je kunt er tot zes toevoegen en ze altijd wijzigen.',
            'ob.s3Verify': 'Gebruik foto\'s van jezelf. In de app maak je een snelle selfie, en wij controleren of het dezelfde persoon is.',
            'ob.choosePhotos': "Foto's kiezen",
            'ob.finish': 'Profiel afronden',
            'ob.saving': 'Opslaan…',
            'ob.finishing': 'Afronden…',
            'ob.of': ' van ',
            'ob.uploading': 'Uploaden ',
            'ob.photoAlt': 'Foto ',
            'ob.removePhoto': 'Foto verwijderen ',
            'ob.errName': 'Hoe moeten mensen je noemen?',
            'ob.errDob': 'We hebben je geboortedatum nodig om te bevestigen dat je 18 of ouder bent.',
            'ob.errDate': 'Die datum lijkt niet te kloppen.',
            'ob.errAge': 'Je moet 18 of ouder zijn om Lustimacy te gebruiken.',
            'ob.errAccount': 'Is dit profiel alleen voor jou, of voor jullie samen?',
            'ob.errBothAge': 'Jullie moeten allebei 18 of ouder zijn.',
            'ob.errGender': 'Kies de optie die het dichtst bij je staat.',
            'ob.errLooking': 'Vertel ons ongeveer waarvoor je hier bent.',
            'ob.errOrientation': 'Kies de optie die het dichtst bij je oriëntatie ligt.',
            'ob.errSave': 'Dat kon niet worden opgeslagen. Zo nog eens proberen?',
            'ob.errNet': 'Server niet bereikbaar. Controleer je verbinding en probeer opnieuw.',
            'ob.errMaxPhotos': "Je kunt tot {n} foto's toevoegen.",
            'ob.errReadFile': '{n} bestand kon niet worden gelezen.',
            'ob.errReadFiles': '{n} bestanden konden niet worden gelezen.',
            'ob.errOnePhoto': 'Eén foto is genoeg, maar één hebben we wel nodig.',
            'ob.errUpload': 'Dat kon niet worden geupload. Controleer je verbinding.',

            'welcome.pageTitle': 'Je bent binnen — Lustimacy',
            'welcome.title': 'Je bent binnen',
            'welcome.signedInAs': 'Ingelogd als ',
            'welcome.checking': 'We controleren je profiel…',
            'welcome.ready': 'Je profiel is klaar. Op Android open je de app en zit je meteen in het deck.',
            'welcome.readyVerify': 'Je profiel is klaar. Nog één stap: open de app en verifieer jezelf met een snelle selfie.',
            'verify.title': 'Lustimacy is alleen voor geverifieerde leden',
            'verify.b1': 'Iedereen hier heeft ons een echt gezicht laten zien. Geen bots, geen gestolen foto\'s, niemand die zich achter een ander verschuilt.',
            'verify.b2': 'En zij weten dat jij echt bent. Jouw profiel krijgt dezelfde badge, dus wie jij een bericht stuurt kan erop vertrouwen dat jij het bent.',
            'verify.b3': 'Eén selfie in de app. Het kost ongeveer een minuut, en je doet het maar één keer.',
            'verify.privacy': 'Alleen ons veiligheidsteam ziet die foto. Hij komt nooit op je profiel en wordt nooit aan andere leden getoond.',
            'welcome.unfinished': 'Je profiel is nog niet af, dus niemand kan je zien.',
            'welcome.exists': 'Je account bestaat. Open de app om je profiel af te maken.',
            'welcome.finishLink': 'Maak je profiel hier af',
            'welcome.finishRest': ' — een minuut en één foto. Tot die tijd sta je in niemands deck.',
            'welcome.openPlay': 'Lustimacy openen op Google Play',
            'welcome.iphone': 'Op een iPhone? Er is nog geen iOS-app, maar je profiel staat hoe dan ook live — mensen op Android kunnen je vinden en liken, en jij wacht op ze zodra iOS er is.',
            'welcome.iphoneLink': 'Laat weten waar we je kunnen bereiken',
            'welcome.iphoneRest': ' en je hoort het als eerste.',
            'welcome.signout': 'Uitloggen',
            'welcome.outTitle': 'Je bent niet ingelogd',
            'welcome.outLede': 'Je sessie is verlopen, of je kwam hier zonder. Een nieuwe link kost een paar seconden.',
            'welcome.outCta': 'Stuur me een link',

            'acct.0': 'Alleen ik', 'acct.1': 'Wij samen',
            'g.0': 'Man', 'g.1': 'Vrouw', 'g.2': 'Non-binair', 'g.3': 'Transman',
            'g.4': 'Transvrouw', 'g.5': 'Genderqueer', 'g.6': 'Genderfluid',
            'g.7': 'Agender', 'g.8': 'Two-spirit', 'g.9': 'Anders',
            'o.0': 'Hetero', 'o.1': 'Homo', 'o.2': 'Lesbisch', 'o.3': 'Biseksueel',
            'o.4': 'Panseksueel', 'o.5': 'Aseksueel', 'o.6': 'Demiseksueel',
            'o.7': 'Queer', 'o.8': 'Nog aan het ontdekken',
            'lf.10': 'Eenmalige ontmoeting', 'lf.11': 'Vriendschap plus',
            'lf.12': 'Ethische non-monogamie', 'lf.13': 'Losse dates',
            'lf.14': 'Vriendschappen', 'lf.15': 'Weet ik nog niet'
        },

        fr: {
            'login.title': 'Se connecter ou créer un compte',
            'login.lede': 'Pas de mot de passe, dans les deux cas. Le même compte fonctionne dans l’app.',
            'login.google': 'Continuer avec Google',
            'login.or': 'ou',
            'login.email': 'E-mail',
            'login.submit': 'Envoyez-moi un lien',
            'login.sentTitle': 'Regardez votre boîte mail',
            'login.sentBody1': 'Nous avons envoyé un lien de connexion à ',
            'login.sentBody2': '. Il ne fonctionne qu’une fois. S’il n’arrive pas dans la minute, regardez dans vos spams — il vient d’une adresse lustimacy.com.',
            'login.legal1': 'En continuant, vous acceptez nos ',
            'login.legalTerms': 'Conditions',
            'login.legal2': ' et notre ',
            'login.legalPrivacy': 'Politique de confidentialité',
            'login.legal3': '. Vous devez avoir 18 ans ou plus.',
            'login.pageTitle': 'Connexion — Lustimacy',
            'login.sending': 'Envoi…',
            'login.googleFail': 'Google est injoignable. Essayez plutôt le lien par e-mail ?',
            'login.linkFail': 'Le lien n’a pas pu être envoyé. Réessayez dans un instant ?',
            'login.netFail': 'Serveur injoignable. Vérifiez votre connexion et réessayez.',

            'login.errEmail': "Cela ne ressemble pas à une adresse e-mail.",
            'ob.errPartnerDob': "Il nous faut aussi la date de naissance de votre partenaire.",
            'ob.errPartnerGender': "Choisissez aussi le genre de votre partenaire.",
            'cb.pageTitle': "Connexion en cours — Lustimacy",
            'cb.signingIn': "Connexion en cours…",
            'cb.moment': "Un instant.",
            'cb.failTitle': "Ce lien n’a pas fonctionné",
            'cb.newLink': "Envoyez-moi un nouveau lien",
            'cb.expired': 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau et ça marchera.',
            'cb.direct': 'Cette page n’est accessible que depuis un lien de connexion. Demandez-en un et vous reviendrez ici.',
            'cb.generic': 'La connexion n’a pas abouti. Demandez un nouveau lien et réessayez.',

            'ob.pageTitle': 'Configurez votre profil — Lustimacy',
            'ob.s1Title': 'Commençons par vous',
            'ob.s1Lede': 'Deux étapes courtes. Trois étapes courtes et c’est fini.',
            'ob.name': 'Votre prénom',
            'ob.namePlaceholder': 'Comment on vous appelle',
            'ob.dob': 'Votre date de naissance',
            'ob.who': 'Ce profil est pour qui ?',
            'ob.partnerDob': 'Date de naissance de votre partenaire',
            'ob.continue': 'Continuer',
            'ob.s2Title': 'Qui vous êtes, qui vous cherchez',
            'ob.s2Lede': 'Rien que des clics. Rien ici n’est public tant que vous ne le dites pas.',
            'ob.gender': 'Votre genre',
            'ob.partnerGender': 'Genre de votre partenaire',
            'ob.lookingFor': 'Vous êtes ici pour quoi ?',
            'ob.orientation': 'Votre orientation',
            'ob.back': '← Retour',
            'ob.s3Title': 'Ajoutez une photo',
            'ob.s3Lede': 'Une seule suffit. Vous pouvez en mettre jusqu’à six et les changer quand vous voulez.',
            'ob.s3Verify': 'Utilise des photos de toi. Dans l\'application, tu prendras un selfie rapide et nous vérifions que c\'est la même personne.',
            'ob.choosePhotos': 'Choisir des photos',
            'ob.finish': 'Terminer mon profil',
            'ob.saving': 'Enregistrement…',
            'ob.finishing': 'Finalisation…',
            'ob.of': ' sur ',
            'ob.uploading': 'Envoi ',
            'ob.photoAlt': 'Photo ',
            'ob.removePhoto': 'Supprimer la photo ',
            'ob.errName': 'Comment doit-on vous appeler ?',
            'ob.errDob': 'Nous avons besoin de votre date de naissance pour confirmer que vous avez 18 ans ou plus.',
            'ob.errDate': 'Cette date ne semble pas correcte.',
            'ob.errAge': 'Vous devez avoir 18 ans ou plus pour utiliser Lustimacy.',
            'ob.errAccount': 'Ce profil est pour vous seul, ou pour vous deux ?',
            'ob.errBothAge': 'Vous devez tous les deux avoir 18 ans ou plus.',
            'ob.errGender': 'Choisissez l’option la plus proche de vous.',
            'ob.errLooking': 'Dites-nous en gros ce que vous cherchez.',
            'ob.errOrientation': 'Choisissez l’option la plus proche de votre orientation.',
            'ob.errSave': 'Impossible d’enregistrer. Réessayez dans un instant ?',
            'ob.errNet': 'Serveur injoignable. Vérifiez votre connexion et réessayez.',
            'ob.errMaxPhotos': 'Vous pouvez ajouter jusqu’à {n} photos.',
            'ob.errReadFile': 'Impossible de lire {n} fichier.',
            'ob.errReadFiles': 'Impossible de lire {n} fichiers.',
            'ob.errOnePhoto': 'Une seule photo suffit, mais il en faut une.',
            'ob.errUpload': 'Impossible d’envoyer ça. Vérifiez votre connexion.',

            'welcome.pageTitle': 'Vous y êtes — Lustimacy',
            'welcome.title': 'Vous y êtes',
            'welcome.signedInAs': 'Connecté en tant que ',
            'welcome.checking': 'Nous vérifions votre profil…',
            'welcome.ready': 'Votre profil est prêt. Sur Android, ouvrez l’app et vous êtes directement dans le deck.',
            'welcome.readyVerify': 'Ton profil est prêt. Il reste une étape : ouvre l\'application et vérifie-toi avec un selfie rapide.',
            'verify.title': 'Lustimacy est réservé aux membres vérifiés',
            'verify.b1': 'Tout le monde ici nous a montré un vrai visage. Pas de bots, pas de photos volées, personne qui se cache derrière quelqu\'un d\'autre.',
            'verify.b2': 'Et les autres sauront que tu es réel. Ton profil porte le même badge, donc les personnes à qui tu écris peuvent te faire confiance.',
            'verify.b3': 'Un selfie dans l\'application. Cela prend environ une minute, et tu ne le fais qu\'une fois.',
            'verify.privacy': 'Seule notre équipe sécurité voit cette photo. Elle n\'est jamais ajoutée à ton profil ni montrée aux autres membres.',
            'welcome.unfinished': 'Votre profil n’est pas encore terminé, donc personne ne vous voit.',
            'welcome.exists': 'Votre compte existe. Ouvrez l’app pour terminer votre profil.',
            'welcome.finishLink': 'Terminez votre profil ici',
            'welcome.finishRest': ' — une minute et une photo. D’ici là vous n’êtes dans le deck de personne.',
            'welcome.openPlay': 'Ouvrir Lustimacy sur Google Play',
            'welcome.iphone': 'Sur iPhone ? Il n’y a pas encore d’app iOS, mais votre profil est en ligne quand même — les gens sur Android peuvent vous trouver et vous liker, et vous les attendrez quand iOS arrivera.',
            'welcome.iphoneLink': 'Dites-nous où vous joindre',
            'welcome.iphoneRest': ' et vous serez prévenu en premier.',
            'welcome.signout': 'Se déconnecter',
            'welcome.outTitle': 'Vous n’êtes pas connecté',
            'welcome.outLede': 'Votre session a expiré, ou vous êtes arrivé ici sans. Un nouveau lien prend quelques secondes.',
            'welcome.outCta': 'Envoyez-moi un lien',

            'acct.0': 'Moi seul', 'acct.1': 'Nous deux',
            'g.0': 'Homme', 'g.1': 'Femme', 'g.2': 'Non-binaire', 'g.3': 'Homme trans',
            'g.4': 'Femme trans', 'g.5': 'Genderqueer', 'g.6': 'Genderfluid',
            'g.7': 'Agenre', 'g.8': 'Bispirituel', 'g.9': 'Autre',
            'o.0': 'Hétéro', 'o.1': 'Gay', 'o.2': 'Lesbienne', 'o.3': 'Bisexuel',
            'o.4': 'Pansexuel', 'o.5': 'Asexuel', 'o.6': 'Démisexuel',
            'o.7': 'Queer', 'o.8': 'En questionnement',
            'lf.10': 'Rencontre d’un soir', 'lf.11': 'Amis avec bénéfices',
            'lf.12': 'Non-monogamie éthique', 'lf.13': 'Rendez-vous décontractés',
            'lf.14': 'Amitiés', 'lf.15': 'Je cherche encore'
        }
    };

    var SUPPORTED = ['en', 'de', 'nl', 'fr'];

    function normalise(v) {
        if (!v) return null;
        var tag = String(v).toLowerCase().split('-')[0];
        return SUPPORTED.indexOf(tag) >= 0 ? tag : null;
    }

    function fromQuery() {
        try {
            return normalise(new URLSearchParams(window.location.search).get('lang'));
        } catch (_) { return null; }
    }

    function fromCookie() {
        var m = document.cookie.match(/(?:^|;\s*)lustimacy-locale=([^;]+)/);
        return m ? normalise(decodeURIComponent(m[1])) : null;
    }

    // A cookie, not sessionStorage. sessionStorage is scoped to one tab, and
    // the single most important hop in this flow — clicking the link in the
    // sign-in email — always opens a new tab, which gets an empty one. That is
    // exactly the moment the language was being lost.
    //
    // Its own cookie rather than lustimacy-locale: that one records an explicit
    // choice from the switcher and pins the whole site against the middleware's
    // IP and Accept-Language resolution. Reading a French page is not the same
    // as asking for French forever.
    function fromStored() {
        var m = document.cookie.match(/(?:^|;\s*)lustimacy-lang=([^;]+)/);
        return m ? normalise(decodeURIComponent(m[1])) : null;
    }

    function store(value) {
        try {
            document.cookie = 'lustimacy-lang=' + encodeURIComponent(value) +
                '; Path=/; Max-Age=' + (60 * 60 * 24 * 365) + '; SameSite=Lax';
        } catch (_) { /* cookies blocked; the flow still works, just in English */ }
    }

    function resolve() {
        return fromQuery() || fromCookie() || fromStored()
            || normalise(document.documentElement.lang)
            || normalise(navigator.language)
            || 'en';
    }

    var lang = resolve();
    store(lang);
    document.documentElement.lang = lang;

    function t(key, vars) {
        var table = DICT[lang] || DICT.en;
        var s = table[key];
        if (s === undefined) s = DICT.en[key];
        if (s === undefined) return key;
        if (vars) {
            for (var k in vars) {
                if (Object.prototype.hasOwnProperty.call(vars, k)) {
                    s = s.split('{' + k + '}').join(vars[k]);
                }
            }
        }
        return s;
    }

    /** Appends ?lang= to a same-site path so the next page keeps the language. */
    function withLang(path) {
        if (lang === 'en') return path;
        return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + lang;
    }

    // Applies every [data-i18n] in the document. Text by default; an attribute
    // instead when data-i18n-attr names one, which is how placeholders, titles
    // and aria-labels are reached.
    function apply(root) {
        var scope = root || document;
        var nodes = scope.querySelectorAll('[data-i18n]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var key = el.getAttribute('data-i18n');
            var attr = el.getAttribute('data-i18n-attr');
            var val = t(key);
            if (attr) el.setAttribute(attr, val);
            else el.textContent = val;
        }
        var title = scope.querySelector('[data-i18n-title]');
        if (title) document.title = t(title.getAttribute('data-i18n-title'));
        // Any link to another page in the flow carries the language with it.
        var links = scope.querySelectorAll('a[data-i18n-href]');
        for (var j = 0; j < links.length; j++) {
            links[j].setAttribute('href', withLang(links[j].getAttribute('data-i18n-href')));
        }
    }

    /**
     * Switches language and re-renders. Used once a session exists: the auth
     * user carries the language they signed up in, which is the only signal
     * that survives the email being opened on another device entirely.
     */
    function setLang(next) {
        var n = normalise(next);
        if (!n || n === lang) return false;
        lang = n;
        window.LustI18n.lang = n;
        store(n);
        document.documentElement.lang = n;
        apply();
        return true;
    }

    window.LustI18n = { lang: lang, t: t, withLang: withLang, apply: apply, setLang: setLang };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { apply(); });
    } else {
        apply();
    }
})();
