// Lustimacy web auth.
//
// Email magic link only, deliberately. The Android app already signs people in
// with signInWith(OTP) against the same Supabase project, so a web account and
// an app account are the same account — sign up here, open the app, and the
// profile is already there.
//
// There is no password anywhere in this flow. Nothing to reset, nothing to
// leak, and one less field between a blog reader and an account.
//
// The users row is NOT created here. A database trigger (on_auth_user_created,
// and on_auth_user_updated for the first real sign-in) inserts id, email and
// name into public.users the moment last_sign_in_at becomes non-null. Web only
// has to fill in the rest afterwards.

(function () {
    'use strict';

    // Translations live in auth-i18n.js, which is loaded first on every page
    // that loads this file. The fallback keeps a missing dictionary from
    // taking the flow down — an untranslated label is a far smaller problem
    // than a signup that cannot complete.
    function t(key, vars) {
        return (window.LustI18n && window.LustI18n.t)
            ? window.LustI18n.t(key, vars)
            : key;
    }
    function withLang(path) {
        return (window.LustI18n && window.LustI18n.withLang)
            ? window.LustI18n.withLang(path)
            : path;
    }

    /**
     * Adopts the language recorded on the auth user.
     *
     * The strongest signal available, and the only one that survives the email
     * being opened somewhere else: the account itself remembers what language
     * the person signed up in, and send-auth-email wrote the message in that
     * same language, so the page and the email always agree.
     *
     * Call it before any redirect, so withLang() carries the right one onward.
     */
    function adoptUserLang(session) {
        if (!session || !session.user) return;
        var meta = session.user.user_metadata || {};
        var stored = meta.lang || meta.locale || meta.language;

        if (stored) {
            if (window.LustI18n && window.LustI18n.setLang) {
                window.LustI18n.setLang(stored);
            }
            return;
        }

        // No language on the account: every user who signed up before this
        // shipped is in that state, which is why their sign-in email still
        // arrives in English. Backfill it so the next one does not.
        //
        // Only when we have positive evidence — they are reading a non-English
        // page right now. Writing 'en' on no evidence would permanently stamp
        // English onto someone whose cookie simply had not been set yet.
        var current = window.LustI18n && window.LustI18n.lang;
        if (current && current !== 'en') {
            sb().auth.updateUser({ data: { lang: current } })
                .catch(function (e) { console.warn('[auth] could not store lang', e); });
        }
    }


    // Publishable key — public by design; row-level security is what protects
    // the data. Same project the app talks to.
    var SUPABASE_URL = 'https://jnaxgadklstwicjrzatk.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_fjGtaiJCMsp2jys29KJD8g_TFyaQcFN';

    var client = null;
    function sb() {
        if (!client) {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                // implicit, not pkce. PKCE keeps a code_verifier in the local
                // storage of the browser that REQUESTED the link, and the
                // exchange is impossible without it. Mail is routinely opened
                // somewhere else — the Gmail app's in-app webview, a different
                // default browser, a phone when the request came from a laptop
                // — and every one of those has its own storage, so the link
                // could never work. Implicit puts the tokens in the link
                // itself, so it completes wherever it is opened.
                //
                // detectSessionInUrl stays OFF: the callback reads the tokens
                // and calls setSession itself, so a session already in storage
                // can never be mistaken for a successful sign-in.
                auth: { flowType: 'implicit', detectSessionInUrl: false, persistSession: true }
            });
        }
        return client;
    }

    function track(name, props) {
        try { if (window.plausible) window.plausible(name, props ? { props: props } : undefined); } catch (e) {}
    }

    var isEmail = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); };

    // ---- /login -------------------------------------------------------------
    function initLogin() {
        var form = document.getElementById('authForm');
        if (!form) return;

        // Google first: it skips the round trip through an inbox, which is
        // where an email-link flow loses most people. Same redirect target as
        // the magic link, so one allowlist entry covers both.
        var google = document.querySelector('[data-auth-google]');
        if (google) {
            google.addEventListener('click', function () {
                google.disabled = true;
                track('AuthGoogleClick');
                sb().auth.signInWithOAuth({
                    provider: 'google',
                    // The callback URL is sent bare, with no ?lang=. Supabase validates
                    // redirect_to against the configured allow list, and the entry
                    // there is the exact URL — an exact entry does not match a URL
                    // carrying a query string, so adding one would have Supabase fall
                    // back to the Site URL and strand every non-English sign-in.
                    //
                    // The language survives anyway: sessionStorage and the cookie
                    // carry it on the same device, which is the common case, and on
                    // another device navigator.language is a better guess than a
                    // parameter that never arrives. To carry it explicitly, add
                    // https://lustimacy.com/auth/callback.html?* to the Redirect URLs
                    // and restore withLang() here.
                    options: { redirectTo: window.location.origin + '/auth/callback.html' }
                }).then(function (r) {
                    if (r && r.error) {
                        google.disabled = false;
                        track('AuthGoogleError', { message: r.error.message });
                        var e = document.querySelector('[data-auth-error]');
                        e.textContent = t('login.googleFail');
                        e.hidden = false;
                    }
                }).catch(function () { google.disabled = false; });
            });
        }

        var input   = form.querySelector('[name="email"]');
        var button  = form.querySelector('button[type="submit"]');
        var errEl   = document.querySelector('[data-auth-error]');
        var doneEl  = document.querySelector('[data-auth-sent]');
        var sentTo  = document.querySelector('[data-auth-sent-to]');

        function fail(msg) {
            errEl.textContent = msg;
            errEl.hidden = false;
            button.disabled = false;
            button.textContent = button.dataset.label;
        }

        button.dataset.label = button.textContent;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            errEl.hidden = true;

            var email = (input.value || '').trim();
            if (!isEmail(email)) { fail(t('login.errEmail')); return; }

            button.disabled = true;
            button.textContent = t('login.sending');
            track('AuthLinkRequested');

            sb().auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: window.location.origin + '/auth/callback.html',
                    // Recorded on the auth user so send-auth-email knows which
                    // language to write in. Supabase only applies `data` when
                    // it creates the user, so for a returning visitor this is
                    // the language they signed up in — usually right, and the
                    // only signal available while ?lang= has to stay off the
                    // redirect URL.
                    data: { lang: (window.LustI18n && window.LustI18n.lang) || 'en' }
                }
            }).then(function (res) {
                if (res.error) {
                    track('AuthLinkError', { message: res.error.message });
                    fail(res.error.message || t('login.linkFail'));
                    return;
                }
                if (sentTo) sentTo.textContent = email;
                form.hidden = true;
                doneEl.hidden = false;
                track('AuthLinkSent');
            }).catch(function () {
                fail(t('login.netFail'));
            });
        });
    }

    // ---- /auth/callback -----------------------------------------------------
    // Exchanges the code in the URL for a session, and trusts nothing else.
    //
    // The previous version waited for "a session to exist" — via a poll and an
    // auth-state subscription — and treated whatever turned up as success. If
    // the browser already held a session from an earlier sign-in, the first
    // poll returned that one immediately and signed the visitor in as the
    // previous user, before this link's code had been exchanged at all. A
    // session being present is not evidence that THIS link worked.
    function initCallback() {
        var root = document.getElementById('authCallback');
        if (!root) return;

        var statusEl = root.querySelector('[data-callback-status]');
        var errEl    = root.querySelector('[data-callback-error]');
        var settled  = false;

        function failed(msg, detail) {
            if (settled) return;
            settled = true;
            statusEl.hidden = true;
            errEl.querySelector('[data-callback-message]').textContent = msg;
            errEl.hidden = false;
            if (detail) console.error('[auth callback]', detail);
            track('AuthCallbackError', { message: String(detail || msg).slice(0, 90) });
        }

        function succeeded(session) {
            if (settled) return;
            settled = true;
            adoptUserLang(session);
            track('AuthSignedIn');
            sb().from('users').select('birthday').eq('id', session.user.id).single()
              .then(function (r) {
                  window.location.replace(withLang(r.data && r.data.birthday ? '/welcome' : '/onboarding'));
              })
              .catch(function () { window.location.replace(withLang('/welcome')); });
        }

        var qs   = new URLSearchParams(window.location.search);
        var hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));

        // Supabase reports its own failures in the URL. Show them rather than
        // inventing a reason.
        var urlError = qs.get('error_description') || hash.get('error_description')
                    || qs.get('error') || hash.get('error');
        if (urlError) {
            var text = decodeURIComponent(String(urlError).replace(/\+/g, ' '));
            failed(/expired|invalid/i.test(text)
                ? t('cb.expired')
                : text, text);
            return;
        }

        var code = qs.get('code');
        var accessToken = hash.get('access_token');

        if (!code && !accessToken) {
            failed(t('cb.direct'),
                   'no code or access_token present');
            return;
        }

        // NOTE: do not sign out before exchanging. PKCE keeps its code_verifier
        // in the same local storage that signOut clears, so clearing first
        // destroys the one value the exchange needs. Guarding against a stale
        // session is handled by only ever accepting the exchange's own result,
        // which overwrites whatever was stored anyway.
        var work;
        if (code) {
            work = sb().auth.exchangeCodeForSession(code).then(function (res) {
                if (res.error) throw res.error;
                if (!res.data || !res.data.session) throw new Error('exchange returned no session');
                succeeded(res.data.session);
            });
        } else {
            // Implicit flow, if it is ever turned on: the tokens are the result.
            work = sb().auth.setSession({
                access_token: accessToken,
                refresh_token: hash.get('refresh_token')
            }).then(function (res) {
                if (res.error) throw res.error;
                if (!res.data || !res.data.session) throw new Error('setSession returned no session');
                succeeded(res.data.session);
            });
        }
        work.catch(function (e) {
            var m = (e && e.message) || String(e);
            failed(/expired|invalid|not found|already/i.test(m)
                ? t('cb.expired')
                : t('cb.generic'), m);
            var hint = root.querySelector('[data-callback-detail]');
            if (hint) { hint.textContent = m; hint.hidden = false; }
        });
    }

    // ---- /welcome -----------------------------------------------------------
    function initWelcome() {
        var root = document.getElementById('authWelcome');
        if (!root) return;

        var signedOut = root.querySelector('[data-welcome-signedout]');
        var signedIn  = root.querySelector('[data-welcome-signedin]');
        var emailEl   = root.querySelector('[data-welcome-email]');
        var stateEl   = root.querySelector('[data-welcome-state]');
        var signOut   = root.querySelector('[data-welcome-signout]');

        sb().auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (!session) { signedOut.hidden = false; return; }
            adoptUserLang(session);

            emailEl.textContent = session.user.email || '';
            signedIn.hidden = false;

            // Same flag the app reads to choose between onboarding and the deck.
            sb().from('users').select('is_profile_setup_complete, birthday').eq('id', session.user.id).single()
              .then(function (r) {
                  var complete = r.data && r.data.is_profile_setup_complete;
                  stateEl.textContent = complete
                      ? t('welcome.ready')
                      : t('welcome.unfinished');
                  var finish = root.querySelector('[data-welcome-finish]');
                  // Only offer the web form to someone who never filled it in.
                  if (finish && !complete) finish.hidden = false;
              })
              .catch(function () {
                  stateEl.textContent = t('welcome.exists');
              });
        });

        if (signOut) {
            signOut.addEventListener('click', function (e) {
                e.preventDefault();
                sb().auth.signOut().then(function () {
                    var home = window.LustI18n && window.LustI18n.lang !== 'en'
                        ? '/' + window.LustI18n.lang + '/' : '/';
                    window.location.replace(home);
                });
            });
        }
    }


    // ---- /onboarding --------------------------------------------------------
    // Mirrors the app's three gated screens, photos included.
    //
    // Photos are here rather than deferred to the app because iPhone users
    // cannot install the app at all yet, and a profile without a photo is not
    // matchable. Web has to be able to produce a complete profile on its own,
    // or iOS visitors can never be in the deck.
    //
    // Integer encodings are the app's, verified against the schema:
    //   gender / partner_gender  0..9
    //   sexual_orientation       0..8
    //   looking_for              10..15   (starts at 10, not 0)
    //   account_type             0 single, 1 couple
    // Labels come from the dictionary; the indexes are the contract with the
    // database and must not move. looking_for starts at 10, not 0.
    function labels(prefix, count, offset) {
        var out = [], base = offset || 0;
        for (var i = 0; i < count; i++) out.push([base + i, t(prefix + '.' + (base + i))]);
        return out;
    }
    var GENDER = labels('g', 10).map(function (p) { return p[1]; });
    var ORIENTATION = labels('o', 9).map(function (p) { return p[1]; });
    var LOOKING_FOR = labels('lf', 6, 10);

    // Same pipeline the app uses: longest edge 1000, quality 80, WEBP.
    var IMAGE_SIZE = 1000, IMAGE_QUALITY = 0.8;
    var MAX_PHOTOS = 6;              // EditProfilePhotoGridAdapter.MAX_NUM_PHOTOS
    var PHOTO_BUCKET = 'profile_photos';

    // Storage policy requires exactly "<uid>/<photoId>" — two segments, first
    // equal to auth.uid(). Matches the 32-char alphanumeric ids already in
    // users.profile_photos.
    function photoId() {
        var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var out = '', bytes = new Uint8Array(32);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        for (var i = 0; i < 32; i++) out += abc[bytes[i] % abc.length];
        return out;
    }

    // Decoding through createImageBitmap honours EXIF orientation, which an
    // <img> does not do reliably — without it, photos taken on a phone come out
    // rotated. Re-encoding also drops EXIF entirely, including GPS, which is
    // the same side effect the app relies on.
    function decode(file) {
        if (window.createImageBitmap) {
            try {
                return createImageBitmap(file, { imageOrientation: 'from-image' });
            } catch (e) { /* older signature; fall through */ }
        }
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(new Error('unreadable')); };
            img.src = URL.createObjectURL(file);
        });
    }

    function toBlob(canvas) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (b) {
                if (b && b.type === 'image/webp') { resolve({ blob: b, type: 'image/webp' }); return; }
                // Safari used to refuse webp encoding; JPEG is read fine by
                // both Glide and the browser.
                canvas.toBlob(function (j) {
                    j ? resolve({ blob: j, type: 'image/jpeg' }) : reject(new Error('encode failed'));
                }, 'image/jpeg', IMAGE_QUALITY);
            }, 'image/webp', IMAGE_QUALITY);
        });
    }

    function prepare(file) {
        return decode(file).then(function (src) {
            var w = src.width, h = src.height;
            var scale = Math.min(1, IMAGE_SIZE / Math.max(w, h));
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(src, 0, 0, w, h);
            if (src.close) src.close();
            return toBlob(c);
        });
    }

    function initOnboarding() {
        var root = document.getElementById('onboarding');
        if (!root) return;

        var state = { account_type: null, gender: null, partner_gender: null,
                      looking_for: null, sexual_orientation: null };
        var photos = [];                       // { file, blob, type, url }

        var steps = { 1: root.querySelector('[data-ob-step="1"]'),
                      2: root.querySelector('[data-ob-step="2"]'),
                      3: root.querySelector('[data-ob-step="3"]') };
        var progress = root.querySelector('[data-ob-progress]');
        var coupleOnly = root.querySelectorAll('[data-ob-couple]');
        var current = 1;

        // Each step carries its own error line. Writing to the first one found
        // would put step 2 and 3 errors inside a hidden section, where nobody
        // would ever see them.
        function errEl() { return steps[current].querySelector('[data-ob-error]'); }
        function err(msg) { var e = errEl(); e.textContent = msg; e.hidden = false; }
        function clearErr() {
            root.querySelectorAll('[data-ob-error]').forEach(function (e) { e.hidden = true; });
        }

        function show(n) {
            current = n;
            Object.keys(steps).forEach(function (k) { steps[k].hidden = (+k !== n); });
            progress.style.width = Math.round(n / 3 * 100) + '%';
            clearErr();
            window.scrollTo(0, 0);
            track('OnboardingStep' + n);
        }

        function chips(host, items, key, onPick) {
            host.innerHTML = '';
            items.forEach(function (it, idx) {
                var value = Array.isArray(it) ? it[0] : idx;
                var label = Array.isArray(it) ? it[1] : it;
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'ob__chip';
                b.textContent = label;
                b.setAttribute('aria-pressed', 'false');
                b.addEventListener('click', function () {
                    state[key] = value;
                    host.querySelectorAll('.ob__chip').forEach(function (o) {
                        o.classList.remove('is-on'); o.setAttribute('aria-pressed','false');
                    });
                    b.classList.add('is-on'); b.setAttribute('aria-pressed','true');
                    clearErr();
                    if (onPick) onPick(value);
                });
                host.appendChild(b);
            });
        }

        chips(root.querySelector('[data-ob-account]'), [[0, t('acct.0')], [1, t('acct.1')]], 'account_type',
              function (v) { coupleOnly.forEach(function (el) { el.hidden = (v !== 1); }); });
        chips(root.querySelector('[data-ob-gender]'), GENDER, 'gender');
        chips(root.querySelector('[data-ob-partner-gender]'), GENDER, 'partner_gender');
        chips(root.querySelector('[data-ob-looking]'), LOOKING_FOR, 'looking_for');
        chips(root.querySelector('[data-ob-orientation]'), ORIENTATION, 'sexual_orientation');

        var nameEl = root.querySelector('[name="name"]');
        var dobEl  = root.querySelector('[name="birthday"]');
        var pdobEl = root.querySelector('[name="partner_birthday"]');

        function age(iso) {
            var d = new Date(iso + 'T00:00:00');
            if (isNaN(d)) return NaN;
            var t = new Date(), a = t.getFullYear() - d.getFullYear();
            var m = t.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
            return a;
        }

        function uid() {
            return sb().auth.getSession().then(function (r) {
                var sess = r.data && r.data.session;
                if (!sess) { window.location.replace(withLang('/login')); throw new Error('no session'); }
                adoptUserLang(sess);
                return sess.user.id;
            });
        }

        // ---- step 1 -> 2
        root.querySelector('[data-ob-next]').addEventListener('click', function () {
            clearErr();
            if (!nameEl.value.trim())        return err(t('ob.errName'));
            if (!dobEl.value)                return err(t('ob.errDob'));
            var a = age(dobEl.value);
            if (isNaN(a) || a > 120)         return err(t('ob.errDate'));
            if (a < 18)                      return err(t('ob.errAge'));
            if (state.account_type === null) return err(t('ob.errAccount'));
            if (state.account_type === 1) {
                if (!pdobEl.value)           return err(t('ob.errPartnerDob'));
                var pa = age(pdobEl.value);
                if (isNaN(pa) || pa > 120)   return err(t('ob.errDate'));
                if (pa < 18)                 return err(t('ob.errBothAge'));
            }
            show(2);
        });

        root.querySelector('[data-ob-back]').addEventListener('click', function () { show(1); });
        root.querySelector('[data-ob-back-2]').addEventListener('click', function () { show(2); });

        // ---- step 2 -> 3. Saves the typed fields now, so abandoning at the
        // photo step does not lose them — the same way the app saves per screen.
        var next2 = root.querySelector('[data-ob-next-2]');
        next2.addEventListener('click', function () {
            clearErr();
            if (state.gender === null)             return err(t('ob.errGender'));
            if (state.account_type === 1 && state.partner_gender === null)
                                                   return err(t('ob.errPartnerGender'));
            if (state.looking_for === null)        return err(t('ob.errLooking'));
            if (state.sexual_orientation === null) return err(t('ob.errOrientation'));

            next2.disabled = true;
            var label = next2.textContent; next2.textContent = t('ob.saving');

            uid().then(function (id) {
                var row = {
                    name: nameEl.value.trim(),
                    birthday: dobEl.value,
                    account_type: state.account_type,
                    gender: state.gender,
                    looking_for: state.looking_for,
                    sexual_orientation: state.sexual_orientation
                };
                if (state.account_type === 1) {
                    row.partner_birthday = pdobEl.value;
                    row.partner_gender = state.partner_gender;
                }
                return sb().from('users').update(row).eq('id', id);
            }).then(function (r) {
                next2.disabled = false; next2.textContent = label;
                if (r && r.error) { track('OnboardingError', { message: r.error.message });
                                    return err(t('ob.errSave')); }
                show(3);
            }).catch(function (e) {
                if (e && e.message === 'no session') return;
                next2.disabled = false; next2.textContent = label;
                err(t('ob.errNet'));
            });
        });

        // ---- step 3, photos
        var fileEl  = root.querySelector('[data-ob-file]');
        var gridEl  = root.querySelector('[data-ob-grid]');
        var countEl = root.querySelector('[data-ob-count]');

        function renderGrid() {
            gridEl.innerHTML = '';
            photos.forEach(function (p, i) {
                var cell = document.createElement('div');
                cell.className = 'ob__photo';
                var img = document.createElement('img');
                img.src = p.url; img.alt = t('ob.photoAlt') + (i + 1);
                var del = document.createElement('button');
                del.type = 'button'; del.className = 'ob__photo-remove';
                del.setAttribute('aria-label', t('ob.removePhoto') + (i + 1));
                del.textContent = '×';
                del.addEventListener('click', function () {
                    URL.revokeObjectURL(p.url);
                    photos.splice(i, 1); renderGrid(); clearErr();
                });
                cell.appendChild(img); cell.appendChild(del);
                gridEl.appendChild(cell);
            });
            countEl.textContent = photos.length + t('ob.of') + MAX_PHOTOS;
            fileEl.parentElement.hidden = photos.length >= MAX_PHOTOS;
        }

        fileEl.addEventListener('change', function () {
            clearErr();
            var files = Array.prototype.slice.call(fileEl.files || []);
            fileEl.value = '';
            if (!files.length) return;

            var room = MAX_PHOTOS - photos.length;
            if (files.length > room) { files = files.slice(0, room); err(t('ob.errMaxPhotos', { n: MAX_PHOTOS })); }

            Promise.all(files.map(function (f) {
                if (!/^image\//.test(f.type)) return null;
                return prepare(f).then(function (res) {
                    return { blob: res.blob, type: res.type, url: URL.createObjectURL(res.blob) };
                }).catch(function () { return null; });
            })).then(function (made) {
                var bad = 0;
                made.forEach(function (m) { m ? photos.push(m) : bad++; });
                if (bad) err(t(bad === 1 ? 'ob.errReadFile' : 'ob.errReadFiles', { n: bad }));
                renderGrid();
            });
        });

        var finish = root.querySelector('[data-ob-finish]');
        finish.addEventListener('click', function () {
            clearErr();
            if (!photos.length) return err(t('ob.errOnePhoto'));

            finish.disabled = true;
            var label = finish.textContent;
            var done = 0;
            finish.textContent = t('ob.uploading') + '1' + t('ob.of') + photos.length + '…';

            uid().then(function (id) {
                var ids = [];
                // Sequential: a handful of images on a phone connection, and a
                // clear per-photo progress label is worth more than parallelism.
                return photos.reduce(function (chain, p) {
                    return chain.then(function () {
                        var pid = photoId();
                        return sb().storage.from(PHOTO_BUCKET)
                            .upload(id + '/' + pid, p.blob, { contentType: p.type, upsert: false })
                            .then(function (r) {
                                if (r.error) throw r.error;
                                ids.push(pid);
                                done++;
                                if (done < photos.length) finish.textContent = t('ob.uploading') + (done + 1) + t('ob.of') + photos.length + '…';
                                else finish.textContent = t('ob.finishing');
                            });
                    });
                }, Promise.resolve()).then(function () {
                    // Only now is the profile matchable, so only now is it complete.
                    return sb().from('users')
                        .update({ profile_photos: ids, is_profile_setup_complete: true })
                        .eq('id', id);
                });
            }).then(function (r) {
                if (r && r.error) throw r.error;
                track('OnboardingComplete');
                window.location.replace(withLang('/welcome'));
            }).catch(function (e) {
                if (e && e.message === 'no session') return;
                finish.disabled = false; finish.textContent = label;
                track('OnboardingPhotoError', { message: (e && e.message) || 'unknown' });
                err(t('ob.errUpload'));
            });
        });

        renderGrid();

        sb().auth.getSession().then(function (res) {
            if (!res.data || !res.data.session) { window.location.replace(withLang('/login')); return; }
            adoptUserLang(res.data.session);
            root.hidden = false;
            track('OnboardingStep1');
        });
    }

    function init() { initLogin(); initCallback(); initWelcome(); initOnboarding(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
