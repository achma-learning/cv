/* ============================================================================
   CV PAGE — view switching, QR code and PDF export.

   Every enhancement here is optional: if a CDN is blocked or fails, the CV
   itself still renders and the page stays usable.
   ========================================================================== */
(function () {
    'use strict';

    var cvView = document.getElementById('cv-view');
    var cardView = document.getElementById('card-view');
    var toggleBtn = document.getElementById('toggle-view');
    var downloadBtn = document.getElementById('downloadBtn');
    var adminLink = document.getElementById('adminBtn');

    /* -- Render ------------------------------------------------------------ */
    CVRender.apply(CVStore.load());

    /* -- Editor link -------------------------------------------------------
       The editor only changes the copy of the CV stored in *this* browser, so
       it is noise for anyone else reading the CV. Show it when you are working
       locally, when you already have local edits, or on request via ?edit. */
    if (adminLink) {
        var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
        var wantsEditor = /(^|[?&])edit(=|&|$)/.test(location.search);
        adminLink.hidden = !(isLocal || wantsEditor || CVStore.hasOverride());
    }

    /* -- View switching ----------------------------------------------------
       The card view is addressable as #card so it can be shared or bookmarked. */
    function showView(view) {
        var card = view === 'card';
        cardView.hidden = !card;
        cvView.hidden = card;
        toggleBtn.textContent = card ? 'View Full CV' : 'View as Card';
        toggleBtn.setAttribute('aria-pressed', String(card));
        downloadBtn.hidden = card;
    }

    function viewFromHash() {
        return location.hash === '#card' ? 'card' : 'cv';
    }

    showView(viewFromHash());
    window.addEventListener('hashchange', function () { showView(viewFromHash()); });

    toggleBtn.addEventListener('click', function () {
        var next = viewFromHash() === 'card' ? 'cv' : 'card';
        try {
            // Replace rather than push so the back button leaves the CV entirely.
            history.replaceState(null, '', next === 'card' ? '#card' : location.pathname + location.search);
        } catch (e) {
            // Some browsers refuse history writes on file:// — the view still switches.
        }
        showView(next);
    });

    /* -- QR code -----------------------------------------------------------
       Encodes the canonical page URL, so the full CV and the card share one
       code. Silently skipped if the library did not load. */
    (function renderQr() {
        var targets = ['qrcode-cv', 'qrcode-card'].map(function (id) {
            return document.getElementById(id);
        }).filter(Boolean);
        if (!targets.length) return;

        if (typeof QRCode === 'undefined' || !QRCode.toDataURL) return;

        var url = location.href.split('#')[0];
        QRCode.toDataURL(url, { errorCorrectionLevel: 'H', margin: 1 }, function (err, dataUrl) {
            if (err || !dataUrl) return;
            targets.forEach(function (target) {
                var img = document.createElement('img');
                img.src = dataUrl;
                img.alt = 'QR code linking to ' + url;
                target.appendChild(img);
            });
        });
    })();

    /* -- PDF export --------------------------------------------------------- */

    /** Resolve once every image inside `element` has settled, so none render blank. */
    function imagesReady(element) {
        var pending = Array.prototype.slice.call(element.querySelectorAll('img'))
            .filter(function (img) { return !(img.complete && img.naturalHeight !== 0); })
            .map(function (img) {
                return new Promise(function (resolve) {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                });
            });
        return Promise.all(pending);
    }

    /** Web fonts must be in place before the canvas snapshot, or metrics shift. */
    function fontsReady() {
        return document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    }

    function pdfFilename(name) {
        var safe = String(name || 'CV').replace(/[\\/:*?"<>|]+/g, '').trim();
        return (safe || 'CV') + ' - CV.pdf';
    }

    downloadBtn.addEventListener('click', function () {
        // No library (offline, blocked CDN)? The browser's own print dialogue
        // produces a good A4 PDF from the print stylesheet.
        if (typeof html2pdf === 'undefined') {
            window.print();
            return;
        }

        var label = downloadBtn.textContent;
        downloadBtn.textContent = 'Preparing…';
        downloadBtn.disabled = true;

        Promise.all([imagesReady(cvView), fontsReady()])
            .then(function () {
                return html2pdf().from(cvView).set({
                    // A4 is 210 × 297 mm; 14 mm keeps content clear of the
                    // non-printable edge on common A4 printers.
                    margin: [14, 14, 14, 14],
                    filename: pdfFilename(document.getElementById('cv-name').textContent.trim()),
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    // Avoid splitting individual entries. Whole sections are
                    // deliberately allowed to flow across pages — pinning them
                    // leaves large gaps on a long CV.
                    pagebreak: { mode: ['css', 'legacy'], avoid: ['.entry', '.entry-line', '.row', '.footer'] }
                }).save();
            })
            .catch(function () {
                window.print();
            })
            .then(function () {
                downloadBtn.textContent = label;
                downloadBtn.disabled = false;
            });
    });
})();
