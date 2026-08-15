# Digital CV — LaTeX-Style HTML Template

A dependency-free HTML curriculum vitae with the sober, academic look of a LaTeX
CV. No build step, no framework — fork it, edit one data file, and host it on
GitHub Pages.

> Preview: run a local server (below) and open `index.html`.

---

## Features

- **One data file.** All content lives in [`assets/cv-data.js`](assets/cv-data.js).
  Edit it, commit, done — that is what visitors see.
- **Optional no-code editor at `/admin`.** Fill in a form, draw a signature,
  reorder entries. Edits are saved to your browser, and **Export `cv-data.js`**
  turns them back into the committed file so they go live for everyone.
- **LaTeX-inspired typography.** EB Garamond, small-caps section rules, restrained
  black-and-grey palette.
- **Two views in one page.** The full CV, and a Linktree-style card at `#card`
  that you can link to directly.
- **A4 PDF export.** One click renders a clean A4 PDF with sensible page breaks.
  If the PDF library is unavailable it falls back to the browser's own print
  dialogue, which uses the same print stylesheet.
- **QR code**, generated from the page URL — handy on a printed CV or business card.
- **Degrades gracefully.** If the CDNs are blocked, the CV still renders and stays
  usable; only the QR code and one-click PDF drop out.
- **Responsive and print-friendly**, with proper heading structure and
  screen-reader-friendly icons.

---

## Quick start

### 1. Fork and clone

```bash
git clone https://github.com/<your-handle>/cv.git
cd cv
```

### 2. Preview locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

A local server is recommended over opening the file directly — some browsers
restrict scripts loaded from `file://`.

### 3. Add your content

**Option A — edit the data file (recommended).** Open
[`assets/cv-data.js`](assets/cv-data.js), replace the placeholder values, and
commit. Every field is documented inline; empty fields (`""` or `[]`) are simply
not rendered.

**Option B — use the editor.** Visit `http://localhost:8000/admin/`, fill in the
form, then **Save Changes**.

> Saved changes live in *your browser's* `localStorage` — nobody else sees them.
> To publish them, click **Export cv-data.js** and replace `assets/cv-data.js`
> with the downloaded file, then commit. **Import a file…** loads an exported
> file back into the form, which is how you move edits between devices.

### 4. Deploy on GitHub Pages

1. Push your fork.
2. **Settings → Pages → Deploy from a branch**, branch `master` (or `main`), folder `/ (root)`.
3. Your CV is live at `https://<your-handle>.github.io/cv/`.

The **Edit CV** button is hidden from ordinary visitors. It appears when you are
on `localhost`, when you already have local edits, or if you add `?edit` to the
URL — so recruiters see a CV, not a CMS.

---

## Project layout

| Path                    | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `index.html`            | The CV page — markup only.                                       |
| `assets/cv-data.js`     | **Your CV content.** The single source of truth.                |
| `assets/cv.css`         | All styling, including the print/A4 rules. Shared with `/admin`. |
| `assets/cv-store.js`    | Loads content, applies the local override, escaping helpers.     |
| `assets/cv-render.js`   | Turns the data into the CV document.                             |
| `assets/cv-page.js`     | View switching, QR code, PDF export.                             |
| `admin/`                | The optional editor (`index.html`, `admin.css`, `admin.js`).     |
| `img.jpg`               | Profile photo — replace with your own.                           |
| `signature.png`/`.svg`  | Optional signature image.                                        |
| `favicon.*`, `site.webmanifest` | Favicon and PWA manifest assets.                         |
| `walid/`                | A separate CV page kept at its own URL.                          |

---

## Customization

### Colours and sizing

Every theme value is a custom property at the top of `assets/cv.css`:

```css
:root {
    --paper: #ffffff;     /* page background */
    --ink:   #1a1a1a;     /* primary text */
    --muted: #555555;     /* dates, sub-headings */
    --rule:  #cccccc;     /* horizontal rules */
    --max-width: 800px;   /* content width */
}
```

### Fonts

Swap the Google Fonts `<link>` in `index.html` and the `font-family` in
`assets/cv.css`. Good LaTeX-ish alternatives: *Cormorant Garamond*, *Crimson Pro*,
*Charter*, *Source Serif*.

### Sections

The section list and their order live in `renderMain()` in
`assets/cv-render.js`. A section disappears automatically when its data is empty,
so the quickest way to drop one is to empty it in `assets/cv-data.js`.

`openSource` and the `coursework` paragraphs accept HTML (`<p>`, `<a>`, `<em>`)
so you can link to projects; every other field is escaped.

### Photo, signature and QR code

The photo and signature are optional — set `profilePhoto` or `signaturePhoto` to
`""` to hide them. The QR code is generated from the page URL, with no
configuration.

---

## Acknowledgements

- Layout inspired by [`sharu725/online-cv`](https://github.com/sharu725/online-cv)
  and the LaTeX `res` document class.
- Typography references: Roman Ring's [LaTeX CV](http://rush-nlp.com/cv/cv.comp.pdf),
  Vy Tan's [short CV](https://vyftan.github.io/papers/short_cv.pdf),
  David Malan's [page](https://cs.harvard.edu/malan/).
- Libraries: [`html2pdf.js`](https://github.com/eKoopmans/html2pdf.js),
  [`qrcode`](https://github.com/soldair/node-qrcode),
  [Font Awesome](https://fontawesome.com/), [Google Fonts](https://fonts.google.com/).

## License

MIT — fork it, edit it, ship it.
