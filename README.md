# Digital CV — LaTeX-Style HTML Template

A dependency-free HTML curriculum vitae with the sober, academic look of a LaTeX
CV. No build step, no framework — fork it, edit one data file, and host it on
GitHub Pages.

> Preview: run a local server (below) and open `index.html`.

---

## Features

- **One data file.** All content lives in [`assets/cv-data.js`](assets/cv-data.js).
  Edit it, commit, done — that is what visitors see.
- **A browser editor at `/admin` that publishes for you.** Fill in a form, draw a
  signature, reorder entries, then press **Publish**: it commits `assets/cv-data.js`
  to your repository and GitHub Pages does the rest. No Git, no commands, no code.
  Only the GitHub account that owns the repository can publish — see
  [Browser Editor](#browser-editor).
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

**Option A — the browser editor (no code).** Publish your fork (below), open it,
and follow [Browser Editor](#browser-editor). You will never open a file.

**Option B — edit the data file.** Open [`assets/cv-data.js`](assets/cv-data.js),
replace the placeholder values, and commit. Every field is documented inline;
empty fields (`""` or `[]`) are simply not rendered.

### 4. Deploy on GitHub Pages

1. Push your fork.
2. **Settings → Pages → Deploy from a branch**, branch `master` (or `main`), folder `/ (root)`.
3. Your CV is live at `https://<your-handle>.github.io/cv/`.

---

## Browser Editor

Your CV is a normal, static web page. The editor at `/admin/` turns it into
something you can change from a browser: fill in a form, look at a preview, press
**Publish**, and your live CV updates a minute later.

Behind that button it saves `assets/cv-data.js` back to your own GitHub
repository — but you never have to think about that. There is no database and no
server; your repository stays the only copy of your CV.

**Only you can publish.** The editor asks GitHub who you are and who owns the
repository the CV is being served from, and the two have to be the same person.
That check is GitHub's, not this page's: someone who tampers with the page in
their browser gets an error from GitHub, not a published CV.

### Fork it

Fork this repository. That is all the setting up there is — **the fork is yours**,
so you are the only one who can publish to it. The person you forked from cannot,
and neither can anyone who forks yours later. Nothing needs editing in the code
to make that true; there is no owner's name written down anywhere.

### Enable GitHub Pages

**Settings → Pages → Deploy from a branch**, branch `master` (or `main`), folder
`/ (root)`. After a minute your CV is live at
`https://<your-handle>.github.io/cv/`.

### Give the editor permission

Once, on each device you edit from, you tell GitHub it is really you. Open your
CV, add `?edit` to the address, and click **Edit CV** — or go straight to
`https://<your-handle>.github.io/cv/admin/`. Then click **Sign in with GitHub**
and follow the steps it lists:

1. Open
   [Settings → Developer settings → Fine-grained tokens → **Generate new token**](https://github.com/settings/personal-access-tokens/new).
2. Give it any name, and an expiry date you are comfortable with.
3. Under **Repository access**, choose *Only select repositories* and pick your
   CV repository.
4. Under **Permissions → Repository permissions**, set **Contents** to
   *Read and write*. Nothing else is needed.
5. Generate it, copy it, and paste it into the editor.

That token is a key to one repository and nothing else. It stays in your browser
and is **never** added to your repository — this project has no place to put a
credential, by design. It is forgotten when you close the tab unless you tick
*Stay signed in on this device*, so tick that only on a computer that is yours.

> Prefer a real **Sign in with GitHub** button to pasting a token? That is
> possible, and it is your own to set up rather than something you inherit from
> this repository — see [Optional: a Sign in with GitHub button](#optional-a-sign-in-with-github-button).

### Edit your CV

Everything is a form field: name, tagline, contact links, photo, signature (draw
it with a mouse or a finger), education, employment, skills, open source, talks,
teaching, competitions, awards and coursework. Entries can be added, removed and
moved up or down.

- **Preview** shows the real CV, rendered exactly as visitors will see it.
- **Save Draft** keeps your work in this browser. It is *not* published — nobody
  else can see it, and it survives closing the tab so you can finish later.

### Publish changes

Press **Publish**. The editor commits `assets/cv-data.js` to your repository with
the message *Update CV from web editor*, links you to the commit, and GitHub Pages
puts it online shortly afterwards.

Two things it will not do:

- **Overwrite someone else's work.** If the file changed on GitHub after you
  opened the editor — you edited from your phone, say — it stops and offers to
  load the newer version instead of flattening it.
- **Make empty commits.** Publishing an unchanged CV does nothing.

### Who sees the Edit button

Nobody, normally. Visitors get a CV, not a dashboard. The button appears once you
have signed in on that browser, while you are working on `localhost`, while you
have an unpublished draft, or if you add `?edit` to the address.

`?edit` opens the editor; it does not unlock it. Publishing still needs a GitHub
sign-in, and GitHub still refuses anyone but the repository's owner.

### Optional: a Sign in with GitHub button

Pasting a token once per device is the price of having no server. If you would
rather have a proper sign-in button, you can add one: register your own OAuth App
(one minute, no client secret involved) and deploy the small relay in
[`oauth-relay.example.js`](oauth-relay.example.js), then fill in
[`assets/cv-config.js`](assets/cv-config.js). Both files explain the whole thing.

Worth being clear about why it is not the default: an OAuth App belongs to a
GitHub account, and forking a repository does not hand over its owner's OAuth App.
If this project shipped one of mine, every fork would quietly depend on an
application I control and could switch off. The token route makes your fork
answerable to nobody, which matters more than the extra minute it costs — and if
you set up an OAuth App, the same applies to anyone who forks *you*: they can use
their own, or ignore it and use a token.

---

## Project layout

| Path                    | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `index.html`            | The CV page — markup only.                                       |
| `assets/cv-data.js`     | **Your CV content.** The single source of truth.                |
| `assets/cv.css`         | All styling, including the print/A4 rules. Shared with `/admin`. |
| `assets/cv-store.js`    | Loads content, applies the local draft, escaping helpers.        |
| `assets/cv-render.js`   | Turns the data into the CV document.                             |
| `assets/cv-page.js`     | View switching, QR code, PDF export.                             |
| `assets/cv-config.js`   | Optional settings. Public — never put a credential here.          |
| `assets/cv-repo.js`     | Works out which repository is serving this CV.                   |
| `assets/cv-github.js`   | The GitHub API calls the editor makes.                           |
| `assets/cv-auth.js`     | Who is signed in, and what they may publish.                     |
| `admin/`                | The editor (`index.html`, `admin.css`, `admin.js`).              |
| `oauth-relay.example.js`| Optional. Only for the *Sign in with GitHub* button.             |
| `test/`                 | Editor tests. Optional — see below.                              |
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

---

## Tests

The CV itself needs no build step and no dependencies; the tests are the one
exception, and they are entirely optional.

```bash
npm install --no-save playwright
node test/run.mjs
```

They run offline: the working tree is mounted at an invented `github.io` address
and a stand-in answers `api.github.com`, enforcing the same rules the real one
does. Covered: a visitor sees no editor, a signed-in stranger cannot publish, the
owner can, a fork answers to whoever forked it, the original author gets nothing
on somebody's fork, tampering with the page in the browser changes nothing, and a
concurrent commit is detected rather than overwritten — plus custom domains, user
sites, `/docs` deployments, `localhost`, and a round trip of every field.

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
