# Digital CV — LaTeX-Style HTML Template

A dependency-free HTML curriculum vitae with the sober, academic look of a LaTeX
CV. No build step, no framework — fork it, edit one data file, and host it on
GitHub Pages.

> Fork it, turn on GitHub Pages, and edit your CV from the browser — see
> [Quick start](#quick-start).

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

No terminal, no code — nine steps:

1. **Fork** this repository. Your fork is yours; nobody else can publish to it.
2. In your fork: **Settings → Pages → Deploy from a branch**, pick branch
   `master` (or `main`) and folder `/ (root)`.
3. Wait a minute, then open your CV at `https://<your-handle>.github.io/cv/`.
4. Add `?edit` to that address and click **Edit CV**.
5. Click **Connect GitHub**. It links you to
   [GitHub's fine-grained token page](https://github.com/settings/personal-access-tokens/new).
6. Under *Repository access* choose **Only select repositories** and pick your
   fork. Under *Permissions → Repository permissions* set **Contents** to
   **Read and write**. Nothing else is needed.
7. Copy the token, paste it into the editor, press **Continue**.
8. Fill in the form. **Preview** to see the real CV.
9. Press **Publish**. Your CV is live once GitHub Pages finishes rebuilding,
   usually under a minute.

> ⚠️ **Never put a token in your repository.** Do not paste it into
> `assets/cv-data.js`, `assets/cv-config.js`, an HTML file, or any other file you
> commit — anything committed to a public repository is public, and a committed
> token would let anyone change your CV. The editor keeps it in your browser and
> never writes it to a file. If you ever paste one somewhere by accident,
> [revoke it](https://github.com/settings/tokens?type=beta) immediately.

Full detail in [Browser Editor](#browser-editor) below.

---

## Working in an editor instead

The browser editor is optional. Everything it does you can do by hand.

```bash
git clone https://github.com/<your-handle>/cv.git
cd cv
python3 -m http.server 8000     # then open http://localhost:8000
```

A local server is recommended over opening the file directly — some browsers
restrict scripts loaded from `file://`.

Open [`assets/cv-data.js`](assets/cv-data.js), replace the placeholder values and
commit. Every field is documented inline; empty fields (`""` or `[]`) are simply
not rendered. The editor and the file are interchangeable — the editor writes the
same format, comments and all, so you can switch between them freely.

---

## Browser Editor

Your CV is a normal, static web page. The editor at `/admin/` turns it into
something you can change from a browser: fill in a form, look at a preview, press
**Publish**, and your live CV updates a minute later.

Behind that button it saves `assets/cv-data.js` back to your own GitHub
repository — but you never have to think about that. There is no database and no
server; your repository stays the only copy of your CV.

**Only you can publish.** The editor asks GitHub who you are and who owns the
repository serving the CV, and the two have to match. That check is GitHub's, not
this page's — someone who tampers with the page in their browser gets an error
from GitHub, not a published CV.

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

Once per device, you prove to GitHub that it is really you. Open your CV, add
`?edit` to the address and click **Edit CV** — or go straight to
`https://<your-handle>.github.io/cv/admin/`. Click **Connect GitHub**, and the
editor walks you through it:

1. Open
   [Settings → Developer settings → Fine-grained tokens → **Generate new token**](https://github.com/settings/personal-access-tokens/new).
2. Give it any name and an expiry date you are comfortable with.
3. Under **Repository access**, choose *Only select repositories* and pick your
   CV repository.
4. Under **Permissions → Repository permissions**, set:

   > **Contents** → **Read and write**

   That is the only permission needed. Leave everything else alone — the editor
   never asks for Administration, Actions, Workflows, Secrets or anything to do
   with your organisations.
5. Press *Generate token*, copy it, and paste it into the editor.

**Where the token lives.** In your browser, and nowhere else. It is never added
to your repository, never put in a web address, and never sent to any server
other than GitHub's own API. Close the tab and it is gone — unless you tick
*Stay signed in on this device*, which keeps it on that computer until you press
**Sign Out**. Tick it only on a machine that is yours alone. **Sign Out** deletes
the token and hides the Edit button again; your draft is untouched.

If the token expires or you delete it on GitHub, the editor notices, forgets it
and asks you to connect again. You can revoke it at any time from
[GitHub's token settings](https://github.com/settings/tokens?type=beta) — nothing
in this project can outlive that.

> **Why not a "Sign in with GitHub" button?** Because it would not be yours. A
> sign-in button needs an OAuth application, an OAuth application belongs to one
> GitHub account, and forking a repository does not hand it over. If this project
> shipped one of mine, every fork would quietly depend on an application I own
> and could switch off tomorrow — and a static site cannot keep the secret such a
> button usually needs, so it would want a small server as well. A token you
> create yourself costs one extra minute and leaves your fork answerable to
> nobody. That trade is the whole reason this project has no backend.

### Edit your CV

Everything is a form field: name, tagline, contact links, photo, signature (draw
it with a mouse or a finger), education, employment, skills, open source, talks,
teaching, competitions, awards and coursework. Entries can be added, removed and
moved up or down.

- **Preview** shows the real CV, rendered exactly as visitors will see it.
- **Save Draft** keeps your work in this browser. It is *not* published — nobody
  else can see it, and it survives closing the tab so you can finish later.

### Publish changes

Press **Publish**. Behind the scenes that is a normal Git commit to
`assets/cv-data.js` in your repository, with the message *Update CV from web
editor* — the editor links you to it, so your CV keeps a full history and you can
undo anything from GitHub in the usual way.

Publishing is not instant: GitHub Pages rebuilds the site, which usually takes
under a minute. The editor says so rather than pretending the change is already
live. Your own browser shows the new version immediately; everyone else sees it
once the rebuild finishes.

Two things it will not do:

- **Overwrite someone else's work.** If the file changed on GitHub after you
  opened the editor — you edited from your phone, say — it stops and offers to
  load the newer version instead of flattening it.
- **Make empty commits.** Publishing an unchanged CV does nothing.

### Who sees the Edit button

Nobody, normally. Visitors get a CV, not a dashboard. The button appears once you
have connected GitHub in that browser, while you are working on `localhost`,
while you have an unpublished draft, or if you add `?edit` to the address.

`?edit` opens the editor; it does not unlock it. Publishing still needs a token,
and GitHub still refuses anyone who does not own the repository. Hiding the
button is tidiness, not security.

### Forks own themselves

Editing rights follow the repository, automatically. Nobody's username is written
down anywhere in this project — the editor asks GitHub who owns the repository
serving the page, and compares that to who is signed in.

So if you fork this CV, your copy is yours: you can publish to it and the person
you forked from cannot. If somebody forks *yours*, the same applies to them, and
you get no say over their copy. This holds however many times it is forked.

### Limitations worth knowing

- **You need a token.** There is no way around this for a site with no server;
  see the note above. It takes a minute, once per device.
- **Organisation repositories** need *admin* rights on the repository, not just
  write access, because an organisation cannot sign in and click things. A
  collaborator who can push is deliberately not treated as the CV's owner. On a
  personal repository the rule is stricter still: only the account that owns it
  can publish, even if others have push access.
- **Custom domains** hide which repository is serving the page. The editor works
  it out by asking GitHub which of your repositories publishes to this address,
  which needs no configuration but does show you a short list to confirm if it
  cannot tell. You can skip that by setting `repository` in
  [`assets/cv-config.js`](assets/cv-config.js).
- **Publishing from `/docs` or a `gh-pages` branch** works, and so does a CV kept
  in a subfolder of a personal site. The editor finds the file rather than
  assuming where it is.
- **GitHub Pages takes a moment** to rebuild after each publish, as above.
- **A shared computer** is a bad place to tick *Stay signed in*.

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
does — a token is one person, only their own repositories accept a write, and a
stale version is refused.

Three suites:

- **Who may publish** — a visitor sees no editor; a signed-in stranger cannot
  publish; the owner can; a fork answers to whoever forked it; the original
  author gets nothing on somebody else's fork; a concurrent commit is detected
  rather than overwritten; the token lives where it should and is dropped on
  sign-out.
- **Where the CV lives** — project sites, user sites, custom domains, `/docs`,
  a CV in a subfolder, `localhost`, and a round trip of every field.
- **Hardening** — a fork of a fork, organisation repositories at each permission
  level, a token that can only read repository contents, every browser-side lever
  pulled at once, and a check that no original owner is hard-coded anywhere.

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
