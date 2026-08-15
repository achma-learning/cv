/* ============================================================================
   THE OPTIONAL "SIGN IN WITH GITHUB" BUTTON

   Off unless a fork fills in assets/cv-config.js. When it is on, the browser
   runs GitHub's device flow through a relay. The point worth testing is that
   no client secret is involved anywhere — that is what makes the client id and
   the relay safe to publish.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import { open, repo, pagesOf, ROOT, DATA } from './harness.mjs';

const seed = await readFile(ROOT + '/' + DATA, 'utf8');

export default async function (browser, log) {
    const state = {
        tokens: { 'device-token': 'jane' },
        repos: {
            'jane/cv': repo('jane/cv', {
                branch: 'master', pages: pagesOf('https://jane.github.io/cv/', 'master')
            })
        },
        files: { ['jane/cv:' + DATA]: seed },
        commits: []
    };

    const { context, page } = await open(browser, state, [['https://jane.github.io', '/cv/']], log);

    // A fork that has switched the device flow on.
    await context.route('**/assets/cv-config.js', route => route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: 'window.CV_CONFIG = { repository: "", oauth: { clientId: "Iv1.test", '
            + 'relay: "https://relay.example", scope: "public_repo" } };'
    }));

    // A stand-in relay: GitHub's own device endpoints, minus the CORS problem.
    let polls = 0;
    let secretSeen = false;
    await context.route('https://relay.example/**', async route => {
        const url = new URL(route.request().url());
        const body = route.request().postDataJSON();
        const json = value => route.fulfill({
            status: 200, contentType: 'application/json', body: JSON.stringify(value)
        });

        if ('client_secret' in body) secretSeen = true;

        if (url.pathname === '/login/device/code') {
            log(body.client_id === 'Iv1.test', 'the configured client id is sent');
            return json({
                device_code: 'dev-123',
                user_code: 'WDJB-MJHT',
                verification_uri: 'https://github.com/login/device',
                expires_in: 900,
                interval: 1
            });
        }
        if (url.pathname === '/login/oauth/access_token') {
            polls++;
            // GitHub answers "not yet" until the person approves it.
            if (polls < 2) return json({ error: 'authorization_pending' });
            return json({ access_token: 'device-token', token_type: 'bearer' });
        }
        return route.fulfill({ status: 404, body: '{}' });
    });

    await page.goto('https://jane.github.io/cv/admin/');
    await page.waitForSelector('#gh-anon:not([hidden])', { timeout: 15000 });

    log(await page.isVisible('#gh-oauth-btn'), 'a configured fork offers "Sign in with GitHub"');
    log(await page.textContent('#gh-token-btn') === 'Use a token instead',
        'and the token becomes the fallback');

    await page.click('[data-action="oauth"]');
    await page.waitForSelector('#gh-device:not([hidden])');
    await page.waitForFunction(
        () => document.getElementById('gh-device-code').textContent === 'WDJB-MJHT',
        null, { timeout: 15000 });
    log(true, 'the user code is shown');
    log(await page.getAttribute('#gh-device-link', 'href') === 'https://github.com/login/device',
        'with a link to enter it on GitHub');

    await page.waitForSelector('#gh-account:not([hidden])', { timeout: 30000 });
    log(polls >= 2, 'it waits patiently through "authorization pending"', 'polls=' + polls);
    log(/jane\/cv/.test(await page.textContent('#gh-target')),
        'the session lands on the right repository');

    await page.fill('#f-name', 'Signed In With GitHub');
    await page.click('.toolbar [data-action="publish"]');
    await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
    log(/"name": "Signed In With GitHub"/.test(state.files['jane/cv:' + DATA]), 'and it can publish');

    log(!secretSeen, 'no client secret was sent at any point');

    /* -- Cancelling ---------------------------------------------------------- */
    await page.evaluate(() => CVAuth.signOut());
    await page.goto('https://jane.github.io/cv/admin/');
    await page.waitForSelector('#gh-anon:not([hidden])', { timeout: 15000 });
    await page.click('[data-action="oauth"]');
    await page.waitForSelector('#gh-device:not([hidden])');
    await page.click('#gh-device [data-action="cancel-signin"]');
    await page.waitForSelector('#gh-anon:not([hidden])');
    await page.waitForTimeout(2500);
    log(await page.isVisible('#gh-anon'), 'a cancelled sign-in stays cancelled');

    await context.close();
}
