/* ============================================================================
   CV RENDER — turns a CV data object into the document.
   ========================================================================== */
(function (global) {
    'use strict';

    var esc = global.CVStore.escape;
    var asset = global.CVStore.asset;

    /* -- Small helpers ---------------------------------------------------- */

    function icon(name) {
        return '<i class="' + name + '" aria-hidden="true"></i>';
    }

    /** Show an <img> only when it has a source; otherwise keep it out of the DOM flow. */
    function setImage(el, src, alt) {
        if (!el) return;
        var resolved = asset(src);
        if (resolved) {
            el.src = resolved;
            if (alt) el.alt = alt;
            el.hidden = false;
        } else {
            el.removeAttribute('src');
            el.hidden = true;
        }
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value || '';
    }

    function setHtml(id, value) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = value || '';
    }

    /* -- Contact links ----------------------------------------------------- */

    /**
     * The one list of contact channels, used for both the compact header row
     * and the card view's Linktree-style buttons.
     */
    function contactLinks(d) {
        var links = [
            { href: d.email ? 'mailto:' + d.email : '', icon: 'fas fa-envelope', label: d.email },
            { href: d.phone ? 'tel:' + String(d.phone).replace(/\s+/g, '') : '', icon: 'fas fa-phone', label: d.phone },
            { href: d.locationUrl, icon: 'fas fa-map-marker-alt', label: d.location, requires: d.location, external: true },
            { href: d.website, icon: 'fas fa-globe', label: d.websiteLabel || d.website, external: true },
            { href: d.scholar, icon: 'fas fa-graduation-cap', label: d.scholarLabel || 'Google Scholar', external: true },
            { href: d.orcid, icon: 'fab fa-orcid', label: d.orcidLabel || 'ORCID', external: true },
            { href: d.linkedin, icon: 'fab fa-linkedin', label: d.linkedinLabel || 'LinkedIn', external: true },
            { href: d.github, icon: 'fab fa-github', label: d.githubLabel || d.github, external: true }
        ];
        return links.filter(function (link) {
            // A location with no map URL is still worth showing as plain text.
            return link.requires !== undefined ? !!link.requires : !!link.href;
        });
    }

    function renderContacts(d) {
        return contactLinks(d).map(function (link) {
            var body = icon(link.icon) + esc(link.label);
            if (!link.href) return '<span>' + body + '</span>';
            return '<a href="' + esc(link.href) + '"' + externalAttrs(link) + '>' + body + '</a>';
        }).join('');
    }

    function renderCardLinks(d) {
        return contactLinks(d).map(function (link) {
            var body = icon(link.icon) + '<span>' + esc(link.label) + '</span>';
            if (!link.href) return '<div class="linktree-link">' + body + '</div>';
            return '<a class="linktree-link" href="' + esc(link.href) + '"' + externalAttrs(link) + '>' + body + '</a>';
        }).join('');
    }

    function externalAttrs(link) {
        return link.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    }

    /* -- Sections ---------------------------------------------------------- */

    function section(title, body) {
        if (!body) return '';
        return '<section class="section">'
            + '<h2 class="section-title">' + esc(title) + '</h2>'
            + body
            + '</section>';
    }

    function bullets(details) {
        if (!details || !details.length) return '';
        return '<ul>' + details.map(function (item) {
            return '<li>' + esc(item) + '</li>';
        }).join('') + '</ul>';
    }

    /** Education and employment share a shape: title, date, sub-line, bullets. */
    function renderEntries(entries, titleKey, subKey) {
        return entries.map(function (e) {
            return '<div class="entry">'
                + '<div class="entry-header">'
                + '<h3 class="entry-title">' + esc(e[titleKey]) + '</h3>'
                + '<span class="date">' + esc(e.date) + '</span>'
                + '</div>'
                + (e[subKey] ? '<p class="entry-sub">' + esc(e[subKey]) + '</p>' : '')
                + bullets(e.details)
                + '</div>';
        }).join('');
    }

    function renderLines(entries) {
        return entries.map(function (e) {
            return '<div class="entry-line">'
                + '<span>' + esc(e.text) + '</span>'
                + '<span class="date">' + esc(e.date) + '</span>'
                + '</div>';
        }).join('');
    }

    function renderSkills(skills) {
        var labels = [
            ['expert', 'Expert in:'],
            ['proficient', 'Proficient in:'],
            ['experience', 'Experience in:']
        ];
        return labels.filter(function (pair) {
            return skills && skills[pair[0]];
        }).map(function (pair) {
            return '<div class="row"><span class="label">' + pair[1] + '</span>'
                + '<span>' + esc(skills[pair[0]]) + '</span></div>';
        }).join('');
    }

    function nonEmpty(list) {
        return Array.isArray(list) && list.length ? list : null;
    }

    function renderMain(d) {
        var parts = [];

        if (nonEmpty(d.education))    parts.push(section('Education', renderEntries(d.education, 'degree', 'institution')));
        if (nonEmpty(d.employment))   parts.push(section('Employment', renderEntries(d.employment, 'title', 'org')));
        parts.push(section('Skills', renderSkills(d.skills)));
        // openSource and coursework accept author-written HTML on purpose.
        if (d.openSource)             parts.push(section('Open Source', d.openSource));
        if (nonEmpty(d.talks))        parts.push(section('Talks', renderLines(d.talks)));
        if (nonEmpty(d.teaching))     parts.push(section('Teaching', renderLines(d.teaching)));
        if (nonEmpty(d.competitions)) parts.push(section('Competitions', renderLines(d.competitions)));
        if (nonEmpty(d.awards))       parts.push(section('Awards', renderLines(d.awards)));
        if (nonEmpty(d.coursework))   parts.push(section('Relevant Coursework', d.coursework.map(function (p) {
            return '<p>' + p + '</p>';
        }).join('')));

        return parts.join('');
    }

    /* -- Entry point -------------------------------------------------------- */

    /**
     * Render `d` into the CV markup on the page.
     *
     * `options.metadata: false` renders the document only, leaving the page
     * title and link-preview tags alone — what the editor's preview wants, as
     * it is showing a CV inside a page that is not the CV.
     */
    function apply(d, options) {
        var name = d.name || 'Curriculum Vitae';
        var summary = [d.name, d.tagline].filter(Boolean).join(' — ');

        if (!options || options.metadata !== false) {
            document.title = name + ' — Curriculum Vitae';
            var description = document.querySelector('meta[name="description"]');
            if (description) description.setAttribute('content', summary + '. Curriculum vitae.');
            ['og:title', 'twitter:title'].forEach(function (prop) {
                var tag = document.querySelector('meta[property="' + prop + '"], meta[name="' + prop + '"]');
                if (tag) tag.setAttribute('content', summary);
            });
        }

        setImage(document.getElementById('cv-photo'), d.profilePhoto, name);
        setImage(document.getElementById('card-photo'), d.profilePhoto, name);
        setImage(document.getElementById('cv-signature'), d.signaturePhoto, 'Signature of ' + name);
        setImage(document.getElementById('card-signature'), d.signaturePhoto, 'Signature of ' + name);

        setText('cv-name', d.name);
        setText('card-name', d.name);
        setText('cv-tagline', d.tagline);
        setText('card-tagline', d.tagline);

        setHtml('cv-contacts', renderContacts(d));
        setHtml('card-links', renderCardLinks(d));
        setHtml('cv-main', renderMain(d));
    }

    global.CVRender = { apply: apply };
})(window);
