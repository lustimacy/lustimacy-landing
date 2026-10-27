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
                  window.location.replace(started ? '/welcome.html' : '/onboarding.html');
              })
              .catch(function () { window.location.replace('/welcome.html'); });
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
                      ? 'Your profile is ready. Open the app and you are straight into the deck.'
                      : 'Your account exists. Add one photo in the app and you are in.';
                  var finish = root.querySelector('[data-welcome-finish]');
                  // Only offer the web form to someone who never filled it in.
                  if (finish && !complete && !(r.data && r.data.birthday)) finish.hidden = false;
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
    // Mirrors the app's two gated typed screens. The photo step is deliberately
    // NOT here: a camera is better on a phone than a file picker and a crop box
    // in a browser, and the app's onboarding re-opens pre-filled from these
    // columns, so the person taps through and adds one photo.
    //
    // That also means is_profile_setup_complete stays false. The app owns the
    // moment a profile becomes complete, exactly as it does today.
    //
    // Integer encodings are the app's, not invented here:
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

    function initOnboarding() {
        var root = document.getElementById('onboarding');
        if (!root) return;

        var state = { account_type: null, gender: null, partner_gender: null,
                      looking_for: null, sexual_orientation: null };

        var errEl  = root.querySelector('[data-ob-error]');
        var step1  = root.querySelector('[data-ob-step="1"]');
        var step2  = root.querySelector('[data-ob-step="2"]');
        var coupleOnly = root.querySelectorAll('[data-ob-couple]');

        function err(msg) { errEl.textContent = msg; errEl.hidden = false; }
        function clearErr() { errEl.hidden = true; }

        // Renders a group of single-choice chips and records the pick in state.
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
              function (v) {
                  coupleOnly.forEach(function (el) { el.hidden = (v !== 1); });
              });
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

        root.querySelector('[data-ob-next]').addEventListener('click', function () {
            clearErr();
            if (!nameEl.value.trim())            return err('What should people call you?');
            if (!dobEl.value)                    return err('We need your date of birth to confirm you are 18 or over.');
            var a = age(dobEl.value);
            if (isNaN(a))                        return err('That date does not look right.');
            if (a < 18)                          return err('You have to be 18 or over to use Lustimacy.');
            if (a > 120)                         return err('That date does not look right.');
            if (state.account_type === null)     return err('Is this profile just for you, or for the two of you?');
            if (state.account_type === 1) {
                if (!pdobEl.value)               return err("We need your partner's date of birth too.");
                var pa = age(pdobEl.value);
                if (isNaN(pa) || pa > 120)       return err("That date does not look right.");
                if (pa < 18)                     return err('Both of you have to be 18 or over.');
            }
            step1.hidden = true; step2.hidden = false;
            root.querySelector('[data-ob-progress]').style.width = '100%';
            window.scrollTo(0, 0);
            track('OnboardingStep2');
        });

        root.querySelector('[data-ob-back]').addEventListener('click', function () {
            clearErr();
            step2.hidden = true; step1.hidden = false;
            root.querySelector('[data-ob-progress]').style.width = '50%';
            window.scrollTo(0, 0);
        });

        var submit = root.querySelector('[data-ob-submit]');
        submit.addEventListener('click', function () {
            clearErr();
            if (state.gender === null)              return err('Pick the option closest to how you identify.');
            if (state.account_type === 1 && state.partner_gender === null)
                                                    return err("Pick your partner's gender too.");
            if (state.looking_for === null)         return err('Tell us roughly what you are here for.');
            if (state.sexual_orientation === null)  return err('Pick the option closest to your orientation.');

            submit.disabled = true;
            var original = submit.textContent;
            submit.textContent = 'Saving…';

            sb().auth.getSession().then(function (res) {
                var session = res.data && res.data.session;
                if (!session) { window.location.replace('/login.html'); return; }

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

                return sb().from('users').update(row).eq('id', session.user.id).then(function (r) {
                    if (r.error) {
                        submit.disabled = false; submit.textContent = original;
                        track('OnboardingError', { message: r.error.message });
                        err('Could not save that. Try again in a moment?');
                        return;
                    }
                    track('OnboardingComplete');
                    window.location.replace('/welcome.html');
                });
            }).catch(function () {
                submit.disabled = false; submit.textContent = original;
                err('Could not reach the server. Check your connection and try again.');
            });
        });

        // Anyone landing here without a session goes to sign-in first.
        sb().auth.getSession().then(function (res) {
            if (!res.data || !res.data.session) { window.location.replace('/login.html'); return; }
            root.hidden = false;
            track('OnboardingStep1');
        });
    }

    function init() { initLogin(); initCallback(); initWelcome(); initOnboarding(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
