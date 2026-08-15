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
            isAdmin: false,
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

            // What GitHub says this token can do here.
            session.canWrite = !!(session.repository.permissions.push
                || session.repository.permissions.admin);
            session.isAdmin = session.repository.permissions.admin === true;

            if (session.repository.ownerType === 'Organization') {
                // An organisation cannot sign in, so "the owner" has to mean
                // the people who administer the repository on its behalf —
                // otherwise an organisation-hosted CV could never be edited.
                // Administration, not mere write access: a contributor with
                // push rights is not the owner of the CV.
                session.mayPublish = session.isAdmin;
            } else {
                // A personal repository stays strict. Collaborators with push
                // access are deliberately excluded: this is somebody's CV, and
                // the account it belongs to is the one that may change it.
                session.mayPublish = session.isOwner && session.canWrite;
            }
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

    /**
     * Find assets/cv-data.js when it is not where we expected.
     *
     * The token we ask people to create covers repository contents and nothing
     * else, which means the Pages settings — the authoritative word on which
     * branch and folder the site is built from — are often unreadable. Rather
     * than ask for a second permission, look for the file: a site published
     * from /docs or from gh-pages gives itself away by where the file sits.
     *
     * Resolves to true when the session was corrected.
     */
    function locate() {
        var session = current;
        if (!session || !session.repository) return Promise.resolve(false);

        var owner = session.repository.owner;
        var name = session.repository.name;

        // What the site's own address suggests the folder should be, e.g. the
        // CV at jane.github.io/cv/ inside a user-site repository lives in cv/.
        var wanted = '';
        try {
            wanted = new URL(CVStore.siteUrl()).pathname.split('/').filter(Boolean).join('/');
        } catch (e) { /* no hint available */ }

        return session.api.branches(owner, name).then(function (list) {
            var names = (list || []).map(function (branch) { return branch.name; });
            var order = [session.branch, session.repository.defaultBranch, 'gh-pages', 'main', 'master']
                .concat(names)
                .filter(function (branch, index, all) {
                    return branch && all.indexOf(branch) === index
                        && (!names.length || names.indexOf(branch) !== -1);
                })
                .slice(0, 4);

            var index = 0;

            function next() {
                if (index >= order.length) return false;
                var branch = order[index++];

                return session.api.tree(owner, name, branch).then(function (entries) {
                    var matches = entries.filter(function (item) {
                        return item.type === 'blob' && /(^|\/)assets\/cv-data\.js$/.test(item.path);
                    }).map(function (item) { return item.path; });

                    if (!matches.length) return next();

                    // Prefer the copy whose folder matches this page's address;
                    // otherwise the shallowest, which is the site root.
                    matches.sort(function (a, b) {
                        var aWanted = wanted && a.indexOf(wanted + '/') === 0 ? 0 : 1;
                        var bWanted = wanted && b.indexOf(wanted + '/') === 0 ? 0 : 1;
                        return aWanted - bWanted || a.split('/').length - b.split('/').length;
                    });

                    session.branch = branch;
                    session.dataPath = matches[0];
                    return true;
                });
            }

            return next();
        }).catch(function () { return false; });
    }

    function signOut() {
        current = null;
        forgetToken();
        CVStore.clearEditorHint();
    }

    function session() {
        return current;
    }

    global.CVAuth = {
        DATA_PATH: DATA_PATH,
        storedToken: storedToken,
        isRemembered: isRemembered,
        signIn: signIn,
        restore: restore,
        chooseRepository: chooseRepository,
        locate: locate,
        signOut: signOut,
        session: session
    };
})(window);
