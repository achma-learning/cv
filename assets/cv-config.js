/* ============================================================================
   OPTIONAL SITE CONFIGURATION

   Most forks never need to touch this file. Everything in it is public — it is
   served to every visitor — so it must never contain a token, a client secret
   or any other credential.

   repository
       Leave empty. The editor works out which repository is serving this CV on
       its own, and asks you to confirm if it cannot. Set it only if you host
       the CV on a custom domain and would rather not confirm the repository by
       hand: "your-handle/cv".

   oauth
       Leave empty to sign in with a personal access token (the default: nothing
       to deploy, nothing to register). Fill it in only if you want a
       "Sign in with GitHub" button instead — see the README section
       "Optional: a Sign in with GitHub button". A Client ID is a public value;
       the device flow this uses has no client secret at all.
   ========================================================================== */
window.CV_CONFIG = {
    repository: "",

    oauth: {
        clientId: "",   // e.g. "Iv1.0123456789abcdef" — public, not a secret
        relay: "",      // e.g. "https://cv-oauth.your-handle.workers.dev"
        scope: "public_repo"
    }
};
