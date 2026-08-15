/* ============================================================================
   CV STORE — shared by the CV page and the /admin editor.

   Content comes from assets/cv-data.js (committed, public). The editor layers
   a private draft on top via localStorage, so work in progress survives a
   reload without a server or a build step.

       localStorage → a draft in this browser only
       GitHub       → the published source of truth

   The draft disappears by itself once the published file catches up with it.
   ========================================================================== */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'cv_data';

    // Set by the editor after GitHub confirms who is signed in. It only decides
    // whether the CV page offers an "Edit CV" link — it is never authorisation,
    // and forging it grants nothing, because every write is checked by GitHub.
    var HINT_KEY = 'cv_editor_hint';

    // Pages in subdirectories (e.g. /admin/) set this so that repo-relative
    // image paths such as "img.jpg" still resolve to the repository root.
    function base() {
        return global.CV_ASSET_BASE || '';
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    /** Structural equality, good enough for the plain data this file handles. */
    function same(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    /* -- Where this copy of the CV lives ------------------------------------
       The site root as an absolute URL, from any page of the site: /admin/
       already declares its distance from the root via CV_ASSET_BASE. */
    function siteUrl() {
        try {
            return new URL(base() || './', global.location.href).href;
        } catch (e) {
            return global.location.origin + '/';
        }
    }

    /** Compare two site URLs without tripping over a scheme or trailing slash. */
    function normalizeUrl(url) {
        var value = String(url || '').trim().toLowerCase();
        if (!value) return '';
        value = value.replace(/^http:\/\//, 'https://').split('#')[0].split('?')[0];
        return value.charAt(value.length - 1) === '/' ? value : value + '/';
    }

    function readJson(key) {
        var raw;
        try {
            raw = global.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
        if (!raw) return null;
        try {
            var parsed = JSON.parse(raw);
            return isPlainObject(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    /** Pristine copy of the committed content. Never returns a shared reference. */
    function defaults() {
        return clone(global.CV_DEFAULT_DATA || {});
    }

    /** Committed content with the local override applied on top. */
    function load() {
        var data = defaults();
        var stored;
        try {
            stored = global.localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return data; // storage disabled (private mode, blocked cookies)
        }
        if (!stored) return data;

        var parsed;
        try {
            parsed = JSON.parse(stored);
        } catch (e) {
            return data; // corrupt override — fall back rather than break the page
        }
        if (!isPlainObject(parsed)) return data;

        var merged = Object.assign(data, parsed);
        merged.skills = Object.assign(defaults().skills || {}, parsed.skills || {});

        // A draft that matches the published content is no longer a draft: the
        // commit landed and GitHub Pages caught up. Drop it, so from here on the
        // page simply follows the repository.
        if (same(merged, defaults())) {
            clear();
            return defaults();
        }
        return merged;
    }

    /** Persist the override. Throws if the browser refuses (quota exceeded). */
    function save(data) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function clear() {
        try {
            global.localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* nothing to clear */ }
    }

    function hasOverride() {
        try {
            return global.localStorage.getItem(STORAGE_KEY) !== null;
        } catch (e) {
            return false;
        }
    }

    /* -- Editor hint --------------------------------------------------------
       Purely cosmetic: it lets the CV page show "Edit CV" to the person who
       has already signed in, without the public page carrying any GitHub code
       or touching the token. */

    function editorHint() {
        var hint = readJson(HINT_KEY);
        if (!hint) return null;
        if (!hint.expires || hint.expires < Date.now()) {
            clearEditorHint();
            return null;
        }
        // Storage is shared by every site on this origin; make sure the hint
        // belongs to *this* CV.
        if (normalizeUrl(hint.site) !== normalizeUrl(siteUrl())) return null;
        return hint;
    }

    function setEditorHint(hint) {
        try {
            global.localStorage.setItem(HINT_KEY, JSON.stringify(Object.assign({
                site: siteUrl(),
                expires: Date.now() + 30 * 24 * 60 * 60 * 1000
            }, hint)));
        } catch (e) { /* the link is a convenience; storage refusing it is fine */ }
    }

    function clearEditorHint() {
        try {
            global.localStorage.removeItem(HINT_KEY);
        } catch (e) { /* nothing to clear */ }
    }

    /** Escape a value for interpolation into HTML text or a quoted attribute. */
    function escape(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Resolve an image reference for the current page. Data URIs and absolute
     * URLs pass through; repo-relative paths get the page's base prefix.
     */
    function asset(src) {
        var value = String(src || '').trim();
        if (!value) return '';
        if (/^(data:|https?:|\/\/|\/)/i.test(value)) return value;
        return base() + value;
    }

    /** Render a `data` object as the text of assets/cv-data.js, ready to commit. */
    function serialize(data) {
        return '/* Written by the CV editor at /admin. This file is the published CV. */\n'
            + 'window.CV_DEFAULT_DATA = ' + JSON.stringify(data, null, 4) + ';\n';
    }

    /** Parse either raw JSON or the contents of a cv-data.js file. */
    function deserialize(text) {
        var source = String(text || '').trim();
        if (source.charAt(0) !== '{') {
            var start = source.indexOf('{');
            var end = source.lastIndexOf('}');
            if (start === -1 || end === -1 || end < start) {
                throw new Error('No CV data object found in that file.');
            }
            source = source.slice(start, end + 1);
        }
        var parsed = JSON.parse(source);
        if (!isPlainObject(parsed)) throw new Error('That file does not contain a CV data object.');
        return parsed;
    }

    global.CVStore = {
        STORAGE_KEY: STORAGE_KEY,
        defaults: defaults,
        load: load,
        save: save,
        clear: clear,
        hasOverride: hasOverride,
        same: same,
        siteUrl: siteUrl,
        normalizeUrl: normalizeUrl,
        editorHint: editorHint,
        setEditorHint: setEditorHint,
        clearEditorHint: clearEditorHint,
        escape: escape,
        asset: asset,
        serialize: serialize,
        deserialize: deserialize
    };
})(window);
