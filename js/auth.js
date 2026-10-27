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
            // One destination for now. /welcome reads the profile itself and
            // adapts, so there is no second page to keep in sync until web
            // onboarding exists.
            window.location.replace('/welcome.html');
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
            sb().from('users').select('is_profile_setup_complete').eq('id', session.user.id).single()
              .then(function (r) {
                  var complete = r.data && r.data.is_profile_setup_complete;
                  stateEl.textContent = complete
                      ? 'Your profile is ready. Open the app and you are straight into the deck.'
                      : 'Your account exists. Finish your profile in the app — it is three short screens and one photo.';
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

    function init() { initLogin(); initCallback(); initWelcome(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
