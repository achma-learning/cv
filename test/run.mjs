/* ============================================================================
   Runs every suite in one browser.

       npm install --no-save playwright   (once)
       node test/run.mjs

   Nothing here touches GitHub or the network: the suites mount the working tree
   at a made-up address and answer api.github.com themselves.
   ========================================================================== */
import { chromium } from 'playwright';

import authorization from './authorization.test.mjs';
import deployment from './deployment.test.mjs';
import deviceFlow from './device-flow.test.mjs';

const SUITES = [
    ['Who may publish', authorization],
    ['Where the CV lives', deployment],
    ['Sign in with GitHub (optional)', deviceFlow]
];

let passed = 0;
const failures = [];

function log(ok, name, detail) {
    if (ok) {
        passed++;
        console.log('  ok    ' + name);
    } else {
        failures.push(name);
        console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : ''));
    }
}

const browser = await chromium.launch();

for (const [title, suite] of SUITES) {
    console.log('\n' + title);
    try {
        await suite(browser, log);
    } catch (error) {
        log(false, title + ' — the suite itself failed', error.message);
    }
}

await browser.close();

console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
    failures.forEach(name => console.log('  - ' + name));
    process.exit(1);
}
