/* ==================================================
   SAHYADRI CONSTRUCTIONS - MAIN JAVASCRIPT FILE
   Handles:
   1. Mobile Navigation Toggle
   2. Closing Mobile Menu on Link Click
   3. Active Navigation Link Highlighting on Scroll
   4. AJAX Contact Form Submission
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENT SELECTIONS ---
    // We select all the elements we need right at the beginning for efficiency.
    // MASTER WEBSITE VARIABLE
    const companyName = "Sahyadri Constructions and Developers";    
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const header = document.querySelector('.header'); // Assuming you have a header element with this class
    const navLinksContainer = document.querySelector('#nav-links');
    const navLinks = document.querySelectorAll('#nav-links a');
    const sections = document.querySelectorAll('section[id]');
    const contactForm = document.querySelector('#contact-form');
    const thankYouMessage = document.querySelector('#thank-you-message');
    const projectTitleElement = document.getElementById('project-title');
    const backToTopBtn = document.querySelector('#back-to-top-btn');

    // --- NEW: DYNAMIC COMPANY NAME LOADER ---
    // This finds all elements with the 'company-name' class and updates them.
    const companyNameElements = document.querySelectorAll('.company-name');
    companyNameElements.forEach(element => {
        element.textContent = companyName;
    });

    // --- 2. MOBILE NAVIGATION LOGIC ---
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            // Toggle the .is-visible class on the navigation menu
            navLinksContainer.classList.toggle('is-visible');

            // Check if the menu is now visible to update the accessibility attribute
            const isVisible = navLinksContainer.classList.contains('is-visible');
            navToggle.setAttribute('aria-expanded', isVisible);

            // Update the menu icon (hamburger or 'X')
            if (isVisible) {
                navToggle.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i><span class="sr-only">Close menu</span>';
            } else {
                navToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i><span class="sr-only">Menu</span>';
            }
        });
    }


    // --- HEADER SCROLL EFFECT ---
    // This feature requires the .header selection from your Element Selections block.
    if (header) {
        const handleScroll = () => {
        // Check if the user has scrolled more than 100px from the top
            if (window.scrollY > 420) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };

    // Listen for scroll events on the window
        window.addEventListener('scroll', handleScroll);
    
    // Run the function once on load in case the page is reloaded halfway down
        handleScroll();
    }

    // Close the mobile menu automatically when a link is clicked
    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navLinksContainer.classList.contains('is-visible')) {
                    navToggle.click(); // Simulate a click on the toggle to close it
                }
            });
        });
    }


       // --- 3. ACTIVE LINK ON SCROLL (SCROLLSPY) AND DYNAMIC TITLE ---
    const onScroll = () => {
        const scrollPosition = window.scrollY + 150; // Add an offset to highlight a bit earlier
        let activeSectionFound = false; // Flag to check if we are in a section

        // This is a small helper function to format section IDs into nice titles
        const formatTitle = (id) => {
            // Capitalize the first letter and replace hyphens with spaces
            const text = id.replace(/-/g, ' ');
            return text.charAt(0).toUpperCase() + text.slice(1);
        };

        sections.forEach(section => {
            // This is your original logic for finding the active section
            if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
                const currentSectionId = '#' + section.getAttribute('id');
                const sectionId = section.getAttribute('id');

                // --- NEW: This block updates the document title ---
                if (sectionId === 'hero') {
                    // If we are in the hero section, use the default company name
                    document.title = companyName;
                } else {
                    // Otherwise, use the formatted section name
                    document.title = `${formatTitle(sectionId)} - ${companyName}`;
                }
                activeSectionFound = true;
                // --- End of new block ---

                // This is your original logic for highlighting the navigation link
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === currentSectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });

        // --- NEW: If we scroll above all sections, reset to default title ---
        if (!activeSectionFound && window.scrollY < 300) {
            document.title = companyName;
        }
        // --- End of new block ---
    };

    // Listen for scroll events to run the onScroll function
    window.addEventListener('scroll', onScroll);

    // Run it once on load to set the initial state
    onScroll();





    // --- 4. AJAX GOOGLE FORM SUBMISSION ---
    // --- 4. AJAX GOOGLE FORM SUBMISSION (Bulletproof iframe Method) ---
// --- 4. GOOGLE FORM SUBMISSION (Final iframe Method) ---
if (contactForm && thankYouMessage) {
    // Select the iframe by its ID
    const hiddenIframe = document.querySelector('#hidden_iframe');
    let formSubmitted = false; // A flag to ensure we only run this once

    // This function shows the thank you message
    const showThankYouMessage = () => {
        if (formSubmitted) {
            contactForm.style.display = 'none';
            thankYouMessage.classList.remove('hidden');
        }
    };

    // Listen for the iframe to finish loading
    // This happens AFTER Google's server responds
    if (hiddenIframe) {
        hiddenIframe.addEventListener('load', showThankYouMessage);
    }

    // When the form is submitted, we set our flag to true
    contactForm.addEventListener('submit', () => {
        formSubmitted = true;
        // We do NOT prevent the default action. The form submits normally.
    });
}


    // --- DYNAMIC PROJECT PAGE LOADER ---
    // This code block only runs if it finds an element with the ID 'project-title',
    // meaning it will only execute on our new project-page.html
    if (projectTitleElement) {
        
        // 1. Get the project ID from the URL (e.g., "?id=1")
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = parseInt(urlParams.get('id')); // Convert the ID to a number

        // 2. Find the correct project data from our "database"
        const project = projectsData.find(p => p.id === projectId);

        // 3. Populate the page with the project data
        if (project) {
            // Set the page title
            document.title = `Project: ${project.title} - Sahyadri Constructions`;

            // Fill in the text content
            projectTitleElement.textContent = project.title;
            document.getElementById('project-subtitle').textContent = project.subtitle;
            document.getElementById('project-vision').textContent = project.vision;
            document.getElementById('project-solution').textContent = project.solution;
            document.getElementById('project-client').textContent = project.client;
            document.getElementById('project-location').textContent = project.location;
            document.getElementById('project-year').textContent = project.year;
            document.getElementById('project-type').textContent = project.type;
            document.getElementById('project-scope').textContent = project.scope;

            // Create and add the gallery images
            const gallery = document.getElementById('project-gallery');
            gallery.innerHTML = ''; // Clear any existing content
            project.galleryImages.forEach(imageUrl => {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = `Image of ${project.title}`;
                gallery.appendChild(img);
            });
        } else {
            // If no project is found for the ID, show an error message
            projectTitleElement.textContent = 'Project Not Found';
            document.querySelector('.project-detail-section').innerHTML = '<p style="text-align:center;">Sorry, we could not find the project you were looking for.</p>';
        }
    }

    // --- BACK TO TOP BUTTON LOGIC ---
if (backToTopBtn) {
    const toggleVisibility = () => {
        // If the user has scrolled down more than 300 pixels
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    };

    // Listen for scroll events on the window
    window.addEventListener('scroll', toggleVisibility);
}


    // --- 5. TESTIMONIAL SLIDER LOGIC ---
    // Inside the main 'DOMContentLoaded' listener in main.js

// --- 5. SWIPER TESTIMONIAL SLIDER ---
const swiper = new Swiper('.testimonial-swiper', {
    // Optional parameters
    loop: true,             // Makes the slider infinite
    grabCursor: true,       // Shows a "grab" cursor on hover
    centeredSlides: true,   // Centers the active slide
    
    // How many slides to show. 'auto' works well with our CSS.
    slidesPerView: 'auto',

    // Space between slides
    spaceBetween: 20,

    // Navigation arrows
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },

    // Responsive breakpoints
    breakpoints: {
        // when window width is >= 768px
        768: {
            slidesPerView: 2,
            spaceBetween: 30
        },
        // when window width is >= 1024px
        1024: {
            slidesPerView: 3,
            spaceBetween: 40
        }
    }
});

});