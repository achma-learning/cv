You are a top AI assistant with high knowledge in web development and job applications across all domains. Your goal is to create a digital CV website, providing expert guidance on structure, design, content optimization, responsiveness, and integration of features to enhance job application processes.

# Project Overview

This project creates a personal CV website for Roman Ring, delivered in two single, responsive HTML files:

1.  **`index.html`**: A full-featured version with both a comprehensive CV view and a "card view" (similar to a social link aggregator).
2.  **`index-no-card.html`**: A simplified version containing only the full CV view.

Both versions are suitable for hosting on platforms like GitHub Pages.

# Key Features

*   **Dual Views (`index.html` only)**: A "View Card" button allows toggling between the full CV and a concise card view.
*   **Responsive Design**: The layout adapts seamlessly to both desktop and mobile devices.
*   **QR Code**: A QR code is embedded in the footer for easy mobile access to the live URL.
*   **PDF Download**: A "Download as PDF" button uses the browser's native print functionality to generate a PDF of the CV.

# Technologies Used

*   **HTML**: Provides the core structure for both CV files.
*   **CSS**: Handles styling and responsive design using media queries. The design is based on a classic, elegant theme with a creamy paper background and gold accents.
*   **JavaScript**: Enables interactive features, including:
    *   Toggling between the full CV and card views (in `index.html`).
    *   Generating a dynamic QR code based on the current page URL.

# Files

*   **`index.html`**: The main file, containing the full CV, a card view with social links, a biography, and a signature. It includes buttons for toggling the view and downloading the PDF.
*   **`index-no-card.html`**: A streamlined version that includes only the full CV and a "Download as PDF" button. It does not contain the card view or the button to toggle it.

# Building and Running

No build process is required. The project consists of two standalone HTML files that can be run directly in any modern web browser.

**Running Instructions**:

1.  Open either `index.html` or `index-no-card.html` in a web browser.

# Development Conventions

*   **Single-File Architecture**: All HTML, CSS, and JavaScript are embedded within each HTML file to ensure portability and simplicity.
*   **Styling**: Adopts a professional and classic aesthetic with a "creamy paper" color scheme (`#fbf9f4`), "dark charcoal" ink (`#3d3d3d`), and "gold" accents (`#c5b358`).
*   **Responsive Design**:
    *   **Desktop**: A traditional layout with a profile picture on the left and content on the right, enclosed within a decorative border.
    *   **Mobile**: A single-column layout that removes the border and stacks content vertically for improved readability on smaller screens.
*   **Signature**: The signature is implemented as a PNG image, sourced from a raw GitHub URL, with a commented-out SVG option for easy switching.
*   **External Libraries**: The following libraries are loaded via CDN:
    *   **qrcode.js**: For generating the QR code.
    *   **FontAwesome**: For icons used in contact information and social links.


