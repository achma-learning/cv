/* ============================================================================
   CV EDITOR

   Two ways to keep your work, and the difference matters:

       Save Draft → this browser only. Nobody else can see it.
       Publish    → a commit to assets/cv-data.js in the repository serving
                    this CV, which is what everybody sees.

   Publishing is available to one person: the GitHub account that owns that
   repository. The check is made by GitHub, twice — once to describe the
   repository, and again when the commit is offered — so nothing in this file
   decides who may publish. See assets/cv-auth.js.
   ========================================================================== */
(function () {
    'use strict';

    /* -- Schema ------------------------------------------------------------
       One description of every repeatable section drives both the form
       building and the form reading. */
    var LISTS = {
        education: {
            singular: 'Education entry',
            fields: [
                { key: 'degree', label: 'Degree / Title' },
                { key: 'date', label: 'Date' },
                { key: 'institution', label: 'Institution' }
            ],
            details: true
        },
        employment: {
            singular: 'Employment entry',
            fields: [
                { key: 'title', label: 'Job Title' },
                { key: 'date', label: 'Date' },
                { key: 'org', label: 'Organisation' }
            ],
            details: true
        },
        talks: { singular: 'Talk', fields: simpleFields(), details: false },
        teaching: { singular: 'Teaching entry', fields: simpleFields(), details: false },
        competitions: { singular: 'Competition', fields: simpleFields(), details: false },
        awards: { singular: 'Award', fields: simpleFields(), details: false }
    };

    function simpleFields() {
        return [
            { key: 'text', label: 'Description' },
            { key: 'date', label: 'Date' }
        ];
    }

    var TEXT_FIELDS = [
        'name', 'tagline', 'email', 'phone', 'location', 'locationUrl',
        'website', 'websiteLabel', 'github', 'githubLabel',
        'linkedin', 'linkedinLabel', 'scholar', 'scholarLabel', 'orcid', 'orcidLabel'
    ];

    // Uploaded images are downscaled before storage: localStorage tops out
    // around 5 MB, and a phone photo alone can exceed that.
    var PHOTO_MAX_PX = 600;
    var SIGNATURE_MAX_PX = 1000;

    /* -- Element helpers ---------------------------------------------------- */

    var uid = 0;
    function $(id) { return document.getElementById(id); }

    function el(tag, props, children) {
        var node = document.createElement(tag);
        Object.keys(props || {}).forEach(function (key) {
            // `dataset` is read-only; its entries have to be copied across.
            if (key === 'dataset') {
                Object.assign(node.dataset, props.dataset);
            } else {
                node[key] = props[key];
            }
        });
        (children || []).forEach(function (child) { node.appendChild(child); });
        return node;
    }

    function formGroup(labelText, control) {
        control.id = 'gen-' + (++uid);
        return el('div', { className: 'form-group' }, [
            el('label', { htmlFor: control.id, textContent: labelText }),
            control
        ]);
    }

    /* -- State -------------------------------------------------------------- */

    var images = { profilePhoto: '', signaturePhoto: '' };
    var dirty = false;

    function markDirty() { dirty = true; }

    function showStatus(message, tone) {
        var box = $('status');
        box.textContent = message;
        box.dataset.tone = tone || 'ok';
        box.hidden = false;
        clearTimeout(showStatus.timer);
        showStatus.timer = setTimeout(function () { box.hidden = true; }, 4000);
    }

    /* -- Images -------------------------------------------------------------- */

    function isDataUrl(value) { return /^data:/i.test(String(value || '')); }

    function applyImage(kind, value) {
        images[kind] = String(value || '').trim();

        if (kind === 'profilePhoto') {
            var photo = $('photo-preview');
            photo.src = CVStore.asset(images.profilePhoto);
            photo.hidden = !images.profilePhoto;
        } else {
            var sig = $('sig-preview');
            sig.src = CVStore.asset(images.signaturePhoto);
            $('sig-result').hidden = !images.signaturePhoto;
        }
    }

    /**
     * Read an image file as a data URL, shrinking it when it is larger than
     * the CV will ever display. Small files pass through untouched so PNG
     * transparency and SVG sources survive.
     */
    function readImageFile(file, maxPx, mime) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onerror = function () { reject(new Error('That file could not be read.')); };
            reader.onload = function () {
                var source = reader.result;
                var img = new Image();
                img.onerror = function () { reject(new Error('That file is not a readable image.')); };
                img.onload = function () {
                    var longest = Math.max(img.naturalWidth, img.naturalHeight);
                    var scale = longest > maxPx ? maxPx / longest : 1;
                    if (scale === 1 && source.length < 300000) return resolve(source);

                    var canvas = el('canvas', {
                        width: Math.max(1, Math.round(img.naturalWidth * scale)),
                        height: Math.max(1, Math.round(img.naturalHeight * scale))
                    });
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL(mime, 0.85));
                };
                img.src = source;
            };
            reader.readAsDataURL(file);
        });
    }

    function wireImageUpload(inputId, kind, maxPx, mime, urlInputId) {
        $(inputId).addEventListener('change', function () {
            var file = this.files && this.files[0];
            if (!file) return;
            readImageFile(file, maxPx, mime).then(function (dataUrl) {
                applyImage(kind, dataUrl);
                $(urlInputId).value = ''; // an upload replaces any linked URL
                markDirty();
            }).catch(function (error) {
                showStatus(error.message, 'error');
            });
        });
    }

    // `change` rather than `input`: previewing halfway through a typed URL
    // fires off requests for nonsense addresses.
    function wireImageUrl(urlInputId, kind, fileInputId) {
        $(urlInputId).addEventListener('change', function () {
            applyImage(kind, this.value.trim());
            $(fileInputId).value = '';
            markDirty();
        });
    }

    function wireImageRemove(buttonId, kind, urlInputId, fileInputId, after) {
        $(buttonId).addEventListener('click', function () {
            applyImage(kind, '');
            $(urlInputId).value = '';
            $(fileInputId).value = '';
            if (after) after();
            markDirty();
        });
    }

    /* -- Repeatable entry cards ---------------------------------------------- */

    function renumber(type) {
        var cards = $(type + '-list').querySelectorAll('.entry-card');
        Array.prototype.forEach.call(cards, function (card, index) {
            card.querySelector('.entry-card-title').textContent =
                LISTS[type].singular + ' ' + (index + 1);
        });
    }

    function makeCard(type, entry) {
        var schema = LISTS[type];
        var card = el('div', { className: 'entry-card' });

        var actions = el('div', { className: 'entry-card-actions' }, [
            el('button', { type: 'button', className: 'btn btn-quiet', textContent: '↑', title: 'Move up', dataset: { move: 'up' } }),
            el('button', { type: 'button', className: 'btn btn-quiet', textContent: '↓', title: 'Move down', dataset: { move: 'down' } }),
            el('button', { type: 'button', className: 'btn btn-danger', textContent: 'Remove', dataset: { remove: '' } })
        ]);
        card.appendChild(el('div', { className: 'entry-card-handle' }, [
            el('span', { className: 'entry-card-title' }),
            actions
        ]));

        // The first two fields share a row; anything after gets its own.
        var pair = el('div', { className: 'form-pair form-pair-wide' });
        schema.fields.forEach(function (field, index) {
            var input = el('input', { type: 'text', className: 'e-' + field.key, value: entry[field.key] || '' });
            var group = formGroup(field.label, input);
            (index < 2 ? pair : card).appendChild(group);
            if (index === 1) card.appendChild(pair);
        });

        if (schema.details) {
            var textarea = el('textarea', {
                className: 'e-details',
                rows: 3,
                value: (entry.details || []).join('\n')
            });
            card.appendChild(formGroup('Details — one bullet point per line', textarea));
        }

        return card;
    }

    function addCard(type, entry) {
        $(type + '-list').appendChild(makeCard(type, entry || {}));
        renumber(type);
    }

    function wireListActions(type) {
        var list = $(type + '-list');
        list.addEventListener('click', function (event) {
            var button = event.target.closest('button');
            if (!button || !list.contains(button)) return;
            var card = button.closest('.entry-card');
            if (!card) return;

            if ('remove' in button.dataset) {
                card.remove();
            } else if (button.dataset.move === 'up') {
                var previous = card.previousElementSibling;
                if (previous) list.insertBefore(card, previous);
            } else if (button.dataset.move === 'down') {
                var next = card.nextElementSibling;
                if (next) list.insertBefore(next, card);
            } else {
                return;
            }
            renumber(type);
            markDirty();
        });
    }

    function readList(type) {
        var schema = LISTS[type];
        var cards = $(type + '-list').querySelectorAll('.entry-card');
        return Array.prototype.map.call(cards, function (card) {
            var entry = {};
            schema.fields.forEach(function (field) {
                entry[field.key] = card.querySelector('.e-' + field.key).value.trim();
            });
            if (schema.details) {
                entry.details = card.querySelector('.e-details').value
                    .split('\n')
                    .map(function (line) { return line.trim(); })
                    .filter(Boolean);
            }
            return entry;
        }).filter(function (entry) {
            // Drop rows the user added but never filled in.
            return schema.fields.some(function (field) { return entry[field.key]; });
        });
    }

    /* -- Form <-> data -------------------------------------------------------- */

    function fillForm(data) {
        TEXT_FIELDS.forEach(function (key) { $('f-' + key).value = data[key] || ''; });

        var skills = data.skills || {};
        $('f-skills-expert').value = skills.expert || '';
        $('f-skills-proficient').value = skills.proficient || '';
        $('f-skills-experience').value = skills.experience || '';

        $('f-openSource').value = data.openSource || '';
        $('f-coursework-1').value = (data.coursework && data.coursework[0]) || '';
        $('f-coursework-2').value = (data.coursework && data.coursework[1]) || '';

        applyImage('profilePhoto', data.profilePhoto);
        applyImage('signaturePhoto', data.signaturePhoto);
        $('f-photoUrl').value = isDataUrl(data.profilePhoto) ? '' : (data.profilePhoto || '');
        $('f-signatureUrl').value = isDataUrl(data.signaturePhoto) ? '' : (data.signaturePhoto || '');

        Object.keys(LISTS).forEach(function (type) {
            $(type + '-list').innerHTML = '';
            (data[type] || []).forEach(function (entry) { addCard(type, entry); });
        });
    }

    // Built in the order assets/cv-data.js already uses — which is also the
    // order the sections appear in — so a published file stays readable and its
    // diffs stay small.
    function readForm() {
        var data = {};
        TEXT_FIELDS.forEach(function (key) { data[key] = $('f-' + key).value.trim(); });

        data.profilePhoto = images.profilePhoto;
        data.signaturePhoto = images.signaturePhoto;

        data.education = readList('education');
        data.employment = readList('employment');

        data.skills = {
            expert: $('f-skills-expert').value.trim(),
            proficient: $('f-skills-proficient').value.trim(),
            experience: $('f-skills-experience').value.trim()
        };

        data.openSource = $('f-openSource').value.trim();

        data.talks = readList('talks');
        data.teaching = readList('teaching');
        data.competitions = readList('competitions');
        data.awards = readList('awards');

        data.coursework = [$('f-coursework-1').value.trim(), $('f-coursework-2').value.trim()].filter(Boolean);
        return data;
    }

    /* -- Actions --------------------------------------------------------------- */

    function save() {
        try {
            CVStore.save(readForm());
        } catch (e) {
            showStatus('Could not save — this browser\'s storage is full. Try a smaller '
                + 'image, or link to one by URL instead.', 'error');
            return;
        }
        dirty = false;
        showStatus('Draft saved in this browser. Publish to put it on your live CV.');
    }

    function reset() {
        if (!confirm('Discard this draft and go back to your published CV?')) return;
        CVStore.clear();
        fillForm(CVStore.defaults());
        dirty = false;
        ghNote('');
        showStatus('Draft discarded.');
    }

    function exportFile() {
        var blob = new Blob([CVStore.serialize(readForm())], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        var link = el('a', { href: url, download: 'cv-data.js' });
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showStatus('Downloaded a copy of your CV.');
    }

    function importFile(file) {
        var reader = new FileReader();
        reader.onerror = function () { showStatus('That file could not be read.', 'error'); };
        reader.onload = function () {
            var parsed;
            try {
                parsed = CVStore.deserialize(reader.result);
            } catch (e) {
                showStatus('Could not read that file: ' + e.message, 'error');
                return;
            }
            fillForm(Object.assign(CVStore.defaults(), parsed));
            markDirty();
            showStatus('Imported. Review the fields, then Save.');
        };
        reader.readAsText(file);
    }

    /* -- Signature pad ----------------------------------------------------------- */

    function wireSignaturePad() {
        var canvas = $('sig-canvas');
        var ctx = canvas.getContext('2d');
        var drawing = false;
        var lastX = 0;
        var lastY = 0;
        var used = false;

        function point(event) {
            var rect = canvas.getBoundingClientRect();
            var source = event.touches ? event.touches[0] : event;
            return [
                (source.clientX - rect.left) * (canvas.width / rect.width),
                (source.clientY - rect.top) * (canvas.height / rect.height)
            ];
        }

        function start(event) {
            event.preventDefault();
            drawing = true;
            var p = point(event);
            lastX = p[0];
            lastY = p[1];
        }

        function move(event) {
            if (!drawing) return;
            event.preventDefault();
            var p = point(event);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(p[0], p[1]);
            ctx.lineWidth = event.shiftKey ? 2 : 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#1a1a1a';
            ctx.stroke();
            lastX = p[0];
            lastY = p[1];
            used = true;
        }

        function stop() { drawing = false; }

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', stop);

        function clearPad() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            used = false;
        }

        $('sig-clear-btn').addEventListener('click', clearPad);

        $('sig-use-btn').addEventListener('click', function () {
            if (!used) {
                showStatus('Draw a signature first.', 'error');
                return;
            }
            applyImage('signaturePhoto', canvas.toDataURL('image/png'));
            $('f-signatureUrl').value = '';
            $('f-signature').value = '';
            markDirty();
            showStatus('Signature captured. Remember to Save.');
        });

        wireImageRemove('sig-remove-btn', 'signaturePhoto', 'f-signatureUrl', 'f-signature', clearPad);
    }

    function wireSignatureTabs() {
        var tabs = Array.prototype.slice.call(document.querySelectorAll('.sig-tab'));
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (other) {
                    var selected = other === tab;
                    other.setAttribute('aria-selected', String(selected));
                    $('sig-panel-' + other.dataset.tab).hidden = !selected;
                });
            });
        });
    }

    /* -- Preview -------------------------------------------------------------------
       The public CV's own renderer, stylesheet and markup, so what you see here
       is the CV rather than a second opinion of it. `metadata: false` keeps it
       from renaming the browser tab on its way past. */

    function openPreview() {
        CVRender.apply(readForm(), { metadata: false });
        $('preview').hidden = false;
        $('preview').querySelector('.preview-scroll').scrollTop = 0;
        document.body.style.overflow = 'hidden';
    }

    function closePreview() {
        $('preview').hidden = true;
        document.body.style.overflow = '';
    }

    /* -- Publishing to GitHub --------------------------------------------------- */

    var esc = CVStore.escape;

    var VIEWS = ['gh-busy', 'gh-anon', 'gh-form', 'gh-device', 'gh-account', 'gh-choose'];

    var gh = {
        session: null,
        published: null,   // { sha, text } as GitHub had it when we last looked
        busy: false,
        attempt: 0         // guards against a cancelled sign-in resolving late
    };

    function ghView(ids) {
        VIEWS.forEach(function (id) { $(id).hidden = ids.indexOf(id) === -1; });
    }

    /** A notice that stays put, unlike the toast — these need acting on. */
    function ghNote(html, tone) {
        var box = $('gh-note');
        box.innerHTML = html || '';
        box.dataset.tone = tone || 'info';
        box.hidden = !html;
    }

    function ghBusy(on, message) {
        gh.busy = on;
        document.querySelectorAll('[data-action="publish"]').forEach(function (button) {
            button.disabled = on;
            button.textContent = on ? (message || 'Working…') : 'Publish';
        });
    }

    function ghFailed(error) {
        // A token that has expired or been revoked is worse than useless: drop
        // it, so the next visit offers a clean sign-in rather than the error.
        if (error && error.code === 'unauthorized') {
            CVAuth.signOut();
            gh.session = null;
            gh.published = null;
            renderSession();
        }
        ghNote(esc((error && error.message) || 'Something went wrong.'), 'error');
    }

    /** Why this account cannot publish here, in terms that suggest a fix. */
    function deniedMessage(session) {
        var repo = session.repository;
        if (!session.isOwner) {
            return 'This CV is published from <strong>' + esc(repo.fullName) + '</strong>, which belongs to '
                + '<strong>@' + esc(repo.owner) + '</strong>. You are signed in as <strong>@'
                + esc(session.user.login) + '</strong>, so you can read it and try things out here, '
                + 'but not publish.'
                + (repo.ownerType === 'Organization'
                    ? ' The editor authorises the account that owns the repository.'
                    : ' To have a CV of your own, fork it — your fork will be yours to publish.');
        }
        return 'Your token can read <strong>' + esc(repo.fullName) + '</strong> but not write to it. '
            + 'Create a token with <em>Contents: Read and write</em> for this repository, then sign in again.';
    }

    function renderSession() {
        var session = gh.session;

        if (!session) {
            var oauth = CVAuth.oauth.available();
            $('gh-oauth-btn').hidden = !oauth;
            // With a proper sign-in button available, the token becomes the
            // fallback rather than the headline.
            $('gh-token-btn').textContent = oauth ? 'Use a token instead' : 'Sign in with GitHub';
            $('gh-token-btn').className = oauth ? 'btn btn-quiet' : 'btn btn-primary';
            ghView(['gh-anon']);
            return;
        }

        $('gh-identity').innerHTML = 'Signed in as <strong>@' + esc(session.user.login) + '</strong>.';

        if (!session.repository) {
            $('gh-target').textContent = 'Which repository this CV belongs to is not obvious from its '
                + 'address, so please confirm it below.';
            renderChoices(false);
            ghView(['gh-account', 'gh-choose']);
            return;
        }

        if (session.mayPublish) {
            $('gh-target').innerHTML = 'Publishing to <strong>' + esc(session.repository.fullName)
                + '</strong>'
                + (session.siteUrl
                    ? ', live at <a href="' + esc(session.siteUrl) + '" target="_blank" rel="noopener noreferrer">'
                        + esc(session.siteUrl) + '</a>.'
                    : '.');
        } else {
            $('gh-target').innerHTML = deniedMessage(session);
        }

        ghView(['gh-account']);
    }

    function renderChoices(cancellable) {
        var select = $('gh-choice');
        select.innerHTML = '';
        (gh.session ? gh.session.candidates : []).forEach(function (repo) {
            select.appendChild(el('option', { value: repo.full_name, textContent: repo.full_name }));
        });
        select.hidden = !select.options.length;
        $('gh-choose-cancel').hidden = !cancellable;
    }

    /* -- Sign in / out ------------------------------------------------------------ */

    function showTokenForm() {
        ghNote('');
        ghView(['gh-form']);
        $('gh-token').focus();
    }

    function cancelSignIn() {
        gh.attempt++;                 // any sign-in still in flight is now stale
        $('gh-token').value = '';
        ghNote('');
        renderSession();
    }

    function connect() {
        var token = $('gh-token').value.trim();
        if (!token) {
            ghNote('Paste your token first.', 'error');
            return;
        }
        ghNote('Checking with GitHub…');
        adopt(CVAuth.signIn(token, $('gh-remember').checked));
    }

    function startDeviceFlow() {
        var attempt = ++gh.attempt;
        ghNote('');
        ghView(['gh-device']);
        $('gh-device-code').textContent = '…';
        $('gh-device-note').textContent = 'Waiting for you to approve it on GitHub…';

        CVAuth.oauth.start().then(function (device) {
            if (attempt !== gh.attempt) return null;
            $('gh-device-code').textContent = device.user_code;
            $('gh-device-link').href = device.verification_uri;
            return CVAuth.oauth.wait(device);
        }).then(function (token) {
            if (!token || attempt !== gh.attempt) return;
            adopt(CVAuth.signIn(token, true));
        }).catch(function (error) {
            if (attempt !== gh.attempt) return;
            renderSession();
            ghFailed(error);
        });
    }

    /** Take a freshly signed-in session and settle the editor around it. */
    function adopt(signIn) {
        var attempt = ++gh.attempt;

        signIn.then(function (session) {
            if (attempt !== gh.attempt) return null;
            gh.session = session;
            $('gh-token').value = '';
            renderSession();
            return session.repository ? loadPublished() : null;
        }).then(function (published) {
            if (attempt !== gh.attempt || !gh.session) return;
            reportDraftState(published);
        }).catch(function (error) {
            if (attempt !== gh.attempt) return;
            renderSession();
            ghFailed(error);
        });
    }

    function signOut() {
        CVAuth.signOut();
        gh.session = null;
        gh.published = null;
        ghNote('Signed out. Your draft is still here in this browser.');
        renderSession();
    }

    /* -- Choosing the repository -------------------------------------------------- */

    function changeRepo() {
        renderChoices(true);
        $('gh-manual').value = gh.session && gh.session.repository ? gh.session.repository.fullName : '';
        ghView(['gh-account', 'gh-choose']);
    }

    function cancelChoice() {
        ghNote('');
        renderSession();
    }

    function useChoice() {
        var typed = $('gh-manual').value.trim();
        var select = $('gh-choice');
        var ref = CVRepo.parse(typed || (select.options.length ? select.value : ''));
        if (!ref) {
            ghNote('Give a repository as <code>owner/repository</code>.', 'error');
            return;
        }

        var attempt = ++gh.attempt;
        ghNote('Looking that repository up…');

        CVAuth.chooseRepository(ref).then(function (session) {
            if (attempt !== gh.attempt) return null;
            gh.session = session;
            gh.published = null;
            ghNote('');
            renderSession();
            return loadPublished();
        }).then(function (published) {
            if (attempt !== gh.attempt || !gh.session) return;
            reportDraftState(published);
        }).catch(function (error) {
            if (attempt !== gh.attempt) return;
            ghFailed(error.code === 'not_found'
                ? new Error('GitHub has no repository called ' + CVRepo.key(ref) + ' that this token can see.')
                : error);
        });
    }

    /* -- Reading and writing assets/cv-data.js ------------------------------------ */

    /** Read assets/cv-data.js as GitHub has it right now. Null if not there yet. */
    function fetchPublished() {
        var session = gh.session;
        if (!session || !session.repository) return Promise.resolve(null);

        return session.api.getFile(session.repository.owner, session.repository.name,
            session.dataPath, session.branch);
    }

    /**
     * Fetch it and record the version this editing session started from. That
     * recorded version is what makes a concurrent change detectable, so it is
     * updated deliberately here and never as a side effect of publishing.
     */
    function loadPublished() {
        return fetchPublished().then(function (file) {
            gh.published = file;
            return file;
        });
    }

    /** Say so when the draft in this browser is not what the world is seeing. */
    function reportDraftState(published) {
        // Nothing useful to report, and something stale to clear: the sign-in
        // that led here left "Checking with GitHub…" on screen.
        if (!gh.session || !gh.session.mayPublish) {
            ghNote('');
            return;
        }

        if (!published) {
            ghNote('This repository has no <code>' + esc(gh.session.dataPath) + '</code> yet. '
                + 'Publishing will create it.');
            return;
        }

        if (CVStore.serialize(readForm()) === published.text) {
            ghNote('Your CV here matches what is published.');
            return;
        }

        ghNote('You have changes that are not published yet. '
            + '<button type="button" class="btn btn-quiet" data-action="reload">Discard and load the published version</button>');
    }

    /** Replace the editor's contents with what is published on GitHub. */
    function reloadPublished() {
        if (dirty && !confirm('Replace what is in the editor with your published CV?')) return;

        var attempt = ++gh.attempt;
        ghNote('Loading from GitHub…');

        loadPublished().then(function (file) {
            if (attempt !== gh.attempt) return;
            if (!file) {
                ghNote('There is nothing published yet — this will be your first version.');
                return;
            }
            fillForm(Object.assign(CVStore.defaults(), CVStore.deserialize(file.text)));
            CVStore.clear();
            dirty = false;
            ghNote('Loaded the published version.');
            showStatus('Loaded your published CV.');
        }).catch(function (error) {
            if (attempt !== gh.attempt) return;
            ghFailed(error);
        });
    }

    /**
     * Commit the form to assets/cv-data.js.
     *
     * `force` is only ever set by the person clicking through the conflict
     * warning below. Without it, a version of the file newer than the one this
     * editor started from stops the write rather than flattening it.
     */
    function publish(force) {
        var session = gh.session;

        if (!session) {
            // Open the sign-in first: both of those clear the notice area.
            if (CVAuth.oauth.available()) startDeviceFlow(); else showTokenForm();
            ghNote('Sign in with GitHub to publish. Your draft is safe here in the meantime.');
            return;
        }
        if (!session.repository) {
            ghNote('Confirm which repository holds this CV first.', 'error');
            changeRepo();
            return;
        }
        if (!session.mayPublish) {
            ghNote(deniedMessage(session), 'error');
            return;
        }
        if (gh.busy) return;

        var data = readForm();
        var text = CVStore.serialize(data);
        var startedFrom = gh.published;
        var attempt = ++gh.attempt;

        ghBusy(true, 'Publishing…');
        ghNote('Publishing to GitHub…');

        // Ask GitHub for the current version rather than trusting the one this
        // editor loaded, which may be minutes or days old.
        fetchPublished().then(function (latest) {
            // Somebody else has committed since this editor last looked — or the
            // file appeared while we believed there was none. Either way, their
            // version is not ours to discard.
            if (!force && latest && (!startedFrom || latest.sha !== startedFrom.sha)) {
                throw { conflict: true };
            }
            if (latest && latest.text === text) {
                throw { unchanged: true };
            }

            return session.api.putFile({
                owner: session.repository.owner,
                name: session.repository.name,
                path: session.dataPath,
                branch: session.branch,
                message: 'Update CV from web editor',
                text: text,
                sha: latest ? latest.sha : null
            });
        }).then(function (result) {
            if (attempt !== gh.attempt) return;

            gh.published = { sha: result.content.sha, text: text };

            // Keep the draft: it makes the CV page show the new version at once
            // instead of the old one, and it clears itself the moment GitHub
            // Pages catches up.
            try {
                CVStore.save(data);
            } catch (e) { /* the commit is what counts */ }
            dirty = false;

            var commit = (result.commit && result.commit.html_url) || '';
            ghNote('<strong>CV saved successfully.</strong> Your changes have been committed to GitHub. '
                + 'GitHub Pages may take a short time to publish the update.'
                + (commit
                    ? ' <a href="' + esc(commit) + '" target="_blank" rel="noopener noreferrer">View the commit</a>'
                    : ''), 'ok');
            showStatus('Published to GitHub.');
        }).catch(function (error) {
            if (attempt !== gh.attempt) return;

            if (error && error.unchanged) {
                ghNote('Nothing to publish — your CV already matches what is on GitHub.');
                return;
            }
            // Either our own check above, or GitHub refusing a stale version.
            if ((error && error.conflict) || (error && error.code === 'conflict')) {
                ghNote('<strong>The CV changed on GitHub since you opened the editor.</strong> '
                    + 'Please reload the latest version before saving. '
                    + '<button type="button" class="btn btn-quiet" data-action="reload">Load the latest version</button> '
                    + '<button type="button" class="btn btn-quiet" data-action="publish-force">Publish mine anyway</button>',
                    'error');
                return;
            }
            ghFailed(error);
        }).then(function () {
            ghBusy(false);
        });
    }

    /* -- Boot --------------------------------------------------------------------- */

    fillForm(CVStore.load());

    Object.keys(LISTS).forEach(wireListActions);
    document.querySelectorAll('[data-add]').forEach(function (button) {
        button.addEventListener('click', function () {
            addCard(button.dataset.add, {});
            markDirty();
        });
    });

    wireSignatureTabs();
    wireSignaturePad();
    wireImageUpload('f-photo', 'profilePhoto', PHOTO_MAX_PX, 'image/jpeg', 'f-photoUrl');
    wireImageUpload('f-signature', 'signaturePhoto', SIGNATURE_MAX_PX, 'image/png', 'f-signatureUrl');
    wireImageUrl('f-photoUrl', 'profilePhoto', 'f-photo');
    wireImageUrl('f-signatureUrl', 'signaturePhoto', 'f-signature');
    wireImageRemove('photo-remove-btn', 'profilePhoto', 'f-photoUrl', 'f-photo');

    // One table of verbs, so a button can appear in the toolbar, the preview and
    // a notice without being wired up three times.
    var ACTIONS = {
        save: save,
        reset: reset,
        preview: openPreview,
        'close-preview': closePreview,
        publish: function () { publish(false); },
        'publish-force': function () { publish(true); },
        reload: reloadPublished,
        signout: signOut,
        oauth: startDeviceFlow,
        'show-token-form': showTokenForm,
        'cancel-signin': cancelSignIn,
        connect: connect,
        'change-repo': changeRepo,
        'use-repo': useChoice,
        'cancel-choice': cancelChoice
    };

    document.addEventListener('click', function (event) {
        var button = event.target.closest('[data-action]');
        if (!button || button.disabled) return;
        var action = ACTIONS[button.dataset.action];
        if (!action) return;
        event.preventDefault();
        action();
    });

    $('exportBtn').addEventListener('click', exportFile);
    $('importBtn').addEventListener('click', function () { $('importInput').click(); });
    $('importInput').addEventListener('change', function () {
        if (this.files && this.files[0]) importFile(this.files[0]);
        this.value = '';
    });

    $('gh-token').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') connect();
    });

    document.addEventListener('input', function (event) {
        // Typing a token is not editing the CV.
        if (event.target.closest('[data-no-dirty]')) return;
        markDirty();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !$('preview').hidden) {
            closePreview();
            return;
        }
        // Ctrl/Cmd+S is the reflex for a form this long.
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            save();
        }
    });

    window.addEventListener('beforeunload', function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = '';
    });

    // Resume a session left in this browser. Nothing here is trusted: the token
    // is handed to GitHub, and GitHub says who it belongs to and what it may do.
    ghView(['gh-busy']);
    CVAuth.restore().then(function (session) {
        gh.session = session;
        renderSession();
        return session && session.repository ? loadPublished() : null;
    }).then(function (published) {
        if (gh.session) reportDraftState(published);
    }).catch(function (error) {
        renderSession();
        ghFailed(error);
    });
})();
