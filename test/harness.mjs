/* ============================================================================
   TEST HARNESS

   Serves the working tree under a made-up github.io address and stands in for
   api.github.com, so the editor can be driven from end to end with no network,
   no real repository and no real token.

   The stand-in enforces what GitHub enforces: a token identifies exactly one
   user, only that user's own repositories accept a write, and a write carrying
   a stale version is refused. That is what makes the authorisation tests worth
   anything.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

export function sha(text) {
    return createHash('sha1').update(text).digest('hex');
}

/** Serve the working tree at `origin + base` (e.g. https://jane.github.io/cv/). */
export async function mountSite(context, origin, base) {
    await context.route(origin + '/**', async (route, request) => {
        const url = new URL(request.url());
        let rel = url.pathname;
        if (base !== '/' && rel.startsWith(base)) rel = rel.slice(base.length - 1);
        if (rel.endsWith('/')) rel += 'index.html';

        try {
            const body = await readFile(path.join(ROOT, rel));
            await route.fulfill({
                status: 200,
                contentType: TYPES[path.extname(rel)] || 'application/octet-stream',
                body
            });
        } catch {
            await route.fulfill({ status: 404, body: 'not found' });
        }
    });
}

/** Block the CDNs: keeps the tests offline and exercises graceful degradation. */
export async function blockCdns(context) {
    for (const pattern of ['**://fonts.googleapis.com/**', '**://fonts.gstatic.com/**',
        '**://cdnjs.cloudflare.com/**', '**://cdn.jsdelivr.net/**']) {
        await context.route(pattern, route => route.abort());
    }
}

/**
 * A small, strict stand-in for GitHub. It enforces the same things the real
 * API does: a token identifies exactly one user, and only that user's own
 * repositories accept a write.
 */
export function createGitHub(world) {
    const calls = [];

    function repoOf(full) {
        return world.repos[full];
    }

    function userFor(token) {
        return world.tokens[token];
    }

    async function handle(route, request) {
        const url = new URL(request.url());
        const method = request.method();
        const auth = request.headers()['authorization'] || '';
        const token = auth.replace(/^Bearer\s+/i, '');
        const login = userFor(token);
        calls.push({ method, path: url.pathname, login });

        const json = (status, body) => route.fulfill({
            status, contentType: 'application/json', body: JSON.stringify(body)
        });

        if (!login) return json(401, { message: 'Bad credentials' });

        if (url.pathname === '/user') {
            return json(200, { login, name: login, avatar_url: '', html_url: 'https://github.com/' + login });
        }

        if (url.pathname === '/user/repos') {
            const owned = Object.values(world.repos)
                .filter(r => r.owner.login === login)
                .map(r => ({ ...r, permissions: { admin: true, push: true, pull: true } }));
            return json(200, owned);
        }

        const m = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(url.pathname);
        if (!m) return json(404, { message: 'Not Found' });

        const full = m[1] + '/' + m[2];
        const rest = m[3] || '';
        const repo = repoOf(full);
        if (!repo) return json(404, { message: 'Not Found' });

        // GitHub reports permissions per token, not per repository.
        const mine = repo.owner.login === login;
        const view = { ...repo, permissions: { admin: mine, push: mine, pull: true } };

        if (!rest) return json(200, view);

        if (rest === '/pages') {
            // Real GitHub needs admin access for this endpoint.
            if (!mine) return json(404, { message: 'Not Found' });
            return repo.pages ? json(200, repo.pages) : json(404, { message: 'Not Found' });
        }

        const contents = /^\/contents\/(.+)$/.exec(rest);
        if (contents) {
            const file = decodeURIComponent(contents[1]).split('/').map(decodeURIComponent).join('/');
            const key = full + ':' + file;

            if (method === 'GET') {
                const current = world.files[key];
                if (!current) return json(404, { message: 'Not Found' });
                return json(200, {
                    sha: sha(current),
                    encoding: 'base64',
                    content: Buffer.from(current, 'utf8').toString('base64')
                });
            }

            if (method === 'PUT') {
                // The check that actually matters: writing needs write access.
                if (!mine) {
                    return json(403, { message: 'Resource not accessible by personal access token' });
                }
                const body = request.postDataJSON();
                const current = world.files[key];
                if (current && sha(current) !== body.sha) {
                    return json(409, { message: 'does not match ' + sha(current) });
                }
                if (!current && body.sha) return json(422, { message: 'sha given for a new file' });

                const text = Buffer.from(body.content, 'base64').toString('utf8');
                world.files[key] = text;
                world.commits.push({ repo: full, path: file, branch: body.branch, message: body.message });
                return json(200, {
                    content: { sha: sha(text), path: file },
                    commit: { html_url: 'https://github.com/' + full + '/commit/abc1234' }
                });
            }
        }

        return json(404, { message: 'Not Found' });
    }

    return { handle, calls };
}

/* -- Small helpers the suites share ---------------------------------------- */

export const DATA = 'assets/cv-data.js';

export function repo(full, options) {
    options = options || {};
    var parts = full.split('/');
    return {
        name: parts[1],
        full_name: full,
        owner: { login: parts[0], type: 'User' },
        default_branch: options.branch || 'main',
        has_pages: options.pages !== undefined ? !!options.pages : true,
        archived: false,
        html_url: 'https://github.com/' + full,
        pages: options.pages || null
    };
}

export function pagesOf(url, branch = 'main', source = '/') {
    return { html_url: url, build_type: 'legacy', source: { branch, path: source } };
}

/** A browser context wired to the fake GitHub, with the site mounted. */
export async function open(browser, world, mounts, log) {
    const context = await browser.newContext();
    const github = createGitHub(world);
    await blockCdns(context);
    await context.route('https://api.github.com/**', github.handle);
    for (const [origin, base] of mounts) await mountSite(context, origin, base);

    const page = await context.newPage();
    page.on('pageerror', error => log(false, 'unexpected page error: ' + error.message));
    return { context, page, github };
}

/** Sign in through the editor's own interface, exactly as a person would. */
export async function signIn(page, token) {
    await page.waitForSelector('#gh-anon:not([hidden])', { timeout: 15000 });
    await page.click('[data-action="show-token-form"]');
    await page.fill('#gh-token', token);
    await page.click('[data-action="connect"]');
    await page.waitForSelector('#gh-account:not([hidden]), #gh-choose:not([hidden])', { timeout: 20000 });
}

export function makeWorld() {
    return {
        tokens: { 'tok-jane': 'jane', 'tok-bob': 'bob' },
        repos: {
            'jane/cv': {
                name: 'cv', full_name: 'jane/cv', owner: { login: 'jane', type: 'User' },
                default_branch: 'master', has_pages: true, archived: false,
                html_url: 'https://github.com/jane/cv',
                pages: { html_url: 'https://jane.github.io/cv/', build_type: 'legacy', source: { branch: 'master', path: '/' } }
            },
            'bob/cv': {
                name: 'cv', full_name: 'bob/cv', owner: { login: 'bob', type: 'User' },
                default_branch: 'main', has_pages: true, archived: false,
                html_url: 'https://github.com/bob/cv',
                pages: { html_url: 'https://bob.github.io/cv/', build_type: 'legacy', source: { branch: 'main', path: '/' } }
            }
        },
        files: {},
        commits: []
    };
}
