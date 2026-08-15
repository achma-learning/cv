/* ============================================================================
   CV EDITOR

   Edits are kept in this browser's localStorage, so a fork works with no
   server and no build step. "Export cv-data.js" turns them back into the
   committed file that everyone else sees.
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

    function readForm() {
        var data = {};
        TEXT_FIELDS.forEach(function (key) { data[key] = $('f-' + key).value.trim(); });

        data.profilePhoto = images.profilePhoto;
        data.signaturePhoto = images.signaturePhoto;

        data.skills = {
            expert: $('f-skills-expert').value.trim(),
            proficient: $('f-skills-proficient').value.trim(),
            experience: $('f-skills-experience').value.trim()
        };

        data.openSource = $('f-openSource').value.trim();
        data.coursework = [$('f-coursework-1').value.trim(), $('f-coursework-2').value.trim()].filter(Boolean);

        Object.keys(LISTS).forEach(function (type) { data[type] = readList(type); });
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
        showStatus('Saved. Open the CV to see it.');
    }

    function reset() {
        if (!confirm('Discard your local edits and go back to the published CV content?')) return;
        CVStore.clear();
        fillForm(CVStore.defaults());
        dirty = false;
        showStatus('Reset to the published content.');
    }

    function exportFile() {
        var blob = new Blob([CVStore.serialize(readForm())], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        var link = el('a', { href: url, download: 'cv-data.js' });
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showStatus('Exported. Replace assets/cv-data.js with it, then commit.');
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

    $('saveBtn').addEventListener('click', save);
    $('saveBtn2').addEventListener('click', save);
    $('resetBtn').addEventListener('click', reset);
    $('resetBtn2').addEventListener('click', reset);
    $('exportBtn').addEventListener('click', exportFile);
    $('importBtn').addEventListener('click', function () { $('importInput').click(); });
    $('importInput').addEventListener('change', function () {
        if (this.files && this.files[0]) importFile(this.files[0]);
        this.value = '';
    });

    document.addEventListener('input', markDirty);

    window.addEventListener('beforeunload', function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = '';
    });

    // Ctrl/Cmd+S is the reflex for a form this long.
    document.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            save();
        }
    });
})();
