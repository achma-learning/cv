/* ============================================================================
   CV CONTENT — the single source of truth for this site.

   Whatever is in this file is what visitors see. There are two ways to change
   it, and they end in the same place:

     - Edit it here and commit.
     - Use the editor at /admin/ and press Publish, which commits this file for
       you. Signing in with GitHub is what makes that possible, and only the
       account that owns this repository can do it.

   Fields left empty ("" or []) are simply not rendered.
   ========================================================================== */
window.CV_DEFAULT_DATA = {
    // -- Identity ------------------------------------------------------------
    name: "Your Name",
    tagline: "Your Role / Title",

    // -- Contact -------------------------------------------------------------
    email: "you@example.com",
    phone: "+212 6 00 00 00 00",
    location: "Casablanca, Morocco",
    locationUrl: "https://maps.google.com/?q=Casablanca,Morocco",
    website: "https://your-site.example",
    websiteLabel: "your-site.example",
    github: "https://github.com/your-handle",
    githubLabel: "your-handle",
    linkedin: "",
    linkedinLabel: "LinkedIn",
    scholar: "",
    scholarLabel: "Google Scholar",
    orcid: "",
    orcidLabel: "ORCID",

    // -- Images (repo-relative path, absolute URL, or empty to hide) ---------
    profilePhoto: "img.jpg",
    signaturePhoto: "signature.png",

    // -- Sections ------------------------------------------------------------
    education: [
        {
            degree: "M.Sc., Your Field",
            date: "September 2020 – July 2022",
            institution: "University Name, City",
            details: ["Thesis: the title of your dissertation or final project."]
        },
        {
            degree: "B.Sc., Your Field",
            date: "September 2016 – July 2020",
            institution: "University Name, City",
            details: []
        }
    ],

    employment: [
        {
            title: "Your Current Role",
            date: "March 2023 – Present",
            org: "Company Name, City",
            details: [
                "One line per achievement — lead with the outcome, not the task.",
                "Quantify where you can: scale, percentage, time saved."
            ]
        },
        {
            title: "Previous Role",
            date: "June 2022 – February 2023",
            org: "Company Name, City",
            details: ["What you built or improved, and what changed because of it."]
        },
        {
            title: "Internship",
            date: "June 2021 – September 2021",
            org: "Organisation Name, City",
            details: []
        }
    ],

    skills: {
        expert: "The tools you would happily be interviewed on",
        proficient: "The tools you use regularly and comfortably",
        experience: "The tools you have shipped something with at least once"
    },

    // HTML is allowed here (<p>, <a>, <em>) so you can link to projects.
    openSource: "<p>Project Name <em>(maintainer)</em></p><p>Another Project, A Third One <em>(contributor)</em></p>",

    talks: [
        { text: "Talk Title — Event or Venue, City", date: "December 2024" },
        { text: "Another Talk — Meetup Name, City", date: "June 2023" }
    ],

    teaching: [
        { text: "Course Name, Teaching Assistant — University Name", date: "Spring 2023" }
    ],

    competitions: [
        { text: "Competition Name (rank / participants)", date: "April 2023" }
    ],

    awards: [
        { text: "Award or Scholarship Name, awarding body", date: "October 2022" }
    ],

    coursework: [
        "List the courses that are actually relevant to the roles you are applying for, separated by commas.",
        "<em>Online:</em> Course Name (Provider), Another Course (Provider)."
    ]
};
