/* ============================================================================
   REPOSITORY DETECTION

   Works out which GitHub repository is serving this copy of the CV. That
   repository — never the one this project was forked from — is the only one the
   editor will ever write to, and its owner is the only person allowed to edit.

   Detection is a *guess*, deliberately: it decides which repository to look at,
   never who may write to it. GitHub decides that, and rejects the commit if the
   signed-in user has no write access. So a tampered guess gains an attacker
   nothing beyond an error message.
   ========================================================================== */
(function (global) {
    'use strict';

    var REMEMBER_KEY = 'cv_repository';

    function config() {
        return global.CV_CONFIG || {};
    }

    /** "owner/name", or a github.com URL, into { owner, name }. */
    function parse(value) {
        var match = /^\s*(?:https?:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?\s*$/
            .exec(String(value || ''));
        if (!match) return null;
        return { owner: match[1], name: match[2] };
    }

    function key(ref) {
        return ref ? ref.owner + '/' + ref.name : '';
    }

    /** True on a laptop rather than a deployed site, where URLs say nothing. */
    function isLocal() {
        return /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(global.location.hostname)
            || global.location.protocol === 'file:';
    }

    /**
     * Read the repository out of a github.io address:
     *   https://jane.github.io/cv/   → jane/cv
     *   https://jane.github.io/      → jane/jane.github.io
     * A custom domain carries no such information and returns null.
     */
    function fromPagesUrl() {
        var match = /^([a-z0-9-]+)\.github\.io$/.exec(global.location.hostname.toLowerCase());
        if (!match) return null;

        var owner = match[1];
        var segments;
        try {
            segments = new URL(CVStore.siteUrl()).pathname.split('/').filter(Boolean);
        } catch (e) {
            segments = [];
        }
        return {
            owner: owner,
            name: segments.length ? segments[0] : owner + '.github.io',
            source: 'url'
        };
    }

    /* -- The repository the owner last confirmed for this site --------------
       A convenience so the choice is not repeated on every visit. Like every
       other value in the browser, it selects a repository and grants nothing. */

    function remembered() {
        var raw;
        try {
            raw = global.localStorage.getItem(REMEMBER_KEY);
        } catch (e) {
            return null;
        }
        if (!raw) return null;

        var saved;
        try {
            saved = JSON.parse(raw);
        } catch (e) {
            return null;
        }
        if (!saved || CVStore.normalizeUrl(saved.site) !== CVStore.normalizeUrl(CVStore.siteUrl())) return null;

        var ref = parse(saved.repository);
        if (ref) ref.source = 'remembered';
        return ref;
    }

    function remember(ref) {
        if (!ref) return;
        try {
            global.localStorage.setItem(REMEMBER_KEY, JSON.stringify({
                repository: key(ref),
                site: CVStore.siteUrl()
            }));
        } catch (e) { /* remembering is optional */ }
    }

    function forget() {
        try {
            global.localStorage.removeItem(REMEMBER_KEY);
        } catch (e) { /* nothing to clear */ }
    }

    /** Best guess at the repository behind this page, or null if unknowable. */
    function detect() {
        var configured = parse(config().repository);
        if (configured) {
            configured.source = 'config';
            return configured;
        }
        return remembered() || fromPagesUrl();
    }

    global.CVRepo = {
        detect: detect,
        parse: parse,
        key: key,
        isLocal: isLocal,
        remember: remember,
        forget: forget
    };
})(window);
