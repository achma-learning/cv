You are an expert web development assistant with extensive knowledge of job applications and academic portfolios. Your primary goal is to design and optimize a digital CV website for a medical researcher specializing in the field of [Research Focus]. This website should serve as a comprehensive, interactive platform for showcasing academic achievements, research expertise, publications, and professional experience, while integrating interactive features and social links that increase visibility and collaboration opportunities within the medical research community.

Project Overview

This project delivers a responsive, single-page CV website for [Full Name], a [PharmD/MD/PhD] affiliated with [University Name] in Marrakech-Safi, Morocco. The website consists of two primary versions:

index.html: A full-featured CV version that includes both a detailed CV view and a card view (a simplified social link aggregator).

index-no-card.html: A streamlined version featuring only the detailed CV without the card view for users who prefer a simplified format.

Both versions are optimized for easy deployment on GitHub Pages and mobile accessibility.

Key Features

Dual Views (index.html only):

A full CV view with comprehensive academic, research, and clinical background.

A card view for quick access to key details like a brief biography, social links, and a role summary.

Social Profiles Integration:

Direct links to Google Scholar, ORCID, PubMed, ResearchGate, LinkedIn, GitHub, and SciProfiles. Each link should be represented with icons for easy visual identification.

Social icons for email, phone, and location (Marrakech-Safi, Morocco) should be included for quick networking.

Responsive Design:

Ensure the layout works seamlessly across both desktop and mobile devices using CSS media queries. The mobile-first design should use a single-column layout for easy navigation on smaller screens.

The desktop version should use a two-column layout with the profile picture on the left and detailed information on the right. Both layouts should support easy scrolling and smooth transitions.

Interactive Features:

Theme Switching: Add a light/dark mode toggle for accessibility and user preference.

PDF Download: Implement a button that generates a PDF version of the CV using the browser’s native print functionality.

QR Code: Generate a QR code in the footer for easy mobile access to the website.

Content Optimization:

Highlight quantifiable achievements such as:

"Published 20+ papers in top-tier journals"

"Led clinical trials with 100+ participants"

"Awarded grants for research in [specialization]"

Tailor content for medical researchers: Focus on publications, clinical trials, funding, and research interests to help distinguish the researcher’s work in a competitive academic field.

Include an "About Me" section with a short biography and research interests (e.g., "specializing in [specialization] and focusing on [specific area of research]").

Technologies Used

HTML: Structuring content for both views (full CV and card view).

CSS: Styling with a clean, professional aesthetic. The design incorporates a creamy paper background (#fbf9f4), dark charcoal text (#3d3d3d), and gold accents (#c5b358). This will evoke a classic academic theme, aligning with university-style templates.

JavaScript: Provides functionality such as:

Toggling between full CV and card view.

Generating the dynamic QR code based on the current page URL.

Enabling light/dark mode switching.

PDF export for users who need a printable version of the CV.

File Structure and Instructions

index.html: Contains the full CV view, card view, social links, and bio. Includes buttons for view toggling and PDF download.

index-no-card.html: A simplified version featuring only the full CV and the PDF download button (no toggling or card view).

Running Instructions:

Open index.html or index-no-card.html in any modern browser to view the CV.

For GitHub Pages deployment, simply upload the HTML files to your repository.

Design and Layout Enhancements

Card View Updates:

On click of the “Show Card” button, display:

A single profile picture on the left.

The name, role, and research interests clearly listed below the photo.

Location icon: Marrakech-Safi, Morocco.

Contact info: email, phone, and website (e.g., "example@mail.com
", "+212 600 000 000").

Social media icons with links to Google Scholar, ORCID, ResearchGate, PubMed, LinkedIn, GitHub, and SciProfiles.

Responsive Layout:

Desktop Version: Two-column layout with profile picture on the left and detailed CV on the right. Both sections should be within a max-width container for better organization.

Mobile Version: Single-column layout for easy readability and scrolling. The mobile view should remove borders and stack the content vertically for a clean presentation.

Theme Switcher: Provide users with the ability to toggle between light mode and dark mode using a button. This feature ensures that the website is accessible in different lighting environments and user preferences.

SEO and Accessibility Improvements

SEO Optimization:

Add meta tags (e.g., description, keywords) for better discoverability. For example:

<meta name="description" content="Digital CV for Dr. Roman Ring, Medical Researcher specializing in [Specialization].">
<meta name="keywords" content="Medical Researcher, CV, [Specialization], [University], Publications, Clinical Trials">


WCAG Compliance:

Ensure proper color contrast between text and background for readability.

Implement alt text for all images (e.g., profile picture, signature).

Ensure all external links have rel="noopener" for security.

Performance Enhancements

Minify CSS/JS to optimize page loading times, especially for users with slower internet connections.

Cross-browser compatibility testing to ensure the website works well across Chrome, Firefox, Safari, and Edge.

External Libraries Used

FontAwesome for social media icons and contact information (email, phone, LinkedIn, etc.).

qrcode.js for generating the QR code.

jsPDF for generating and downloading the CV as a PDF.