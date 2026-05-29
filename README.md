# Digital CV — LaTeX-Style HTML Template

A single-file, dependency-free HTML curriculum vitae inspired by the clean,
academic look of LaTeX CVs. Designed to be **forked, edited, and hosted on
GitHub Pages** in a few minutes.

> Preview: [`index.html`](./index.html) — open it directly in a browser.

---

## Features

- **No-code editor at `/admin`.** Edit every field — personal info, photo, experience, skills, etc. — through a form. No HTML editing required. Changes save to your browser and apply instantly to your CV. Works on any fork automatically (each fork's GitHub Pages domain has its own private storage).
- **LaTeX-inspired typography.** EB Garamond serif, small-caps section headers, thin horizontal rules — sober and print-ready.
- **Two views in one page.**
  - *Full CV* — the long-form document.
  - *Card view* — a Linktree-style page for quick sharing.
- **A4-optimised PDF export.** One click renders the CV to a clean A4 PDF (the standard format in Morocco and Europe) with proper margins and no sections split across pages.
- **QR code.** Auto-generated from the current page URL, ideal for printed copies or business cards.
- **Signature & photo.** Optional, easy to remove.
- **Responsive.** Reads well on phones; collapses gracefully.
- **Print-friendly.** A `@media print` block hides toolbar buttons and tightens layout.
- **No build step, no JS framework.** Just static files.

---

## Quick start

### 1. Fork & clone

```bash
git clone https://github.com/<your-handle>/cv.git
cd cv
```

### 2. Preview locally

Open `index.html` in a browser, or serve it (recommended, for the PDF/QR features):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### 3. Edit your content — the easy way (recommended)

After deploying (step 4), open the built-in editor in your browser:

```
https://<your-handle>.github.io/cv/admin/
```

Or locally: visit `http://localhost:8000/admin/`. Fill in the form, upload a
photo, add/remove/reorder entries, then click **Save Changes**. Your CV updates
immediately.

- Data is stored in your browser's `localStorage` — **private to you and your
  device**. Nothing is uploaded to a server, so it works on any fork with zero
  configuration.
- To share the same content across devices, edit the `DEFAULT_DATA` object near
  the top of the `<script>` block in `index.html` (and `admin/index.html`) and
  commit it. **Reset to Defaults** in the editor reverts to those values.

### 4. Deploy on GitHub Pages

1. Push your fork.
2. Go to **Settings → Pages**.
3. Source: *Deploy from a branch*, branch: `master` (or `main`), folder: `/ (root)`.
4. Your CV will be live at `https://<your-handle>.github.io/cv/`, and the editor
   at `https://<your-handle>.github.io/cv/admin/`.

---

## Customization

### Colors & sizing

All theme variables are at the top of the `<style>` block in `index.html`:

```css
:root {
    --paper: #ffffff;     /* page background */
    --ink:   #1a1a1a;     /* primary text */
    --muted: #555555;     /* dates, sub-headings */
    --rule:  #cccccc;     /* horizontal rules */
    --link:  #1a1a1a;     /* link color */
    --max-width: 800px;   /* content width */
}
```

Rebrand by editing only these values.

### Fonts

The template uses **EB Garamond** from Google Fonts. To switch, replace the
`<link href="https://fonts.googleapis.com/...">` and the `font-family` in
`html, body`. Good LaTeX-ish alternatives: *Cormorant Garamond*, *Latin Modern Roman*, *Crimson Pro*, *Charter*, *Source Serif Pro*.

### Add or remove sections

Each section follows the same pattern:

```html
<section class="section">
    <h3>Section Title</h3>
    <div class="entry">
        <div class="entry-header">
            <h4>Role / Degree</h4>
            <span class="date">Start – End</span>
        </div>
        <p class="entry-sub">Organisation, Location</p>
        <ul>
            <li>Bullet describing impact.</li>
        </ul>
    </div>
</section>
```

For dense list-style sections (talks, awards, competitions), use a single
`.entry-header` line with text on the left and a `.date` on the right.

### Profile photo / signature

Both are optional. Delete the `<img class="profile-pic">` tag for a pure-text
CV, or replace the `src` with a path to your own image. Same for `signature.png`.

### QR code

It is generated automatically from `window.location.href` — no configuration
needed. To hard-code a URL, edit the `qrUrl` variable in the `<script>` block.

---

## File reference

| File                       | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `index.html`               | The CV (full view + card view, styles and scripts inlined).   |
| `admin/index.html`         | No-code editor for all CV fields (saves to browser storage).  |
| `index-no-card.html`       | Earlier variant without the card view (kept for reference).   |
| `roman_ring_cv.tex` / `.pdf` | The LaTeX CV that inspired the typography.                  |
| `img.jpg`                  | Profile photo — replace with your own.                        |
| `signature.png` / `.svg`   | Optional signature image — replace or remove.                 |
| `favicon.*`, `*-touch-icon.png`, `site.webmanifest` | Favicon + PWA manifest assets.       |
| `old/`, `walid/`           | Drafts and earlier iterations.                                |

---

## Acknowledgements & inspiration

- Layout inspired by [`sharu725/online-cv`](https://github.com/sharu725/online-cv) and the LaTeX `res` document class.
- Typography references: Roman Ring's [LaTeX CV](http://rush-nlp.com/cv/cv.comp.pdf), Vy Tan's [short CV](https://vyftan.github.io/papers/short_cv.pdf), David Malan's [page](https://cs.harvard.edu/malan/).
- Libraries: [`html2pdf.js`](https://github.com/eKoopmans/html2pdf.js), [`qrcode`](https://github.com/soldair/node-qrcode), [Font Awesome](https://fontawesome.com/), [Google Fonts](https://fonts.google.com/).

---

## License

MIT — fork it, edit it, ship it. Attribution appreciated but not required.
