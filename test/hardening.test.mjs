/* ============================================================================
   HARDENING

   The awkward cases: a fork of a fork, an organisation's repository, a token
   that can only reach repository contents, and the various ways a browser can
   be told to lie about who it is.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import { open, signIn, repo, pagesOf, ROOT, DATA } from './harness.mjs';

const seed = await readFile(ROOT + '/' + DATA, 'utf8');

/** A repository whose Pages settings are invisible, as a Contents-only token sees them. */
function opaque(full, options) {
    const built = repo(full, options);
    built.pagesHidden = true;      // the harness turns this into a 403 from /pages
    return built;
}

export default async function (browser, log) {

    /* -- A fork of a fork ---------------------------------------------------- */
    {
        const state = {
            tokens: { 'tok-achma': 'achma-learning', 'tok-bob': 'bob', 'tok-charlie': 'charlie' },
            repos: {
                'achma-learning/cv': repo('achma-learning/cv', {
                    branch: 'master', pages: pagesOf('https://achma-learning.github.io/cv/', 'master')
                }),
                'bob/cv': repo('bob/cv', { pages: pagesOf('https://bob.github.io/cv/') }),
                'charlie/cv': repo('charlie/cv', { pages: pagesOf('https://charlie.github.io/cv/') })
            },
            files: {
                ['achma-learning/cv:' + DATA]: seed,
                ['bob/cv:' + DATA]: seed,
                ['charlie/cv:' + DATA]: seed
            },
            commits: []
        };
        const mounts = [
            ['https://achma-learning.github.io', '/cv/'],
            ['https://bob.github.io', '/cv/'],
            ['https://charlie.github.io', '/cv/']
        ];

        // Charlie forked Bob, who forked the original. Charlie's copy is Charlie's.
        for (const [token, who, allowed] of [
            ['tok-charlie', 'charlie', true],
            ['tok-bob', 'bob', false],
            ['tok-achma', 'achma-learning', false]
        ]) {
            const { context, page } = await open(browser, state, mounts, log);
            await page.goto('https://charlie.github.io/cv/admin/');
            await signIn(page, token);
            const target = await page.textContent('#gh-target');
            log(allowed ? /Publishing to/.test(target) : /not publish/i.test(target),
                `second-generation fork: ${who} ${allowed ? 'can' : 'cannot'} publish to charlie/cv`,
                target);
            await context.close();
        }

        // Bob owns the middle fork; neither the original author nor Charlie do.
        for (const [token, who, allowed] of [
            ['tok-bob', 'bob', true],
            ['tok-charlie', 'charlie', false],
            ['tok-achma', 'achma-learning', false]
        ]) {
            const { context, page } = await open(browser, state, mounts, log);
            await page.goto('https://bob.github.io/cv/admin/');
            await signIn(page, token);
            const target = await page.textContent('#gh-target');
            log(allowed ? /Publishing to/.test(target) : /not publish/i.test(target),
                `middle fork: ${who} ${allowed ? 'can' : 'cannot'} publish to bob/cv`, target);
            await context.close();
        }

        log(state.commits.length === 0, 'none of that wrote anything');
    }

    /* -- An organisation's repository ---------------------------------------- */
    {
        const org = repo('acme/cv', { branch: 'main', pages: pagesOf('https://acme.github.io/cv/') });
        org.owner = { login: 'acme', type: 'Organization' };
        // GitHub reports per-user permissions: dana administers it, erin only pushes.
        org.permissionsByUser = {
            dana: { admin: true, push: true, pull: true },
            erin: { admin: false, push: true, pull: true },
            frank: { admin: false, push: false, pull: true }
        };

        const state = {
            tokens: { 'tok-dana': 'dana', 'tok-erin': 'erin', 'tok-frank': 'frank' },
            repos: { 'acme/cv': org },
            files: { ['acme/cv:' + DATA]: seed },
            commits: []
        };
        const mounts = [['https://acme.github.io', '/cv/']];

        for (const [token, who, allowed] of [
            ['tok-dana', 'dana (admin)', true],
            ['tok-erin', 'erin (push only)', false],
            ['tok-frank', 'frank (read only)', false]
        ]) {
            const { context, page } = await open(browser, state, mounts, log);
            await page.goto('https://acme.github.io/cv/admin/');
            await signIn(page, token);
            const target = await page.textContent('#gh-target');
            log(allowed ? /Publishing to/.test(target) : /not publish|admin rights/i.test(target),
                `organisation repository: ${who} ${allowed ? 'can' : 'cannot'} publish`, target);
            await context.close();
        }

        // And the admin can actually publish.
        const { context, page } = await open(browser, state, mounts, log);
        await page.goto('https://acme.github.io/cv/admin/');
        await signIn(page, 'tok-dana');
        await page.fill('#f-name', 'Acme Person');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
        log(/"name": "Acme Person"/.test(state.files['acme/cv:' + DATA]),
            'organisation repository: an admin publishes successfully');
        log(state.commits.length === 1, 'and only the admin ever committed');
        await context.close();
    }

    /* -- A token that can only read repository contents ---------------------- */
    {
        // Pages is published from /docs on a non-default branch, and the token
        // cannot read the Pages settings — the file has to be found instead.
        const state = {
            tokens: { t: 'jane' },
            repos: {
                'jane/cv': opaque('jane/cv', {
                    branch: 'main', pages: pagesOf('https://jane.github.io/cv/', 'gh-pages', '/docs')
                })
            },
            files: { ['jane/cv:docs/' + DATA]: seed },
            commits: [],
            branches: { 'jane/cv': ['main', 'gh-pages'] },
            trees: { 'jane/cv:gh-pages': ['docs/' + DATA, 'docs/index.html'], 'jane/cv:main': ['README.md'] }
        };
        const { context, page } = await open(browser, state, [['https://jane.github.io', '/cv/']], log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 't');

        await page.fill('#f-name', 'Contents Only');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 20000 });

        const commit = state.commits[0];
        log(commit.path === 'docs/' + DATA,
            'a Contents-only token still finds docs/assets/cv-data.js', commit.path);
        log(commit.branch === 'gh-pages',
            'and commits to the branch the file is actually on, not the default', commit.branch);
        log(!/"name": "Contents Only"/.test(seed), 'sanity: the seed did not already contain it');
        await context.close();
    }

    /* -- Lying to the browser ------------------------------------------------ */
    {
        const state = {
            tokens: { 'tok-bob': 'bob' },
            repos: {
                'jane/cv': repo('jane/cv', {
                    branch: 'master', pages: pagesOf('https://jane.github.io/cv/', 'master')
                }),
                'bob/cv': repo('bob/cv', { pages: pagesOf('https://bob.github.io/cv/') })
            },
            files: { ['jane/cv:' + DATA]: seed, ['bob/cv:' + DATA]: seed },
            commits: []
        };
        const mounts = [['https://jane.github.io', '/cv/'], ['https://bob.github.io', '/cv/']];
        const victim = state.files['jane/cv:' + DATA];

        const { context, page } = await open(browser, state, mounts, log);
        await page.goto('https://bob.github.io/cv/admin/');
        await signIn(page, 'tok-bob');

        // Every lever a browser gives an attacker, pulled at once.
        await page.evaluate(() => {
            localStorage.setItem('cv_editor_hint', JSON.stringify({
                login: 'jane', repository: 'jane/cv',
                site: location.origin + '/cv/', expires: Date.now() + 1e9
            }));
            sessionStorage.setItem('cv_github_token', 'tok-bob');
            localStorage.setItem('cv_repository', JSON.stringify({
                repository: 'jane/cv', site: location.origin + '/cv/'
            }));
            window.CV_CONFIG = { repository: 'jane/cv' };

            const session = CVAuth.session();
            session.isOwner = true;
            session.canWrite = true;
            session.isAdmin = true;
            session.mayPublish = true;
            session.repository.owner = 'jane';
            session.repository.name = 'cv';
            session.repository.fullName = 'jane/cv';
            session.repository.ownerType = 'User';
            session.branch = 'master';
        });

        await page.fill('#f-name', 'Hijacked');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="error"]', { timeout: 15000 });
        log(state.files['jane/cv:' + DATA] === victim,
            'every browser-side lever pulled at once still writes nothing to the victim');

        // Calling the publishing machinery directly is no better.
        await page.evaluate(() => {
            const session = CVAuth.session();
            return session.api.putFile({
                owner: 'jane', name: 'cv', path: 'assets/cv-data.js', branch: 'master',
                message: 'direct call', text: 'window.CV_DEFAULT_DATA = {};'
            }).catch(() => 'refused');
        });
        log(state.files['jane/cv:' + DATA] === victim,
            'calling the GitHub client directly is refused too');
        log(state.commits.length === 0, 'no commit reached the victim repository by any route');

        // The token is never handed anywhere but GitHub.
        const seen = state.tokenDestinations || [];
        log(seen.every(host => host === 'api.github.com'),
            'the token is only ever sent to api.github.com', seen.join(', ') || '(none recorded)');
        await context.close();
    }

    /* -- No trace of the original author in the authorisation path ----------- */
    {
        const files = ['assets/cv-auth.js', 'assets/cv-repo.js', 'assets/cv-github.js',
            'assets/cv-store.js', 'assets/cv-page.js', 'assets/cv-render.js',
            'assets/cv-config.js', 'admin/admin.js', 'admin/index.html', 'index.html'];
        let found = [];
        for (const file of files) {
            const text = await readFile(ROOT + '/' + file, 'utf8');
            if (/achma|achma-learning/i.test(text)) found.push(file);
        }
        log(found.length === 0, 'no hard-coded original owner anywhere in the shipped code',
            found.join(', '));
    }
}
