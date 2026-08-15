/* ============================================================================
   WHERE THE CV LIVES

   The editor has to find the repository serving it without being told, from
   whichever shape of GitHub Pages deployment it happens to be running on — and
   it must never assume the repository this project came from.

   Also here: a full round trip of the data model, and the public CV keeping
   the behaviour it already had.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import { open, signIn, repo, pagesOf, ROOT, DATA } from './harness.mjs';

const seed = await readFile(ROOT + '/' + DATA, 'utf8');

export default async function (browser, log) {

    /* -- A custom domain: the URL names no repository ------------------------ */
    {
        const state = {
            tokens: { t: 'jane' },
            repos: {
                'jane/notes': repo('jane/notes', { pages: pagesOf('https://notes.example.com/') }),
                'jane/portfolio': repo('jane/portfolio', {
                    branch: 'trunk', pages: pagesOf('https://cv.example.com/', 'trunk')
                }),
                'jane/scratch': repo('jane/scratch', { pages: false })
            },
            files: { ['jane/portfolio:' + DATA]: seed },
            commits: []
        };
        const { context, page } = await open(browser, state, [['https://cv.example.com', '/']], log);
        await page.goto('https://cv.example.com/admin/');
        await signIn(page, 't');

        const target = await page.textContent('#gh-target');
        log(/jane\/portfolio/.test(target) && /Publishing to/.test(target),
            'a custom domain is resolved by asking GitHub which repository serves it', target);

        await page.fill('#f-name', 'Custom Domain');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
        log(/"name": "Custom Domain"/.test(state.files['jane/portfolio:' + DATA]),
            'and it publishes there');
        log(state.commits[0].branch === 'trunk', 'to the branch Pages builds from',
            state.commits[0].branch);
        await context.close();
    }

    /* -- A user site: jane.github.io from the repository of that name -------- */
    {
        const state = {
            tokens: { t: 'jane' },
            repos: {
                'jane/jane.github.io': repo('jane/jane.github.io', {
                    pages: pagesOf('https://jane.github.io/')
                })
            },
            files: { ['jane/jane.github.io:' + DATA]: seed },
            commits: []
        };
        const { context, page } = await open(browser, state, [['https://jane.github.io', '/']], log);
        await page.goto('https://jane.github.io/admin/');
        await signIn(page, 't');
        log(/jane\/jane\.github\.io/.test(await page.textContent('#gh-target')),
            'a user site resolves to the owner.github.io repository');

        await page.fill('#f-name', 'User Site');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
        log(state.commits[0].path === DATA, 'writing assets/cv-data.js at the repository root',
            state.commits[0].path);
        await context.close();
    }

    /* -- Pages built from /docs ---------------------------------------------- */
    {
        const state = {
            tokens: { t: 'jane' },
            repos: {
                'jane/cv': repo('jane/cv', {
                    branch: 'master', pages: pagesOf('https://jane.github.io/cv/', 'master', '/docs')
                })
            },
            files: { ['jane/cv:docs/' + DATA]: seed },
            commits: []
        };
        const { context, page } = await open(browser, state, [['https://jane.github.io', '/cv/']], log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 't');
        await page.fill('#f-name', 'Docs Folder');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
        log(state.commits[0].path === 'docs/' + DATA, 'a /docs site writes docs/assets/cv-data.js',
            state.commits[0].path);
        await context.close();
    }

    /* -- The CV sits in a folder of a personal site --------------------------- */
    {
        const state = {
            tokens: { t: 'jane' },
            repos: {
                // A repository of the same name exists but publishes nothing, so
                // the guess "jane/cv" read off the URL is simply wrong.
                'jane/cv': repo('jane/cv', { pages: false }),
                'jane/jane.github.io': repo('jane/jane.github.io', {
                    pages: pagesOf('https://jane.github.io/')
                })
            },
            files: { ['jane/jane.github.io:cv/' + DATA]: seed },
            commits: []
        };
        const { context, page } = await open(browser, state, [['https://jane.github.io', '/cv/']], log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 't');
        log(/jane\.github\.io/.test(await page.textContent('#gh-target')),
            'a wrong guess from the URL is corrected against GitHub',
            await page.textContent('#gh-target'));

        await page.fill('#f-name', 'In A Folder');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
        log(state.commits[0].repo === 'jane/jane.github.io' && state.commits[0].path === 'cv/' + DATA,
            'and the file is found inside the site repository',
            state.commits[0].repo + ':' + state.commits[0].path);
        await context.close();
    }

    /* -- Working locally: the address proves nothing, so ask ----------------- */
    {
        const state = {
            tokens: { t: 'jane' },
            repos: {
                'jane/cv': repo('jane/cv', {
                    branch: 'master', pages: pagesOf('https://jane.github.io/cv/', 'master')
                }),
                'jane/notes': repo('jane/notes', { pages: pagesOf('https://jane.github.io/notes/') })
            },
            files: { ['jane/cv:' + DATA]: seed },
            commits: []
        };
        const { context, page } = await open(browser, state, [['http://localhost:4242', '/']], log);
        await page.goto('http://localhost:4242/admin/');
        await signIn(page, 't');
        log(await page.isVisible('#gh-choose'), 'on localhost the editor asks which repository to use');

        const options = await page.$$eval('#gh-choice option', els => els.map(e => e.value));
        log(options.length === 2 && options.includes('jane/cv') && options.includes('jane/notes'),
            'offering only repositories the signed-in user owns', options.join(','));

        await page.selectOption('#gh-choice', 'jane/cv');
        await page.click('[data-action="use-repo"]');
        await page.waitForSelector('#gh-choose', { state: 'hidden', timeout: 15000 });
        log(/jane\/cv/.test(await page.textContent('#gh-target')), 'the choice is applied');

        await page.fill('#f-name', 'From Localhost');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
        log(/"name": "From Localhost"/.test(state.files['jane/cv:' + DATA]),
            'publishing works from a laptop');

        await page.goto('http://localhost:4242/admin/');
        await page.waitForSelector('#gh-account:not([hidden])', { timeout: 15000 });
        log(await page.isHidden('#gh-choose'), 'and the choice is remembered next time');
        await context.close();
    }

    /* -- The data model survives the round trip intact ----------------------- */
    {
        const state = {
            tokens: { t: 'jane' },
            repos: {
                'jane/cv': repo('jane/cv', {
                    branch: 'master', pages: pagesOf('https://jane.github.io/cv/', 'master')
                })
            },
            files: { ['jane/cv:' + DATA]: seed },
            commits: []
        };
        const { context, page } = await open(browser, state, [['https://jane.github.io', '/cv/']], log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 't');
        const shape = await page.evaluate(() => Object.keys(window.CV_DEFAULT_DATA).join(','));

        // Touch every kind of field the model has.
        await page.fill('#f-name', 'Ada Lovelace');
        await page.fill('#f-tagline', 'Analyst & Metaphysician');
        await page.fill('#f-email', 'ada@example.com');
        await page.fill('#f-orcid', 'https://orcid.org/0000-0002-1825-0097');
        await page.fill('#f-skills-expert', 'Analytical Engines');
        await page.fill('#f-openSource', '<p>Note G <em>(author)</em></p>');
        await page.fill('#f-coursework-1', 'Mathematics, Logic — with accents: café, naïve, 日本語');
        await page.fill('#f-photoUrl', 'img.jpg');
        await page.dispatchEvent('#f-photoUrl', 'change');

        await page.click('#education-list .entry-card:last-child [data-move="up"]');
        const topDegree = await page.inputValue('#education-list .entry-card:first-child .e-degree');

        await page.click('[data-add="employment"]');
        const card = '#employment-list .entry-card:last-child ';
        await page.fill(card + '.e-title', 'Collaborator');
        await page.fill(card + '.e-date', '1843');
        await page.fill(card + '.e-org', 'Analytical Society');
        await page.fill(card + '.e-details', 'First algorithm\nTranslated Menabrea');

        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });

        const written = state.files['jane/cv:' + DATA];
        log(/"name": "Ada Lovelace"/.test(written), 'round trip: identity');
        log(/orcid\.org/.test(written), 'round trip: contact links');
        log(/Analytical Engines/.test(written), 'round trip: skills');
        log(/Note G/.test(written), 'round trip: the HTML fields keep their markup');
        log(/日本語/.test(written), 'round trip: non-ASCII survives the encoding');
        log(/"First algorithm"/.test(written) && /"Translated Menabrea"/.test(written),
            'round trip: bullet lists');
        log(/"profilePhoto": "img\.jpg"/.test(written), 'round trip: image references');

        const parsed = JSON.parse(written.slice(written.indexOf('{'), written.lastIndexOf('}') + 1));
        log(parsed.education[0].degree === topDegree, 'round trip: reordering is kept');
        log(parsed.employment[parsed.employment.length - 1].details.length === 2,
            'round trip: the added entry is there');
        log(Object.keys(parsed).join(',') === shape,
            'round trip: the file keeps the same fields in the same order',
            Object.keys(parsed).join(','));

        // Read it back out of GitHub into a fresh editor.
        await page.evaluate(() => localStorage.removeItem('cv_data'));
        await page.goto('https://jane.github.io/cv/admin/');
        await page.waitForSelector('#gh-account:not([hidden])', { timeout: 15000 });
        await page.click('[data-action="reload"]');
        await page.waitForFunction(() => document.getElementById('f-name').value === 'Ada Lovelace',
            null, { timeout: 15000 });
        log(await page.inputValue('#f-skills-expert') === 'Analytical Engines', 'reload: skills come back');
        log(/日本語/.test(await page.inputValue('#f-coursework-1')), 'reload: non-ASCII comes back');

        const before = state.commits.length;
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForTimeout(900);
        log(state.commits.length === before, 'publishing an unchanged CV makes no empty commit');
        log(/Nothing to publish/i.test(await page.textContent('#gh-note')), 'and says so');
        await context.close();
    }

    /* -- The public CV behaves exactly as it did ----------------------------- */
    {
        const state = { tokens: {}, repos: {}, files: {}, commits: [] };
        const { context, page } = await open(browser, state, [['https://jane.github.io', '/cv/']], log);
        await page.goto('https://jane.github.io/cv/');
        await page.waitForSelector('#cv-name');

        log(await page.isVisible('#cv-view') && await page.isHidden('#card-view'),
            'the full CV shows by default');
        await page.click('#toggle-view');
        log(await page.isVisible('#card-view') && await page.isHidden('#cv-view'),
            'the card view still toggles');
        log(await page.evaluate(() => location.hash) === '#card', 'and is still addressable at #card');
        await page.click('#toggle-view');
        log(await page.isVisible('#cv-view'), 'and toggles back');

        log((await page.$$('#cv-main .section')).length > 0, 'sections render');
        log((await page.$$('#cv-contacts a')).length > 0, 'contact links render');
        log(await page.evaluate(() => document.title.includes('Curriculum Vitae')),
            'the page title still comes from the data');

        await page.goto('https://jane.github.io/cv/?edit');
        await page.waitForSelector('#cv-name');
        log(await page.isVisible('#adminBtn'), '?edit still opens the editor door');

        await page.goto('https://jane.github.io/cv/admin/?edit=true');
        await page.waitForSelector('#gh-anon:not([hidden])', { timeout: 15000 });
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForTimeout(500);
        log(/Sign in with GitHub to publish/i.test(await page.textContent('#gh-note')),
            '…but it grants no permission to publish');
        log(state.commits.length === 0, 'and nothing is written');
        await context.close();
    }
}
