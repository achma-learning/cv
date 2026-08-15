/* ============================================================================
   OPTIONAL: a relay for the "Sign in with GitHub" button

   You do not need this. The editor signs in with a personal access token out of
   the box, with nothing to deploy. This is only for forks that would rather
   have a proper "Sign in with GitHub" button, and it is the smallest piece of
   infrastructure that makes one possible.

   Why anything is needed at all
   -----------------------------
   GitHub's device flow is designed for programs that cannot keep a secret —
   which is exactly what a page served from GitHub Pages is. It has no client
   secret: only a Client ID, which is a public value. The one obstacle is that
   github.com's two device-flow endpoints refuse cross-origin browser requests,
   unlike api.github.com. This forwards those two requests, and nothing else.

   It therefore holds no credentials of any kind. Deploying it gives away
   nothing, and it costs nothing to run on a free Cloudflare Workers plan.

   Setting it up
   -------------
   1. Register an OAuth App at https://github.com/settings/developers
        Homepage URL:               your CV's address
        Authorization callback URL: your CV's address (unused by device flow)
        Enable Device Flow:         ticked
      Copy the Client ID. Do not create a client secret; nothing here wants one.

   2. Create a Cloudflare Worker at https://workers.cloudflare.com, paste this
      file in as its code, and deploy it. Note the URL it gives you.

   3. Put your own CV's address in ALLOWED_ORIGINS below and redeploy, so the
      relay only answers your site.

   4. In assets/cv-config.js, fill in `clientId` and `relay`.

   Both of those values are public, and both are yours. A fork of your fork can
   register its own in a couple of minutes, or ignore all of this and use a
   token — which is why the editor never depends on anybody else's OAuth app.
   ========================================================================== */

// Your CV's address, e.g. 'https://your-handle.github.io'. Leave empty to
// answer any origin — convenient while testing, worth narrowing afterwards.
const ALLOWED_ORIGINS = [];

// The only two paths this will ever forward.
const ALLOWED_PATHS = ['/login/device/code', '/login/oauth/access_token'];

export default {
    async fetch(request) {
        const origin = request.headers.get('Origin') || '';
        const permitted = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin);

        const cors = {
            'Access-Control-Allow-Origin': permitted ? (origin || '*') : 'null',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        const { pathname } = new URL(request.url);
        if (!permitted || request.method !== 'POST' || !ALLOWED_PATHS.includes(pathname)) {
            return new Response(JSON.stringify({ error: 'not_allowed' }), {
                status: 404,
                headers: { ...cors, 'Content-Type': 'application/json' }
            });
        }

        const upstream = await fetch('https://github.com' + pathname, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: await request.text()
        });

        return new Response(await upstream.text(), {
            status: upstream.status,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }
};
