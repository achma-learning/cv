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

    /* -- Reading and writing assets/cv-data.js -------------------------------
       The editor rewrites this file, and somebody may well open it afterwards,
       so it is written the way a person would write it: a header explaining
       what it is, and the same section headings the CV itself has. Comments
       are emitted rather than parsed out of the previous file — generating
       them is exact, whereas preserving hand-written ones would mean carrying
       a JavaScript parser around for the sake of cosmetics. */

    var FILE_HEADER = [
        '/* ============================================================================',
        '   CV CONTENT — the single source of truth for this site.',
        '',
        '   Whatever is in this file is what visitors see. There are two ways to change',
        '   it, and they end in the same place:',
        '',
        '     - Edit it here and commit.',
        '     - Use the editor at /admin/ and press Publish, which commits this file for',
        '       you. Signing in with GitHub is what makes that possible, and only the',
        '       account that owns this repository can do it.',
        '',
        '   Fields left empty ("" or []) are simply not rendered.',
        '   ========================================================================== */'
    ].join('\n');

    // Mirrors the order of the CV itself, so the file reads like the document.
    var FILE_SECTIONS = [
        { title: 'Identity', keys: ['name', 'tagline'] },
        { title: 'Contact', keys: [
            'email', 'phone', 'location', 'locationUrl', 'website', 'websiteLabel',
            'github', 'githubLabel', 'linkedin', 'linkedinLabel',
            'scholar', 'scholarLabel', 'orcid', 'orcidLabel'
        ] },
        { title: 'Images (repo-relative path, absolute URL, or empty to hide)',
            keys: ['profilePhoto', 'signaturePhoto'] },
        { title: 'Sections', keys: [
            'education', 'employment', 'skills', 'openSource',
            'talks', 'teaching', 'competitions', 'awards', 'coursework'
        ] }
    ];

    function rule(title) {
        var line = '    // -- ' + title + ' ';
        return line + new Array(Math.max(2, 79 - line.length)).join('-');
    }

    function entry(key, value) {
        // Indent the continuation lines of nested arrays and objects to sit
        // under the key they belong to.
        return '    ' + JSON.stringify(key) + ': '
            + JSON.stringify(value, null, 4).split('\n').join('\n    ');
    }

    function withComments(data) {
        var remaining = Object.keys(data);
        var blocks = [];

        FILE_SECTIONS.forEach(function (section) {
            var present = section.keys.filter(function (key) { return remaining.indexOf(key) !== -1; });
            if (!present.length) return;
            present.forEach(function (key) { remaining.splice(remaining.indexOf(key), 1); });
            blocks.push(rule(section.title) + '\n'
                + present.map(function (key) { return entry(key, data[key]); }).join(',\n'));
        });

        // Anything the schema does not know about still gets written out.
        if (remaining.length) {
            blocks.push(remaining.map(function (key) { return entry(key, data[key]); }).join(',\n'));
        }

        return FILE_HEADER + '\nwindow.CV_DEFAULT_DATA = {\n' + blocks.join(',\n\n') + '\n};\n';
    }

    function plain(data) {
        return FILE_HEADER + '\nwindow.CV_DEFAULT_DATA = ' + JSON.stringify(data, null, 4) + ';\n';
    }

    /** Render a `data` object as the text of assets/cv-data.js, ready to commit. */
    function serialize(data) {
        var text = withComments(data);
        // Never publish something this file cannot read back. If the commented
        // form is not perfectly faithful, fall back to plain JSON rather than
        // commit a file that might not parse.
        try {
            if (same(deserialize(text), data)) return text;
        } catch (e) { /* fall through */ }
        return plain(data);
    }

    /**
     * Turn a JavaScript object literal into JSON.
     *
     * cv-data.js is meant to be edited by hand as well as by the editor, so
     * what comes back from GitHub may be JSON, or may be perfectly ordinary
     * JavaScript: unquoted keys, single quotes, comments, a trailing comma.
     * All of those have to load, or the editor cannot read a file somebody
     * wrote themselves — including the one this project ships with.
     *
     * This rewrites those into JSON rather than evaluating anything.
     */
    function toJson(source) {
        var out = '';
        var i = 0;

        /** The next character that is not whitespace or a comment. */
        function peek(from) {
            while (from < source.length) {
                var c = source.charAt(from);
                if (c === '/' && source.charAt(from + 1) === '/') {
                    while (from < source.length && source.charAt(from) !== '\n') from++;
                } else if (c === '/' && source.charAt(from + 1) === '*') {
                    var close = source.indexOf('*/', from + 2);
                    from = close === -1 ? source.length : close + 2;
                } else if (/\s/.test(c)) {
                    from++;
                } else {
                    return c;
                }
            }
            return '';
        }

        while (i < source.length) {
            var ch = source.charAt(i);

            // Strings, in either quote style, come out double-quoted.
            if (ch === '"' || ch === "'") {
                var quote = ch;
                out += '"';
                i++;
                while (i < source.length && source.charAt(i) !== quote) {
                    var c = source.charAt(i);
                    if (c === '\\') {
                        var escaped = source.charAt(i + 1);
                        // \' is not valid JSON; the character speaks for itself.
                        out += escaped === "'" ? "'" : '\\' + escaped;
                        i += 2;
                    } else {
                        out += c === '"' ? '\\"' : c;   // a " inside '…' must be escaped
                        i++;
                    }
                }
                out += '"';
                i++;
                continue;
            }

            if (ch === '/' && source.charAt(i + 1) === '/') {
                while (i < source.length && source.charAt(i) !== '\n') i++;
                continue;
            }
            if (ch === '/' && source.charAt(i + 1) === '*') {
                var end = source.indexOf('*/', i + 2);
                i = end === -1 ? source.length : end + 2;
                continue;
            }

            // A bare word: a key to be quoted, or a literal to be left alone.
            if (/[A-Za-z_$]/.test(ch)) {
                var word = '';
                while (i < source.length && /[A-Za-z0-9_$]/.test(source.charAt(i))) {
                    word += source.charAt(i++);
                }
                out += peek(i) === ':' ? JSON.stringify(word) : word;
                continue;
            }

            // A comma with nothing after it but a closing bracket.
            if (ch === ',') {
                var after = peek(i + 1);
                i++;
                if (after !== '}' && after !== ']') out += ',';
                continue;
            }

            out += ch;
            i++;
        }
        return out;
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

        var parsed;
        try {
            parsed = JSON.parse(toJson(source));
        } catch (e) {
            throw new Error('That file could not be read as CV data.');
        }
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
