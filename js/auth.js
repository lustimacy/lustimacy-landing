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

    // Publishable key — public by design; row-level security is what protects
    // the data. Same project the app talks to.
    var SUPABASE_URL = 'https://jnaxgadklstwicjrzatk.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_fjGtaiJCMsp2jys29KJD8g_TFyaQcFN';

    var client = null;
    function sb() {
        if (!client) {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true }
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
            if (!isEmail(email)) { fail("That doesn't look like an email address."); return; }

            button.disabled = true;
            button.textContent = 'Sending…';
            track('AuthLinkRequested');

            sb().auth.signInWithOtp({
                email: email,
                options: { emailRedirectTo: window.location.origin + '/auth/callback.html' }
            }).then(function (res) {
                if (res.error) {
                    track('AuthLinkError', { message: res.error.message });
                    fail(res.error.message || 'Could not send the link. Try again in a moment?');
                    return;
                }
                if (sentTo) sentTo.textContent = email;
                form.hidden = true;
                doneEl.hidden = false;
                track('AuthLinkSent');
            }).catch(function () {
                fail('Could not reach the server. Check your connection and try again.');
            });
        });
    }

    // ---- /auth/callback -----------------------------------------------------
    function initCallback() {
        var root = document.getElementById('authCallback');
        if (!root) return;

        var statusEl = root.querySelector('[data-callback-status]');
        var errEl    = root.querySelector('[data-callback-error]');

        function failed(msg) {
            statusEl.hidden = true;
            errEl.querySelector('[data-callback-message]').textContent = msg;
            errEl.hidden = false;
            track('AuthCallbackError', { message: msg });
        }

        // detectSessionInUrl handles the exchange; getSession tells us if it worked.
        sb().auth.getSession().then(function (res) {
            if (res.error || !res.data || !res.data.session) {
                failed('That link has expired or has already been used. Request a new one and it will work.');
                return;
            }
            track('AuthSignedIn');
            // A row always exists by now — the on_auth_user_created trigger
            // inserts it the moment last_sign_in_at stops being null — but a
            // brand-new one holds only id, email and name. No birthday means
            // they have not been through onboarding.
            var uid = res.data.session.user.id;
            sb().from('users').select('birthday').eq('id', uid).single()
              .then(function (r) {
                  var started = r.data && r.data.birthday;
                  window.location.replace(started ? '/welcome' : '/onboarding');
              })
              .catch(function () { window.location.replace('/welcome'); });
        }).catch(function () {
            failed('Something went wrong signing you in. Request a fresh link and try again.');
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

            emailEl.textContent = session.user.email || '';
            signedIn.hidden = false;

            // Same flag the app reads to choose between onboarding and the deck.
            sb().from('users').select('is_profile_setup_complete, birthday').eq('id', session.user.id).single()
              .then(function (r) {
                  var complete = r.data && r.data.is_profile_setup_complete;
                  stateEl.textContent = complete
                      ? 'Your profile is ready. On Android, open the app and you are straight into the deck.'
                      : 'Your profile is not finished yet, so nobody can see you.';
                  var finish = root.querySelector('[data-welcome-finish]');
                  // Only offer the web form to someone who never filled it in.
                  if (finish && !complete) finish.hidden = false;
              })
              .catch(function () {
                  stateEl.textContent = 'Your account exists. Open the app to finish your profile.';
              });
        });

        if (signOut) {
            signOut.addEventListener('click', function (e) {
                e.preventDefault();
                sb().auth.signOut().then(function () { window.location.replace('/'); });
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
    var GENDER = ['Man','Woman','Non-binary','Trans man','Trans woman','Genderqueer',
                  'Genderfluid','Agender','Two-spirit','Other'];
    var ORIENTATION = ['Straight','Gay','Lesbian','Bisexual','Pansexual','Asexual',
                       'Demisexual','Queer','Questioning'];
    var LOOKING_FOR = [
        [10, 'One-Time Encounter'], [11, 'Friends with Benefits'], [12, 'Ethical Non-Monogamy'],
        [13, 'Casual Dates'], [14, 'Friends'], [15, 'Still Figuring Out']
    ];

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

        chips(root.querySelector('[data-ob-account]'), [[0,'Just me'],[1,'The two of us']], 'account_type',
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
                if (!sess) { window.location.replace('/login'); throw new Error('no session'); }
                return sess.user.id;
            });
        }

        // ---- step 1 -> 2
        root.querySelector('[data-ob-next]').addEventListener('click', function () {
            clearErr();
            if (!nameEl.value.trim())        return err('What should people call you?');
            if (!dobEl.value)                return err('We need your date of birth to confirm you are 18 or over.');
            var a = age(dobEl.value);
            if (isNaN(a) || a > 120)         return err('That date does not look right.');
            if (a < 18)                      return err('You have to be 18 or over to use Lustimacy.');
            if (state.account_type === null) return err('Is this profile just for you, or for the two of you?');
            if (state.account_type === 1) {
                if (!pdobEl.value)           return err("We need your partner's date of birth too.");
                var pa = age(pdobEl.value);
                if (isNaN(pa) || pa > 120)   return err('That date does not look right.');
                if (pa < 18)                 return err('Both of you have to be 18 or over.');
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
            if (state.gender === null)             return err('Pick the option closest to how you identify.');
            if (state.account_type === 1 && state.partner_gender === null)
                                                   return err("Pick your partner's gender too.");
            if (state.looking_for === null)        return err('Tell us roughly what you are here for.');
            if (state.sexual_orientation === null) return err('Pick the option closest to your orientation.');

            next2.disabled = true;
            var label = next2.textContent; next2.textContent = 'Saving…';

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
                                    return err('Could not save that. Try again in a moment?'); }
                show(3);
            }).catch(function (e) {
                if (e && e.message === 'no session') return;
                next2.disabled = false; next2.textContent = label;
                err('Could not reach the server. Check your connection and try again.');
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
                img.src = p.url; img.alt = 'Photo ' + (i + 1);
                var del = document.createElement('button');
                del.type = 'button'; del.className = 'ob__photo-remove';
                del.setAttribute('aria-label', 'Remove photo ' + (i + 1));
                del.textContent = '×';
                del.addEventListener('click', function () {
                    URL.revokeObjectURL(p.url);
                    photos.splice(i, 1); renderGrid(); clearErr();
                });
                cell.appendChild(img); cell.appendChild(del);
                gridEl.appendChild(cell);
            });
            countEl.textContent = photos.length + ' of ' + MAX_PHOTOS;
            fileEl.parentElement.hidden = photos.length >= MAX_PHOTOS;
        }

        fileEl.addEventListener('change', function () {
            clearErr();
            var files = Array.prototype.slice.call(fileEl.files || []);
            fileEl.value = '';
            if (!files.length) return;

            var room = MAX_PHOTOS - photos.length;
            if (files.length > room) { files = files.slice(0, room); err('You can add up to ' + MAX_PHOTOS + ' photos.'); }

            Promise.all(files.map(function (f) {
                if (!/^image\//.test(f.type)) return null;
                return prepare(f).then(function (res) {
                    return { blob: res.blob, type: res.type, url: URL.createObjectURL(res.blob) };
                }).catch(function () { return null; });
            })).then(function (made) {
                var bad = 0;
                made.forEach(function (m) { m ? photos.push(m) : bad++; });
                if (bad) err("Could not read " + bad + (bad === 1 ? ' file.' : ' files.'));
                renderGrid();
            });
        });

        var finish = root.querySelector('[data-ob-finish]');
        finish.addEventListener('click', function () {
            clearErr();
            if (!photos.length) return err('One photo is all we need, but we do need one.');

            finish.disabled = true;
            var label = finish.textContent;
            var done = 0;
            finish.textContent = 'Uploading 1 of ' + photos.length + '…';

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
                                if (done < photos.length) finish.textContent = 'Uploading ' + (done + 1) + ' of ' + photos.length + '…';
                                else finish.textContent = 'Finishing…';
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
                window.location.replace('/welcome');
            }).catch(function (e) {
                if (e && e.message === 'no session') return;
                finish.disabled = false; finish.textContent = label;
                track('OnboardingPhotoError', { message: (e && e.message) || 'unknown' });
                err('Could not upload that. Check your connection and try again.');
            });
        });

        renderGrid();

        sb().auth.getSession().then(function (res) {
            if (!res.data || !res.data.session) { window.location.replace('/login'); return; }
            root.hidden = false;
            track('OnboardingStep1');
        });
    }

    function init() { initLogin(); initCallback(); initWelcome(); initOnboarding(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
