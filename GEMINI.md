# Project Overview

This project is a personal CV website for Roman Ring. The goal is to create a single, responsive `index.html` file that can be hosted on GitHub Pages. The website features a full CV view, a "card view" (similar to a Linktree), a QR code for easy mobile access, and a button to download the CV as a PDF.

The main technologies used are:
-   **HTML:** For the structure of the CV.
-   **CSS:** For styling, including a responsive design that adapts to mobile and desktop screens.
-   **JavaScript:** For the following functionalities:
    -   Toggling between the full CV and card view.
    -   Generating a QR code.
    -   Generating a PDF of the CV.

The CV content is based on the `roman_ring_cv.tex` LaTeX file. The design is inspired by the `online-cv` template and `v0-cv.html`.

# Building and Running

There are no build steps required for this project. The final output is the `index.html` file, which can be opened directly in a web browser.

## To run the project:

1.  Open the `index.html` file in a web browser.

# Development Conventions

-   **Single-File Architecture:** The entire website (HTML, CSS, and JavaScript) is contained within the `index.html` file.
-   **Styling:** The visual style is based on the `v0-cv.html` file, using a creamy paper color scheme with gold accents.
-   **Responsive Design:** The website uses CSS media queries to adapt to different screen sizes. The desktop view features a two-column layout with a border, while the mobile view is a single-column layout without a border.
-   **Signature:** The signature is an SVG with a PNG fallback, loaded from a raw GitHub URL.
-   **External Libraries:** The project uses the following external JavaScript libraries, loaded from a CDN:
    -   **jsPDF:** For generating the PDF.
    -   **qrcode.js:** For generating the QR code.
    -   **FontAwesome:** For icons.
