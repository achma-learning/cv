/* ============================================================================
   GITHUB API CLIENT

   A small wrapper over the REST API, loaded only by the editor. Calls go from
   the browser straight to api.github.com, which allows cross-origin requests —
   there is no server in between, and no credential anywhere in this repository.
   The token belongs to the signed-in owner and is supplied at runtime.
   ========================================================================== */
(function (global) {
    'use strict';

    var API = 'https://api.github.com';
    var API_VERSION = '2022-11-28';

    /* -- Errors -------------------------------------------------------------
       Every failure carries a `code` the editor can branch on, and a message
       written for the person reading it rather than for a log file. */

    function fail(message, code, status) {
        var error = new Error(message);
        error.code = code || 'unknown';
        error.status = status || 0;
        return error;
    }

    function describe(response, body) {
        var detail = (body && body.message) || '';

        if (response.status === 401) {
            return fail('GitHub did not accept that token. It may have expired, been revoked, '
                + 'or been copied incompletely.', 'unauthorized', 401);
        }
        if (response.status === 403 && /rate limit/i.test(detail)) {
            return fail('GitHub is rate-limiting this browser. Please try again in a few minutes.',
                'rate_limited', 403);
        }
        if (response.status === 403) {
            return fail('GitHub refused that action: ' + (detail || 'the token has no write access here.'),
                'forbidden', 403);
        }
        if (response.status === 404) {
            return fail(detail || 'GitHub could not find that.', 'not_found', 404);
        }
        if (response.status === 409) {
            return fail(detail || 'The file changed on GitHub.', 'conflict', 409);
        }
        if (response.status === 422) {
            return fail(detail || 'GitHub rejected the request.', 'invalid', 422);
        }
        return fail(detail || ('GitHub returned an unexpected error (' + response.status + ').'),
            'unknown', response.status);
    }

    /* -- Base64 that survives accented characters and emoji ------------------ */

    function encodeBase64(text) {
        var bytes = new TextEncoder().encode(text);
        var binary = '';
        // btoa takes a binary string; chunked so a long CV cannot blow the
        // argument limit of String.fromCharCode.
        for (var i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }

    function decodeBase64(value) {
        var binary = atob(String(value || '').replace(/\s+/g, ''));
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    /* -- Client -------------------------------------------------------------- */

    function client(token) {
        function request(method, path, body) {
            var options = {
                method: method,
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': API_VERSION
                }
            };
            if (token) options.headers.Authorization = 'Bearer ' + token;
            if (body !== undefined) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }

            return global.fetch(API + path, options).then(function (response) {
                if (response.status === 204) return { response: response, body: null };
                return response.json()
                    .catch(function () { return null; })
                    .then(function (json) { return { response: response, body: json }; });
            }, function () {
                throw fail('Could not reach GitHub. Check your internet connection and try again.',
                    'network', 0);
            }).then(function (result) {
                if (!result.response.ok) throw describe(result.response, result.body);
                return result.body;
            });
        }

        /** Who the token actually belongs to. Asked of GitHub, never of the page. */
        function user() {
            return request('GET', '/user');
        }

        function repo(owner, name) {
            return request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name));
        }

        /**
         * Pages settings: which URL this repository publishes to, and which
         * branch and folder it publishes from. Needs write access, so it fails
         * quietly for anyone who is not the owner.
         */
        function pages(owner, name) {
            return request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name) + '/pages')
                .catch(function () { return null; });
        }

        /** Repositories the signed-in user owns. One page is plenty to find a CV. */
        function ownedRepos() {
            return request('GET', '/user/repos?affiliation=owner&sort=pushed&per_page=100');
        }

        function branches(owner, name) {
            return request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name)
                + '/branches?per_page=100').catch(function () { return []; });
        }

        /**
         * Every file on a branch. Used to find the CV data file when the Pages
         * settings are not readable — a token limited to Contents cannot see
         * them, which is the token we ask people for.
         */
        function tree(owner, name, ref) {
            return request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name)
                + '/git/trees/' + encodeURIComponent(ref) + '?recursive=1'
            ).then(function (result) {
                return (result && result.tree) || [];
            }).catch(function () { return []; });
        }

        /** File contents plus the version marker GitHub needs back on write. */
        function getFile(owner, name, path, ref) {
            var url = '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name)
                + '/contents/' + path.split('/').map(encodeURIComponent).join('/')
                + (ref ? '?ref=' + encodeURIComponent(ref) : '');

            return request('GET', url).then(function (file) {
                if (file.content && file.encoding === 'base64') {
                    return { sha: file.sha, text: decodeBase64(file.content) };
                }
                // Files over 1 MB arrive without inline content — a CV with
                // embedded photographs can get there. Fetch the blob instead.
                return request('GET', '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name)
                    + '/git/blobs/' + encodeURIComponent(file.sha)
                ).then(function (blob) {
                    return { sha: file.sha, text: decodeBase64(blob.content) };
                });
            }).catch(function (error) {
                if (error.code === 'not_found') return null;  // not written yet
                throw error;
            });
        }

        /**
         * Commit `text` to `path`. Passing the `sha` we last read is what makes
         * this safe: GitHub refuses the write if someone else has committed in
         * the meantime, rather than quietly discarding their work.
         */
        function putFile(options) {
            var body = {
                message: options.message,
                content: encodeBase64(options.text),
                branch: options.branch
            };
            if (options.sha) body.sha = options.sha;

            return request('PUT', '/repos/' + encodeURIComponent(options.owner)
                + '/' + encodeURIComponent(options.name)
                + '/contents/' + options.path.split('/').map(encodeURIComponent).join('/'), body);
        }

        return {
            request: request,
            user: user,
            repo: repo,
            pages: pages,
            ownedRepos: ownedRepos,
            branches: branches,
            tree: tree,
            getFile: getFile,
            putFile: putFile
        };
    }

    global.CVGitHub = {
        client: client,
        encodeBase64: encodeBase64,
        decodeBase64: decodeBase64
    };
})(window);
