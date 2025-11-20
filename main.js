/* ==================================================
   SAHYADRI CONSTRUCTIONS - MAIN JAVASCRIPT FILE
   Handles:
   1. Supabase Client Initialization
   2. AJAX Supabase Contact Form Submission
   3. Mobile Navigation & Header Effects
   4. Active Link Highlighting
   5. Dynamic Project Page Loader
   6. Testimonial Slider
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SUPABASE CLIENT INITIALIZATION ---
    // ⚠️ IMPORTANT: These keys are already correct from your last file. No changes needed here.
    const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';
    
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 2. ELEMENT SELECTIONS ---
    const companyName = "Sahyadri Constructions and Developers";
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const header = document.querySelector('.header');
    const navLinksContainer = document.querySelector('#nav-links');
    const navLinks = document.querySelectorAll('#nav-links a');
    const sections = document.querySelectorAll('section[id]');
    const contactForm = document.querySelector('#contact-form');
    const thankYouMessage = document.querySelector('#thank-you-message');
    const formStatus = document.querySelector('#form-status');
    const submitBtn = document.querySelector('#submit-btn');
    const projectTitleElement = document.getElementById('project-title');
    const backToTopBtn = document.querySelector('#back-to-top-btn');

    // --- DYNAMIC COMPANY NAME LOADER ---
    document.querySelectorAll('.company-name').forEach(element => {
        element.textContent = companyName;
    });

    // --- 3. SUPABASE CONTACT FORM SUBMISSION ---
    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            formStatus.textContent = '';
            formStatus.style.color = 'inherit';

            try {
                const formData = new FormData(contactForm);
                const formProps = Object.fromEntries(formData);
                const file = formProps.file_upload;

                let filePathForDb = null;

                if (file && file.size > 0) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                    
                    // --- THIS IS THE FINAL, CORRECTED LOGIC ---
                    // The path saved to the database is ONLY the filename.
                    filePathForDb = fileName; 

                    const { error: uploadError } = await _supabase.storage
                        .from('contact_uploads')
                        .upload(filePathForDb, file); // Upload using only the filename as the path

                    if (uploadError) {
                        throw new Error(`File Upload Failed: ${uploadError.message}`);
                    }
                }

                const inquiryData = {
                    name: formProps.name,
                    email: formProps.email,
                    phone: formProps.phone,
                    project_type: formProps.project_type,
                    location: formProps.location,
                    budget_range: formProps.budget_range || null,
                    start_date: formProps.start_date || null,
                    message: formProps.message,
                    // Save the clean filename to the 'file_url' column
                    file_url: filePathForDb, 
                    consent_given: formProps.consent === 'on'
                };
                
                const { error: insertError } = await _supabase
                    .from('contact_inquiries')
                    .insert([inquiryData]);

                if (insertError) {
                    throw new Error(`Database submission failed: ${insertError.message}`);
                }
                
                contactForm.style.display = 'none';
                thankYouMessage.classList.remove('hidden');

            } catch (error) {
                formStatus.textContent = `Error: ${error.message}. Please try again.`;
                formStatus.style.color = 'red';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        });
    }

    // --- 4. MOBILE NAVIGATION LOGIC ---
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            const isVisible = navLinksContainer.classList.toggle('is-visible');
            navToggle.setAttribute('aria-expanded', isVisible);
            navToggle.innerHTML = isVisible
                ? '<i class="fas fa-times" aria-hidden="true"></i><span class="sr-only">Close menu</span>'
                : '<i class="fas fa-bars" aria-hidden="true"></i><span class="sr-only">Menu</span>';
        });
    }

    if (navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navLinksContainer.classList.contains('is-visible')) {
                    navToggle.click();
                }
            });
        });
    }

    // --- 5. HEADER SCROLL EFFECT ---
    if (header) {
        const handleScroll = () => {
            header.classList.toggle('scrolled', window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
    }

    // --- 6. ACTIVE LINK ON SCROLL (SCROLLSPY) AND DYNAMIC TITLE ---
    const onScroll = () => {
        const scrollPosition = window.scrollY + 150;
        let activeSectionFound = false;

        const formatTitle = (id) => {
            const text = id.replace(/-/g, ' ');
            return text.charAt(0).toUpperCase() + text.slice(1);
        };

        sections.forEach(section => {
            if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
                const currentSectionId = '#' + section.getAttribute('id');
                const sectionId = section.getAttribute('id');

                document.title = (sectionId === 'hero')
                    ? companyName
                    : `${formatTitle(sectionId)} - ${companyName}`;
                
                activeSectionFound = true;

                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === currentSectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });

        if (!activeSectionFound && window.scrollY < sections[0].offsetTop) {
            document.title = companyName;
        }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();

    // --- 7. DYNAMIC PROJECT PAGE LOADER ---
    if (projectTitleElement) {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = parseInt(urlParams.get('id'));
        const project = projectsData.find(p => p.id === projectId);

        if (project) {
            document.title = `Project: ${project.title} - ${companyName}`;
            projectTitleElement.textContent = project.title;
            document.getElementById('project-subtitle').textContent = project.subtitle;
            document.getElementById('project-vision').textContent = project.vision;
            document.getElementById('project-solution').textContent = project.solution;
            document.getElementById('project-client').textContent = project.client;
            document.getElementById('project-location').textContent = project.location;
            document.getElementById('project-year').textContent = project.year;
            document.getElementById('project-type').textContent = project.type;
            document.getElementById('project-scope').textContent = project.scope;

            const gallery = document.getElementById('project-gallery');
            gallery.innerHTML = '';
            project.galleryImages.forEach(imageUrl => {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = `Image of ${project.title}`;
                gallery.appendChild(img);
            });
        } else {
            projectTitleElement.textContent = 'Project Not Found';
            document.querySelector('.project-detail-section').innerHTML = '<p style="text-align:center;">Sorry, we could not find the project you were looking for.</p>';
        }
    }

    // --- 8. BACK TO TOP BUTTON LOGIC ---
    if (backToTopBtn) {
        const toggleVisibility = () => {
            backToTopBtn.classList.toggle('visible', window.scrollY > 300);
        };
        window.addEventListener('scroll', toggleVisibility);
    }

    // --- 9. TESTIMONIAL SLIDER ---
    const swiper = new Swiper('.testimonial-swiper', {
        loop: true,
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        spaceBetween: 20,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        breakpoints: {
            768: {
                slidesPerView: 2,
                spaceBetween: 30
            },
            1024: {
                slidesPerView: 3,
                spaceBetween: 40
            }
        }
    });
});