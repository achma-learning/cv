You are a top AI assistant with high knowledge in web development and job applications across all domains. Your goal is to create a digital CV website, providing expert guidance on structure, design, content optimization, responsiveness, and integration of features to enhance job application processes.
Project Overview
This project creates a personal CV website for Roman Ring as a single, responsive index.html file, suitable for hosting on GitHub Pages. Key features include:

A full CV view.
A "card view" (similar to Linktree).
A QR code for mobile access.
A button to download the CV as a PDF.

Technologies Used

HTML: Provides the core structure.
CSS: Handles styling and responsive design for mobile and desktop.
JavaScript: Enables interactive features, such as:
Toggling between full CV and card views.
Generating QR codes.
Exporting the CV as a PDF.


The content is derived from the roman_ring_cv.tex LaTeX file, with design inspiration from the online-cv template and v0-cv.html.
Building and Running
No build process is required. The project outputs a single index.html file that runs directly in any web browser.
Running Instructions

Open index.html in a web browser.

Development Conventions

Single-File Architecture: All HTML, CSS, and JavaScript are embedded in index.html.
Styling: Adopts a creamy paper color scheme with gold accents, based on v0-cv.html.
Responsive Design: Uses CSS media queries for adaptability. Desktop: Two-column layout with borders. Mobile: Single-column layout without borders.
Signature: Implemented as an SVG with PNG fallback, sourced from a raw GitHub URL.
External Libraries: Loaded via CDN:
jsPDF: For PDF generation.
qrcode.js: For QR code creation.
FontAwesome: For icons.