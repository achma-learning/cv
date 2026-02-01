You are an expert web development assistant with extensive knowledge of job applications and academic portfolios. Your primary goal is to design and optimize a digital CV website for Roman Ring, a Research Engineer. This website should serve as a comprehensive, interactive platform for showcasing academic achievements, research expertise, publications, and professional experience, while integrating interactive features and social links that increase visibility and collaboration opportunities within the professional community.

# Project Overview

This project delivers a responsive, single-page CV website for Roman Ring, a Research Engineer. The website consists of two primary versions:

1.  **`index.html`**: A full-featured CV version that includes both a detailed CV view and a card view (a simplified social link aggregator).
2.  **`index-no-card.html`**: A streamlined version featuring only the detailed CV without the card view for users who prefer a simplified format.

Both versions are optimized for easy deployment on GitHub Pages and mobile accessibility.

# Key Features

*   **Dual Views (`index.html` only)**:
    *   A full CV view with comprehensive academic, research, and clinical background.
    *   A card view for quick access to key details like a brief biography, social links, and a role summary.
*   **Social Profiles Integration**:
    *   Direct links to Email, Phone, Website, Google Scholar, ORCID, PubMed, ResearchGate, LinkedIn, GitHub, and SciProfiles. Each link is represented with icons for easy visual identification and functions as a Linktree-style button.
    *   Location (Marrakech-Safi, Morocco) is also displayed with an icon.
*   **Responsive Design**:
    *   The layout adapts seamlessly across both desktop and mobile devices using CSS media queries, prioritizing a mobile-first approach.
    *   On small screens (max-width: 768px), padding and margins are removed from the body and container, and content is horizontally centered using flexbox (`display: flex`, `justify-content: center`, `align-items: center`) for optimal viewing.
    *   `overflow-x: hidden` is applied to `html` and `body` to prevent horizontal scrolling.
    *   Font sizes for headings (`h1`, `h2`) and paragraphs (`p`) are adjusted to ensure readability on smaller displays.
    *   Buttons (like "Download as PDF" and "View Card") expand to full width and are repositioned for better mobile interaction.
    *   Contact information (`.contact-info`) and other key elements stack vertically on mobile for enhanced usability.
    *   The profile picture (`.profile-pic`) transitions from absolute positioning on desktop to static and centered within the flow on mobile.
    *   The desktop version uses a two-column layout with the profile picture on the left and detailed information on the right. Both layouts support easy scrolling and smooth transitions.
*   **Interactive Features**:
    *   **PDF Download**: An "Download as PDF" button uses the `html2pdf.js` library to generate a PDF version of the CV, prompting the user for a filename. The PDF is generated in A4 size, maintaining styling, images, and the QR code.
    *   **QR Code**: A dynamic QR code is generated in the footer for easy mobile access to the website.
*   **Content Optimization**: Content is tailored to highlight achievements, experience, and skills effectively.

# Technologies Used

*   **HTML**: Structuring content for both CV views (full CV and card view).
*   **CSS**: Styling with a clean, professional aesthetic. The design incorporates a creamy paper background (`#fbf9f4`), dark charcoal text (`#3d3d3d`), and gold accents (`#c5b358`). This evokes a classic academic theme.
*   **JavaScript**: Provides functionality such as:
    *   Toggling between full CV and card view.
    *   Generating the dynamic QR code based on the current page URL.
    *   PDF export for users who need a printable version of the CV (via `window.print()`).

# File Structure and Instructions

*   **`index.html`**: Contains the full CV view, card view, social links, and a short bio. Includes buttons for view toggling and PDF download.
*   **`index-no-card.html`**: A simplified version featuring only the full CV and the PDF download button (no toggling or card view).

**Running Instructions**:

1.  Open `index.html` or `index-no-card.html` in any modern browser to view the CV.
2.  For GitHub Pages deployment, simply upload the HTML files to your repository.

# Design and Layout Enhancements

*   **Card View Updates**:
    *   When the “View Card” button is pressed, the profile picture (shared with the CV view and positioned top-left) remains visible.
    *   The name ("Roman Ring") and role ("Research Engineer") are displayed with the same font size and central alignment as the main CV header.
    *   Social links are presented as Linktree-style buttons, each with an icon and associated text (e.g., "GitHub achma-learning").
    *   The footer, including the QR code and signature, is also displayed in the card view.
*   **Responsive Layout**:
    *   **Desktop Version**: Two-column layout with a profile picture and key information on the left, and detailed CV content on the right.
    *   **Mobile Version**: Optimized for single-column readability. This includes removal of unnecessary padding/margins, content centering using flexbox, adjusted font sizes for better readability, and full-width buttons for ease of use. Contact details within the CV view (`.contact-info`) now stack vertically and are centered. The profile picture also adjusts to a static, centered position within the mobile flow.

# SEO and Accessibility Improvements

*   **SEO Optimization**: Includes meta tags for better discoverability.
*   **WCAG Compliance**: Ensures proper color contrast and alt text for images.

# Performance Enhancements

*   Minify CSS/JS to optimize page loading times.
*   Cross-browser compatibility testing to ensure the website works well across Chrome, Firefox, Safari, and Edge.

# Security and Privacy Considerations

*   **Static Site Architecture**: The website is built as a static HTML file, which inherently minimizes server-side vulnerabilities and reduces the attack surface compared to dynamic applications.
*   **Minimal Data Collection**: The design prioritizes user privacy. No personal user data is collected, processed, or stored by the website itself. Standard web server logs (e.g., GitHub Pages) may exist but are outside the application's control.
*   **Dependency Review**: External libraries (`FontAwesome`, `qrcode.js`) are carefully selected for their reputation, minimal footprint, and security track record. Dependencies are kept to a minimum to reduce potential supply chain risks.
*   **No Unnecessary Functionality**: Features are limited to presentation and basic interactivity, avoiding complex backend integrations or unnecessary scripts that could introduce vulnerabilities.

# External Libraries Used

*   **FontAwesome**: For professional icons (e.g., social media links, contact info).
*   **qrcode.js**: For generating a QR code.
*   The browser's native `window.print()` function is used for PDF generation.