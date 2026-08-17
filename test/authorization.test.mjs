/* ============================================================================
   WHO MAY PUBLISH

   The scenarios that decide whether this editor is safe to put on the web:
   a visitor, a signed-in stranger, the owner, a fork owner, the author of the
   original repository looking at somebody's fork, an attacker editing the page,
   and two people saving at once.
   ========================================================================== */
import { readFile } from 'node:fs/promises';
import { makeWorld, open, signIn, ROOT, DATA } from './harness.mjs';

const MOUNTS = [
    ['https://jane.github.io', '/cv/'],
    ['https://bob.github.io', '/cv/']
];

async function world() {
    const state = makeWorld();
    const seed = await readFile(ROOT + '/' + DATA, 'utf8');
    state.files['jane/cv:' + DATA] = seed;
    state.files['bob/cv:' + DATA] = seed;
    return state;
}

const note = page => page.textContent('#gh-note');

export default async function (browser, log) {

    /* -- A. A visitor sees a CV, not a content management system ------------- */
    {
        const state = await world();
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/');
        await page.waitForSelector('#cv-name');

        log(await page.isHidden('#adminBtn'), 'A  a visitor sees no Edit CV control');
        log((await page.textContent('#cv-name')).length > 0, 'A  the CV itself still renders');
        log(await page.isVisible('#downloadBtn'), 'A  the PDF button survives blocked CDNs');
        await context.close();
    }

    /* -- B. Signed in to GitHub, but somebody else's CV ---------------------- */
    {
        const state = await world();
        const before = state.files['jane/cv:' + DATA];
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 'tok-bob');

        const target = await page.textContent('#gh-target');
        log(/not publish/i.test(target), 'B  a signed-in stranger is told they cannot publish', target);

        await page.fill('#f-name', 'Bob Was Here');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForTimeout(800);

        log(state.files['jane/cv:' + DATA] === before, 'B  and cannot change the file');
        log(state.commits.length === 0, 'B  no commit was made');
        await context.close();
    }

    /* -- C. The repository owner --------------------------------------------- */
    {
        const state = await world();
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 'tok-jane');

        const target = await page.textContent('#gh-target');
        log(/jane\/cv/.test(target) && /Publishing to/.test(target),
            'C  the owner sees the repository behind this CV', target);

        await page.fill('#f-name', 'Jane Doe');
        await page.fill('#f-tagline', 'Research Engineer');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });

        log(/saved successfully/i.test(await note(page)), 'C  a success message is shown');
        log(/commit/i.test(await page.innerHTML('#gh-note')), 'C  with a link to the commit');

        const written = state.files['jane/cv:' + DATA];
        log(/"name": "Jane Doe"/.test(written), 'C  assets/cv-data.js holds the new content');
        log(/window\.CV_DEFAULT_DATA = \{/.test(written), 'C  in the format the site already uses');

        const commit = state.commits[0];
        log(commit.message === 'Update CV from web editor', 'C  commit message', commit.message);
        log(commit.path === DATA, 'C  only assets/cv-data.js is written', commit.path);
        log(commit.branch === 'master', 'C  on the branch Pages builds from', commit.branch);
        log(state.commits.length === 1, 'C  exactly one commit');

        await page.goto('https://jane.github.io/cv/');
        await page.waitForSelector('#cv-name');
        log(await page.isVisible('#adminBtn'), 'C  Edit CV now appears on the public CV for the owner');
        await context.close();
    }

    /* -- D. Somebody forks it ------------------------------------------------- */
    {
        const state = await world();
        const untouched = state.files['jane/cv:' + DATA];
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://bob.github.io/cv/admin/');
        await signIn(page, 'tok-bob');

        const target = await page.textContent('#gh-target');
        log(/bob\/cv/.test(target) && /Publishing to/.test(target),
            'D  a fork belongs to whoever forked it', target);

        await page.fill('#f-name', 'Bob Roberts');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });

        log(/"name": "Bob Roberts"/.test(state.files['bob/cv:' + DATA]), 'D  changes land in the fork');
        log(state.files['jane/cv:' + DATA] === untouched, 'D  the original repository is untouched');
        log(state.commits.every(c => c.repo === 'bob/cv'), 'D  every commit went to the fork');
        log(state.commits[0].branch === 'main', "D  using the fork's own default branch");
        await context.close();
    }

    /* -- E. The author of the original visits a fork -------------------------- */
    {
        const state = await world();
        const before = state.files['bob/cv:' + DATA];
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://bob.github.io/cv/admin/');
        await signIn(page, 'tok-jane');

        const target = await page.textContent('#gh-target');
        log(/not publish/i.test(target),
            'E  writing the original grants nothing over a fork of it', target);

        await page.click('.toolbar [data-action="publish"]');
        await page.waitForTimeout(800);
        log(state.files['bob/cv:' + DATA] === before, "E  the fork's file is unchanged");
        log(state.commits.length === 0, 'E  no commit was made');
        await context.close();
    }

    /* -- F. Editing the page to grant yourself permission --------------------- */
    {
        const state = await world();
        const before = state.files['jane/cv:' + DATA];
        const { context, page } = await open(browser, state, MOUNTS, log);

        // Bob forges everything a browser can forge: a hint saying he is the
        // editor here, and a pointer at Jane's repository.
        await page.goto('https://bob.github.io/cv/');
        await page.evaluate(() => {
            localStorage.setItem('cv_editor_hint', JSON.stringify({
                login: 'bob', repository: 'jane/cv',
                site: 'https://bob.github.io/cv/', expires: Date.now() + 1e9
            }));
            localStorage.setItem('cv_repository', JSON.stringify({
                repository: 'jane/cv', site: 'https://bob.github.io/cv/'
            }));
        });

        await page.goto('https://bob.github.io/cv/?edit=true&owner=jane');
        await page.waitForSelector('#cv-name');
        log(await page.isVisible('#adminBtn'), 'F  forged state can show the button — it is only a button');

        await page.goto('https://bob.github.io/cv/admin/');
        await signIn(page, 'tok-bob');
        await page.evaluate(() => {
            // Straight at the internals: claim someone else's repository.
            const session = CVAuth.session();
            session.isOwner = true;
            session.canWrite = true;
            session.mayPublish = true;
            session.repository.owner = 'jane';
            session.repository.name = 'cv';
            session.repository.fullName = 'jane/cv';
        });
        await page.fill('#f-name', 'Owned');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="error"]', { timeout: 15000 });

        log(state.files['jane/cv:' + DATA] === before, 'F  no write reaches the victim repository');
        log(state.commits.length === 0, 'F  GitHub refused the commit');
        log(/refused|not accessible/i.test(await note(page)), 'F  and the refusal is reported',
            await note(page));
        await context.close();
    }

    /* -- G. Someone committed while the editor was open ----------------------- */
    {
        const state = await world();
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 'tok-jane');

        // Meanwhile, on GitHub…
        state.files['jane/cv:' + DATA] =
            'window.CV_DEFAULT_DATA = {"name":"Edited elsewhere","skills":{}};\n';
        const theirs = state.files['jane/cv:' + DATA];

        await page.fill('#f-name', 'From the editor');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="error"]', { timeout: 15000 });

        log(/changed on GitHub since you opened the editor/i.test(await note(page)),
            'G  the conflict is reported in plain words', await note(page));
        log(state.files['jane/cv:' + DATA] === theirs, 'G  the newer version is not overwritten');
        log(state.commits.length === 0, 'G  nothing was committed');

        page.once('dialog', dialog => dialog.accept());
        await page.click('#gh-note [data-action="reload"]');
        await page.waitForFunction(
            () => document.getElementById('f-name').value === 'Edited elsewhere',
            null, { timeout: 15000 });
        log(true, 'G  the latest version can be loaded into the editor');

        await page.fill('#f-name', 'Resolved');
        await page.click('.toolbar [data-action="publish"]');
        await page.waitForSelector('#gh-note[data-tone="ok"]', { timeout: 15000 });
        log(/"name": "Resolved"/.test(state.files['jane/cv:' + DATA]),
            'G  and publishing then succeeds');
        await context.close();
    }

    /* -- Where the token lives ------------------------------------------------ */
    {
        const state = await world();
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/admin/');
        await signIn(page, 'tok-jane');

        log(await page.evaluate(() => !!sessionStorage.getItem('cv_github_token')
            && !localStorage.getItem('cv_github_token')),
            'the token stays in sessionStorage unless asked otherwise');

        await page.click('[data-action="signout"]');
        await page.waitForSelector('#gh-anon:not([hidden])');
        log(await page.evaluate(() => !localStorage.getItem('cv_github_token')
            && !sessionStorage.getItem('cv_github_token')), 'signing out drops the token');
        log(await page.evaluate(() => !localStorage.getItem('cv_editor_hint')),
            'signing out drops the editor hint, so Edit CV disappears again');
        await context.close();
    }
    {
        const state = await world();
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/admin/');
        await page.waitForSelector('#gh-anon:not([hidden])', { timeout: 15000 });
        await page.click('[data-action="show-token-form"]');
        await page.fill('#gh-token', 'tok-jane');
        await page.check('#gh-remember');
        await page.click('[data-action="connect"]');
        await page.waitForSelector('#gh-account:not([hidden])', { timeout: 15000 });

        log(await page.evaluate(() => !!localStorage.getItem('cv_github_token')),
            '"stay signed in" is what moves it to localStorage');

        await page.goto('https://jane.github.io/cv/admin/');
        await page.waitForSelector('#gh-account:not([hidden])', { timeout: 15000 });
        log(/jane\/cv/.test(await page.textContent('#gh-target')), 'and the session resumes on return');

        // A token that has since been revoked should not linger.
        await page.evaluate(() => localStorage.setItem('cv_github_token', 'revoked'));
        await page.goto('https://jane.github.io/cv/admin/');
        await page.waitForSelector('#gh-anon:not([hidden])', { timeout: 15000 });
        log(await page.evaluate(() => !localStorage.getItem('cv_github_token')),
            'a token GitHub rejects is discarded rather than retried forever');
        await context.close();
    }

    /* -- Draft and published are different things ----------------------------- */
    {
        const state = await world();
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/admin/');

        await page.fill('#f-name', 'Draft Only');
        await page.click('.toolbar [data-action="save"]');
        await page.waitForTimeout(300);

        log(state.commits.length === 0, 'Save Draft commits nothing');
        log(await page.evaluate(() => !!localStorage.getItem('cv_data')),
            'the draft is kept in this browser');

        await page.goto('https://jane.github.io/cv/');
        await page.waitForSelector('#cv-name');
        log(await page.textContent('#cv-name') === 'Draft Only',
            'and shows on the CV — in this browser only');
        await context.close();
    }

    /* -- The preview is the CV, not an impression of it ----------------------- */
    {
        const state = await world();
        const { context, page } = await open(browser, state, MOUNTS, log);
        await page.goto('https://jane.github.io/cv/admin/');

        await page.fill('#f-name', 'Preview Person');
        await page.click('.toolbar [data-action="preview"]');
        await page.waitForSelector('#preview:not([hidden])');

        log(await page.textContent('#cv-name') === 'Preview Person', 'the preview renders the edited CV');
        log((await page.$$('#cv-main .section')).length > 0, 'with the real sections');
        log(!/Preview Person/.test(await page.title()), 'and leaves the editor page title alone');

        // The card at #card is the other half of the public page, built from the
        // same data — so it is previewable too.
        log(await page.isVisible('#preview-cv') && await page.isHidden('#preview-card'),
            'the full CV shows first');
        await page.click('[data-action="preview-view"]');
        log(await page.isVisible('#preview-card') && await page.isHidden('#preview-cv'),
            'the preview switches to the card view');
        log(await page.textContent('#card-name') === 'Preview Person',
            'the card shows the edited name');
        log((await page.$$('#card-links .linktree-link')).length > 0,
            'and the real contact buttons');
        await page.click('[data-action="preview-view"]');
        log(await page.isVisible('#preview-cv'), 'and switches back');

        await page.keyboard.press('Escape');
        log(await page.isHidden('#preview'), 'Escape closes it');
        await context.close();
    }
}
