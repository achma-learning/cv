/* ============================================================================
   EDITOR SESSION — who is signed in, and what they are allowed to publish.

   The rule, and the only rule:

       the signed-in GitHub user  ==  the owner of the repository serving
                                      *this* copy of the CV

   Both halves are established with GitHub, not with the page. The identity
   comes from GET /user, so a name typed into the browser proves nothing. The
   ownership comes from GET /repos/{owner}/{repo}. And neither is the real
   defence: the token itself is what GitHub checks when the commit is made, so
   an edited page, a forged flag in storage or a doctored query string cannot
   turn a visitor into an editor. They only ever change what the UI offers.

   Nothing here is stored in the repository. The token is supplied by the owner
   at runtime and stays in their browser.
   ========================================================================== */
(function (global) {
    'use strict';

    var TOKEN_KEY = 'cv_github_token';
    var DATA_PATH = 'assets/cv-data.js';

    // Repositories to ask about when hunting for the one that serves this site.
    var MAX_PROBES = 12;

    var current = null;

    function config() {
        return (global.CV_CONFIG && global.CV_CONFIG.oauth) || {};
    }

    function fail(message, code) {
        var error = new Error(message);
        error.code = code || 'auth';
        return error;
    }

    /* -- Token storage -------------------------------------------------------
       sessionStorage by default, so the token dies with the tab. localStorage
       only when the owner asks to stay signed in on a device they trust. */

    function readFrom(store) {
        try {
            return store.getItem(TOKEN_KEY) || '';
        } catch (e) {
            return '';
        }
    }

    function storedToken() {
        return readFrom(global.sessionStorage) || readFrom(global.localStorage);
    }

    function isRemembered() {
        return !!readFrom(global.localStorage);
    }

    function persistToken(token, remember) {
        forgetToken();
        try {
            (remember ? global.localStorage : global.sessionStorage).setItem(TOKEN_KEY, token);
        } catch (e) { /* storage refused — the session still works until reload */ }
    }

    function forgetToken() {
        [global.sessionStorage, global.localStorage].forEach(function (store) {
            try {
                store.removeItem(TOKEN_KEY);
            } catch (e) { /* nothing to clear */ }
        });
    }

    /* -- Finding the repository behind this site ----------------------------- */

    /** The first path segment of the site, e.g. "cv" in jane.github.io/cv/. */
    function siteSegment() {
        try {
            var segments = new URL(CVStore.siteUrl()).pathname.split('/').filter(Boolean);
            return (segments[0] || '').toLowerCase();
        } catch (e) {
            return '';
        }
    }

    /** Does this repository publish to the address we are being served from? */
    function verify(api, repo) {
        // On a laptop the URL says nothing about any repository, so there is
        // nothing to contradict.
        if (CVRepo.isLocal()) return Promise.resolve('unknown');

        // A repository with no Pages site cannot be the one serving this page.
        // Worth checking separately: this much is visible to any token, while
        // the Pages settings below are not.
        if (repo.has_pages === false) return Promise.resolve('mismatch');

        return api.pages(repo.owner.login, repo.name).then(function (pages) {
            if (!pages || !pages.html_url) return 'unknown';
            return CVStore.normalizeUrl(pages.html_url) === CVStore.normalizeUrl(CVStore.siteUrl())
                ? 'match' : 'mismatch';
        });
    }

    /** Try each candidate in turn, stopping at the one that serves this site. */
    function scan(api, candidates, target) {
        var index = 0;

        function next() {
            if (index >= candidates.length) return Promise.resolve(null);
            var repo = candidates[index++];
            return api.pages(repo.owner.login, repo.name).then(function (pages) {
                if (pages && pages.html_url && CVStore.normalizeUrl(pages.html_url) === target) return repo;
                return next();
            });
        }

        return next();
    }

    /**
     * Ask GitHub which of the signed-in user's own repositories publishes to
     * this address. Used on custom domains, on localhost, and whenever the URL
     * guess turns out to be wrong — no configuration required.
     */
    function discover(api, user) {
        var wanted = siteSegment();
        var target = CVStore.normalizeUrl(CVStore.siteUrl());

        function likelihood(repo) {
            var name = repo.name.toLowerCase();
            if (wanted && name === wanted) return 3;
            if (name === (user.login + '.github.io').toLowerCase()) return 2;
            if (name === 'cv') return 1;
            return 0;
        }

        return api.ownedRepos().then(function (repos) {
            var candidates = repos.filter(function (repo) {
                return repo.has_pages && !repo.archived
                    && repo.owner && repo.owner.login.toLowerCase() === user.login.toLowerCase();
            });
            candidates.sort(function (a, b) { return likelihood(b) - likelihood(a); });

            return scan(api, candidates.slice(0, MAX_PROBES), target).then(function (found) {
                return found ? [found] : candidates;
            });
        }).catch(function () {
            // Searching is a convenience. If GitHub will not list repositories
            // for this token, fall back to asking rather than refusing to sign
            // in — and any real problem will resurface on the first publish.
            return [];
        });
    }

    /**
     * Everything needed to write to a repository: which branch GitHub Pages
     * builds from, and where assets/cv-data.js sits inside it.
     */
    function describe(api, candidate) {
        // Whether this token may write is the one fact the whole editor turns
        // on, so take it from the repository endpoint rather than from whatever
        // listing happened to produce this candidate.
        var complete = candidate.permissions
            ? Promise.resolve(candidate)
            : api.repo(candidate.owner.login, candidate.name);

        return complete.then(function (repo) {
            return api.pages(repo.owner.login, repo.name).then(function (pages) {
                return { repo: repo, pages: pages };
            });
        }).then(function (found) {
            var repo = found.repo;
            var pages = found.pages;

            var branch = repo.default_branch;
            var folder = '';

            // "Deploy from a branch" states the branch and folder outright.
            // A site built by a workflow has neither, so the default branch is
            // the sensible target.
            if (pages && pages.build_type !== 'workflow' && pages.source && pages.source.branch) {
                branch = pages.source.branch;
                folder = String(pages.source.path || '/').replace(/^\/+|\/+$/g, '');
            }

            // The CV may sit in a subfolder of the site rather than at its root
            // — a personal site with the CV at /cv/, say. Whatever separates
            // this page from the site root separates the file from the folder
            // Pages builds.
            var site = CVStore.normalizeUrl(CVStore.siteUrl());
            var root = CVStore.normalizeUrl(pages && pages.html_url);
            var within = root && site.indexOf(root) === 0 ? site.slice(root.length) : '';

            if (folder && within) folder += '/' + within.replace(/\/+$/, '');
            else if (within) folder = within.replace(/\/+$/, '');

            return {
                repository: {
                    owner: repo.owner.login,
                    name: repo.name,
                    fullName: repo.full_name,
                    ownerType: repo.owner.type,
                    defaultBranch: repo.default_branch,
                    permissions: repo.permissions || {},
                    htmlUrl: repo.html_url
                },
                branch: branch,
                dataPath: (folder ? folder + '/' : '') + DATA_PATH,
                siteUrl: (pages && pages.html_url) || ''
            };
        });
    }

    function resolve(api, user) {
        var guess = CVRepo.detect();
        var fallback = null;

        var lookup = guess
            ? api.repo(guess.owner, guess.name).catch(function () { return null; })
            : Promise.resolve(null);

        return lookup.then(function (repo) {
            if (!repo) return discover(api, user);

            // An explicit setting or a confirmed choice is taken at its word. A
            // guess from the URL is checked, because jane.github.io/cv/ might be
            // a folder in the user site rather than the repository "cv".
            if (guess.source !== 'url') return [repo];

            return verify(api, repo).then(function (verdict) {
                if (verdict !== 'mismatch') return [repo];
                fallback = repo;
                return discover(api, user);
            });
        }).then(function (matches) {
            if (matches.length === 1) return describe(api, matches[0]);
            if (matches.length > 1) return { candidates: matches };
            if (fallback) return describe(api, fallback);
            return { candidates: [] };
        });
    }

    /* -- Session -------------------------------------------------------------- */

    function build(token, api, user, outcome) {
        var session = {
            token: token,
            api: api,
            user: {
                login: user.login,
                name: user.name || user.login,
                avatar: user.avatar_url,
                htmlUrl: user.html_url
            },
            repository: null,
            candidates: outcome.candidates || [],
            branch: '',
            dataPath: DATA_PATH,
            siteUrl: '',
            isOwner: false,
            canWrite: false,
            mayPublish: false
        };

        if (outcome.repository) {
            session.repository = outcome.repository;
            session.branch = outcome.branch;
            session.dataPath = outcome.dataPath;
            session.siteUrl = outcome.siteUrl;

            // The ownership rule. Note it is deliberately the *current*
            // repository's owner: a fork belongs to whoever forked it, and the
            // author of the original has no standing here at all.
            session.isOwner = session.repository.owner.toLowerCase() === user.login.toLowerCase();

            // What GitHub says this token can do. Both must hold, and GitHub
            // enforces the second one again on every write.
            session.canWrite = !!(session.repository.permissions.push
                || session.repository.permissions.admin);
            session.mayPublish = session.isOwner && session.canWrite;
        }

        return session;
    }

    function syncHint(session) {
        if (session && session.mayPublish) {
            CVStore.setEditorHint({
                login: session.user.login,
                repository: session.repository.fullName
            });
        } else {
            CVStore.clearEditorHint();
        }
    }

    /** Sign in with a token, and work out what it is allowed to do here. */
    function signIn(token, remember) {
        token = String(token || '').trim();
        if (!token) return Promise.reject(fail('Paste a token first.', 'empty'));

        var api = CVGitHub.client(token);
        var identity;

        return api.user().then(function (user) {
            identity = user;
            return resolve(api, user);
        }).then(function (outcome) {
            current = build(token, api, identity, outcome);
            persistToken(token, remember);
            syncHint(current);
            return current;
        });
    }

    /** Resume a session from a token left in this browser, or resolve to null. */
    function restore() {
        var token = storedToken();
        if (!token) return Promise.resolve(null);
        return signIn(token, isRemembered());
    }

    /** Point the session at a repository the owner picked or corrected. */
    function chooseRepository(ref) {
        if (!current) return Promise.reject(fail('Sign in first.', 'signed_out'));

        return current.api.repo(ref.owner, ref.name).then(function (repo) {
            return describe(current.api, repo);
        }).then(function (outcome) {
            current = build(current.token, current.api, {
                login: current.user.login,
                name: current.user.name,
                avatar_url: current.user.avatar,
                html_url: current.user.htmlUrl
            }, outcome);
            CVRepo.remember({ owner: outcome.repository.owner, name: outcome.repository.name });
            syncHint(current);
            return current;
        });
    }

    function signOut() {
        current = null;
        forgetToken();
        CVStore.clearEditorHint();
    }

    function session() {
        return current;
    }

    /* -- Optional: "Sign in with GitHub" -------------------------------------
       GitHub's device flow needs no client secret, which makes it safe for a
       page anyone can read. What it does need is a relay: github.com refuses
       cross-origin browser requests, unlike api.github.com. A fork that has not
       set one up simply uses a token instead, and everything below stays dark.
       See the README for the twenty lines of relay involved. */

    function relay(path, params) {
        var base = String(config().relay || '').replace(/\/+$/, '');
        return global.fetch(base + path, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        }).then(function (response) {
            return response.json().catch(function () { return null; }).then(function (body) {
                if (!body) throw fail('The sign-in relay returned something unreadable.', 'relay');
                return body;
            });
        }, function () {
            throw fail('Could not reach the sign-in relay. You can sign in with a token instead.', 'relay');
        });
    }

    function delay(seconds) {
        return new Promise(function (done) { global.setTimeout(done, seconds * 1000); });
    }

    var oauth = {
        available: function () {
            return !!(config().clientId && config().relay);
        },

        /** Ask GitHub for a code the owner types into github.com/login/device. */
        start: function () {
            return relay('/login/device/code', {
                client_id: config().clientId,
                scope: config().scope || 'public_repo'
            }).then(function (body) {
                if (!body.device_code) {
                    throw fail(body.error_description || 'GitHub would not start the sign-in.', 'relay');
                }
                return body;
            });
        },

        /** Wait for them to approve it, then hand back an access token. */
        wait: function (device) {
            var interval = Math.max(Number(device.interval) || 5, 1);
            var deadline = Date.now() + (Number(device.expires_in) || 900) * 1000;

            function attempt() {
                if (Date.now() > deadline) {
                    throw fail('That sign-in code expired. Please start again.', 'expired');
                }
                return delay(interval).then(function () {
                    return relay('/login/oauth/access_token', {
                        client_id: config().clientId,
                        device_code: device.device_code,
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                    });
                }).then(function (body) {
                    if (body.access_token) return body.access_token;
                    if (body.error === 'authorization_pending') return attempt();
                    if (body.error === 'slow_down') {
                        interval = Math.max(interval + 5, Number(body.interval) || interval);
                        return attempt();
                    }
                    if (body.error === 'access_denied') {
                        throw fail('Sign-in was cancelled on GitHub.', 'denied');
                    }
                    throw fail(body.error_description || 'GitHub declined the sign-in.', 'denied');
                });
            }

            return attempt();
        }
    };

    global.CVAuth = {
        DATA_PATH: DATA_PATH,
        storedToken: storedToken,
        isRemembered: isRemembered,
        signIn: signIn,
        restore: restore,
        chooseRepository: chooseRepository,
        signOut: signOut,
        session: session,
        oauth: oauth
    };
})(window);
