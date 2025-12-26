/* ==================================================
   MAIN SITE LOGIC
   Handles: Shared Components, Nav, Animations, Forms, Blogs, ScrollSpy
   ================================================== */

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';

// Initialize Client
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


document.addEventListener('DOMContentLoaded', async () => {

    // --- STEP 1: LOAD SHARED HEADER & FOOTER ---
    await loadSharedComponents();

    // --- STEP 2: CORE FUNCTIONALITY ---
    initScrollAnimations();
    initBackToTop();
    initFAQ();
    initSwiper(); 
    trackVisitor();

    // --- NEW STEP: LOAD FEATURED PROJECTS ON HOME PAGE ---
    initProjectsSection(); // ADD THIS LINE

    // --- STEP 3: FORMS ---
    initContactForm();    // For the main contact section form
    initInquiryModal();   // For the new universal popup modal
    
    // --- STEP 4: DYNAMIC BLOG CONTENT ---
    const homeInsightsContainer = document.getElementById('home-insights-container');
    const allInsightsContainer = document.getElementById('all-insights-container');

    if (homeInsightsContainer) {
        loadRecentInsights(homeInsightsContainer);
    }

    if (allInsightsContainer) {
        loadAllInsights(allInsightsContainer);
    }
});


/* ==================================================
   HELPER FUNCTIONS
   ================================================== */

// --- 1. HEADER & FOOTER INJECTION ---
async function loadSharedComponents() {
try {
// Load Header
const headerPlaceholder = document.getElementById('main-header');
if (headerPlaceholder) {
const response = await fetch('header.html');
if (response.ok) {
const html = await response.text();
headerPlaceholder.innerHTML = html;
// Initialize Header Logic (Mobile Menu & Initial Active State)
            initHeaderLogic(); 
            
            // Initialize ScrollSpy (Live Active State on Scroll)
            initScrollSpy();
        }
    }

    // Load Footer
    const footerPlaceholder = document.getElementById('main-footer');
    if (footerPlaceholder) {
        const response = await fetch('footer.html');
        if (response.ok) {
            const html = await response.text();
            footerPlaceholder.innerHTML = html;
        }
    }
} catch (error) {
    console.error("Error loading shared components:", error);
   }
}

// --- 2. HEADER LOGIC (Mobile Menu & Static Active State) ---
function initHeaderLogic() {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (!mobileToggle || !navLinksContainer) return;

    // --- Mobile Menu Toggle ---
    mobileToggle.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
        mobileToggle.innerHTML = navLinksContainer.classList.contains('active')
            ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });

    // --- Unified Click Handler for Active State & Accordion ---
    const allLinks = navLinksContainer.querySelectorAll('a');
    const dropdowns = document.querySelectorAll('.nav-links .dropdown');

    allLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // 1. Set Active State
            // Remove 'active' from all links
            allLinks.forEach(l => l.classList.remove('active'));
            // Add 'active' to the clicked link
            this.classList.add('active');
            // If it's a child, also activate the parent dropdown toggle
            const parentDropdown = this.closest('.dropdown');
            if (parentDropdown) {
                const parentToggle = parentDropdown.querySelector('.dropdown-toggle');
                if (parentToggle) {
                    parentToggle.classList.add('active');
                }
            }

            // 2. Handle Accordion & Menu Closing on Mobile
            if (window.innerWidth <= 1200 && navLinksContainer.classList.contains('active')) {
                const isToggle = this.classList.contains('dropdown-toggle');
                
                if (isToggle) {
                    e.preventDefault(); // Prevent navigation on toggle click
                    const currentDropdown = this.closest('.dropdown');
                    
                    // Accordion: close others if this one isn't already open
                    if (!currentDropdown.classList.contains('active')) {
                        dropdowns.forEach(d => d.classList.remove('active'));
                    }
                    currentDropdown.classList.toggle('active');
                } else {
                    // It's a final destination link, so close the menu
                    navLinksContainer.classList.remove('active');
                    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
            }
        });
    });

    // --- Initial Active Link Highlighting (based on URL) ---
    const currentPath = window.location.pathname.split("/").pop() || 'index.html';
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        // Simple check: matches path, or is index.html on root
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}


// --- 3. SCROLL SPY (Updates Blue Line on Scroll) ---
// --- 3. SCROLL SPY (Updates Blue Line on Scroll) ---
function initScrollSpy() {
    // Only run on the Homepage
    const path = window.location.pathname;
    const isHome = path.endsWith('index.html') || path.endsWith('/') || path === '';
    
    if (!isHome) return;

    const sections = Array.from(document.querySelectorAll('section[id]'));
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
    const headerHeight = document.querySelector('.header')?.offsetHeight || 80;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        let currentSectionId = '';

        // Step 1: Determine which section is currently in view.
        // We find the LAST section whose top edge is above the current scroll position.
        sections.forEach(section => {
            if (scrollY >= section.offsetTop - headerHeight - 5) { // Added a 5px buffer for accuracy
                currentSectionId = section.getAttribute('id');
            }
        });

        // Step 2: Clear the 'active' state from ALL links and their parent toggles first.
        // This is the crucial fix to prevent conflicts.
        navLinks.forEach(link => {
            link.classList.remove('active');
            const parentToggle = link.closest('.dropdown')?.querySelector('.dropdown-toggle');
            if (parentToggle) {
                parentToggle.classList.remove('active');
            }
        });

        // Step 3: Find the specific link to activate based on the current section.
        let activeLinkFound = false;
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Check if the link's hash (#) matches the current section's ID
            if (href.includes('#' + currentSectionId)) {
                link.classList.add('active');
                activeLinkFound = true;
                
                // If this link is inside a dropdown, activate its parent toggle as well.
                const parentToggle = link.closest('.dropdown')?.querySelector('.dropdown-toggle');
                if (parentToggle) {
                    parentToggle.classList.add('active');
                }
            }
        });

        // Step 4: If no section link was activated (e.g., we are at the top in the 'hero' section),
        // explicitly activate the main "Home" link.
        if (!activeLinkFound) {
            const homeLink = navLinks.find(link => link.getAttribute('href') === 'index.html');
            if (homeLink) {
                homeLink.classList.add('active');
            }
        }
    });
}
// --- 4. SCROLL ANIMATIONS ---
function initScrollAnimations() {
    const revealElements = document.querySelectorAll('.reveal');
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    };
    const observer = new IntersectionObserver(revealCallback, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
    revealElements.forEach(el => observer.observe(el));
}

// --- 5. BACK TO TOP BUTTON ---
function initBackToTop() {
    const backToTopBtn = document.querySelector('#back-to-top-btn');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            backToTopBtn.classList.toggle('visible', window.scrollY > 300);
        });
    }
}

// --- 6. FAQ ACCORDION ---
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            item.classList.toggle('active');
        });
    });
}

// --- 7. SWIPER SLIDER ---
function initSwiper() {
    if (document.querySelector('.testimonial-swiper') && typeof Swiper !== 'undefined') {
        new Swiper('.testimonial-swiper', {
            loop: true,
            spaceBetween: 30,
            centeredSlides: true,
            slidesPerView: 1,
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            breakpoints: {
                768: { slidesPerView: 2, spaceBetween: 30, centeredSlides: false },
                1024: { slidesPerView: 3, spaceBetween: 40, centeredSlides: false }
            }
        });
    }
}

// --- 8. VISITOR TRACKING ---
async function trackVisitor() {
    if (sessionStorage.getItem('visit_tracked')) return;

    try {
        let userIp = 'Unknown';
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            userIp = data.ip;
        } catch (e) {
            console.warn('Could not fetch IP');
        }

        await _supabase.from('site_traffic').insert([{
            page: window.location.pathname,
            referrer: document.referrer || 'Direct',
            ip_address: userIp
        }]);

        sessionStorage.setItem('visit_tracked', 'true');
    } catch (err) {
        console.log('Tracking skipped');
    }
}

// --- 9. CONTACT FORM LOGIC (For the main section on the page) ---
function initContactForm() {
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        const submitBtn = contactForm.querySelector('#submit-btn');
        const thankYou = document.querySelector('#thank-you-message');
        const status = contactForm.querySelector('#form-status');

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            try {
                const formData = new FormData(contactForm);
                const formProps = Object.fromEntries(formData);
                const file = formProps.file_upload;
                let publicFileUrl = null;

                if (file && file.size > 0) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const { error } = await _supabase.storage.from('contact_uploads').upload(fileName, file);
                    if (error) throw error;
                    const { data } = _supabase.storage.from('contact_uploads').getPublicUrl(fileName);
                    publicFileUrl = data.publicUrl;
                }

                const { error } = await _supabase.from('contact_inquiries').insert([{
                    name: formProps.name,
                    email: formProps.email,
                    phone: formProps.phone,
                    project_type: formProps.project_type,
                    location: formProps.location || 'Not specified',
                    budget_range: formProps.budget_range || null,
                    start_date: formProps.start_date || null,
                    message: formProps.message,
                    file_url: publicFileUrl,
                    consent_given: formProps.consent === 'on'
                }]);
                if (error) throw error;

                contactForm.style.display = 'none';
                if(thankYou) thankYou.style.display = 'block';

            } catch (error) {
                console.error("Main Contact Form Error:", error);
                if(status) {
                    status.textContent = 'Error sending message. Please try again.';
                    status.style.color = 'red';
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        });
    }
}

// --- 10. UNIVERSAL INQUIRY MODAL LOGIC ---
function initInquiryModal() {
    const modal = document.getElementById('inquiry-modal');
    if (!modal) return;

    // Get all modal elements
    const closeBtn = document.getElementById('inquiry-close');
    const titleEl = document.getElementById('modal-title');
    const subtitleEl = document.getElementById('modal-subtitle');
    const form = document.getElementById('modal-form');
    const submitBtn = document.getElementById('modal-submit-btn');
    const statusEl = document.getElementById('modal-status');
    const inquiryTypeInput = document.getElementById('inquiry_type');
    const quoteFields = document.getElementById('quote-fields');

    // Function to open and configure the modal
    function openModal(type) {
        form.reset();
        statusEl.textContent = '';
        submitBtn.disabled = false;
        
        if (type === 'brochure') {
            titleEl.textContent = 'Get the Portfolio';
            subtitleEl.textContent = 'Please enter your details to unlock the full project brochure.';
            submitBtn.innerHTML = '<i class="fas fa-download"></i> Unlock & Download';
            inquiryTypeInput.value = 'Brochure Request';
            quoteFields.style.display = 'none';
        } else { // 'quote'
            titleEl.textContent = 'Get a Free Project Quote';
            subtitleEl.textContent = 'Share your project details and our team will get back with cost, timeline, and next steps.';
            submitBtn.innerHTML = 'Request a Free Quote';
            inquiryTypeInput.value = 'Quote Request (Modal)';
            quoteFields.style.display = 'block';
        }
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    // Attach open listeners to all triggers
    document.querySelectorAll('.quote-modal-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('quote');
        });
    });

    document.querySelectorAll('.brochure-modal-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('brochure');
        });
    });

    // Attach close listeners
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Handle the modal form submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending...';
            statusEl.textContent = '';

            try {
                const formData = new FormData(form);
                const inquiryType = formData.get('inquiry_type');
                
                // --- FIX STARTS HERE ---
                // Save lead to Supabase, providing default values for missing fields
                const { error } = await _supabase.from('contact_inquiries').insert([{
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    project_type: formData.get('project_type') || inquiryType,
                    message: formData.get('message') || `User requested the company brochure.`,
                    consent_given: formData.get('consent') === 'on',
                    // Add default values for columns that exist in the DB but not in this simplified form
                    location: 'Not specified (Modal)',
                    budget_range: null,
                    start_date: null,
                    file_url: null
                }]);
                // --- FIX ENDS HERE ---

                if (error) throw error;

                // Handle success based on type
                statusEl.style.color = 'green';
                if (inquiryType === 'Brochure Request') {
                    statusEl.textContent = 'Success! Your download will begin shortly...';
                    const link = document.createElement('a');
                    link.href = 'brochure.pdf'; 
                    link.download = 'Sahyadri_Constructions_Brochure.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    statusEl.textContent = 'Thank you! Your inquiry has been sent successfully.';
                }

                setTimeout(() => {
                    closeModal();
                    submitBtn.innerHTML = originalBtnText; // Reset button text after closing
                }, 2500);

            } catch (err) {
                console.error('Modal Submission Error:', err);
                statusEl.style.color = 'red';
                statusEl.textContent = 'An error occurred. Please try again.';
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
}


// --- 11. BLOG LOADER (HOME PAGE) ---
async function loadRecentInsights(container) {
    try {
        const { data: posts, error } = await _supabase
            .from('blog_posts')
            .select('title, slug, tag, body_html, created_at')
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;

        container.innerHTML = '';

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p class="reveal" style="grid-column: 1/-1; text-align: center;">No insights published yet.</p>';
            return;
        }

        posts.forEach((post, index) => {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = post.body_html;
            let plainText = tempDiv.textContent || tempDiv.innerText || "";
            let excerpt = plainText.substring(0, 100) + "...";

            const delayClass = index === 1 ? 'reveal-delay-100' : (index === 2 ? 'reveal-delay-200' : '');

            const articleHTML = `
                <article class="insight-card reveal ${delayClass}">
                    <span class="insight-tag">${post.tag || 'Update'}</span>
                    <h3>${post.title}</h3>
                    <p class="insight-excerpt">${excerpt}</p>
                    <a href="blog.html?slug=${post.slug}">Read insight <i class="fas fa-arrow-right" style="font-size:0.8em;"></i></a>
                </article>
            `;

            const template = document.createElement('div');
            template.innerHTML = articleHTML.trim();
            const element = template.firstChild;

            container.appendChild(element);
            setTimeout(() => element.classList.add('active'), 100);
        });

    } catch (err) {
        console.error('Error fetching blogs:', err);
        container.innerHTML = '<p style="text-align:center; color: #ef4444;">Unable to load insights.</p>';
    }
}

// --- 12. BLOG LOADER (ALL INSIGHTS PAGE) ---
async function loadAllInsights(container) {
    try {
        const { data: posts, error } = await _supabase
            .from('blog_posts')
            .select('title, slug, tag, body_html, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        container.innerHTML = '';

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No insights found.</p>';
            return;
        }

        posts.forEach((post, index) => {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = post.body_html;
            let plainText = tempDiv.textContent || tempDiv.innerText || "";
            let excerpt = plainText.substring(0, 100) + "...";

            // --- FIX IS HERE ---
            const dateStr = new Date(post.created_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            const articleHTML = `
                <article class="insight-card reveal">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span class="insight-tag">${post.tag || 'Update'}</span>
                        <span style="font-size:0.8rem; color:#94a3b8;">${dateStr}</span>
                    </div>
                    <h3>${post.title}</h3>
                    <p class="insight-excerpt">${excerpt}</p>
                    <a href="blog.html?slug=${post.slug}">Read article <i class="fas fa-arrow-right" style="font-size:0.8em;"></i></a>
                </article>
            `;

            const template = document.createElement('div');
            template.innerHTML = articleHTML.trim();
            const element = template.firstChild;

            container.appendChild(element);
            setTimeout(() => element.classList.add('active'), index * 100); 
        });

    } catch (err) {
        console.error('Error fetching all blogs:', err);
        container.innerHTML = '<p style="text-align:center; color: red;">Error loading articles.</p>';
    }
}

// Add this new function to main.js
// ===================================================================
// --- 12. DYNAMIC PROJECTS SECTION (HOMEPAGE) ---
// ===================================================================
let allProjectsData = []; // This will store all projects for filtering

async function initProjectsSection() {
    const container = document.querySelector('#projects .projects-grid');
    const filters = document.querySelector('.project-filters');

    if (!container || !filters) return;

    container.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">Loading our portfolio...</p>';

    try {
        // Fetch all projects from Supabase
        const { data, error } = await _supabase
            .from('projects')
            .select('id, title, type, scope, gallery_images, is_featured')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            // This will show an error in the browser console if RLS is misconfigured
            console.error("Supabase Error:", error);
            throw new Error("Could not fetch projects.");
        }
        
        allProjectsData = data || [];

        // Initially, display only the featured projects
        const featuredProjects = allProjectsData.filter(p => p.is_featured);
        renderProjects(featuredProjects.length > 0 ? featuredProjects : allProjectsData.slice(0, 4)); // Fallback to first 4 if none are featured

        // Setup filter button event listeners
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filterValue = btn.getAttribute('data-filter');
                
                let filteredProjects;
                if (filterValue === 'all') {
                    filteredProjects = allProjectsData;
                } else {
                    // Match the 'type' field from Supabase (case-insensitive)
                    filteredProjects = allProjectsData.filter(p => p.type && p.type.toLowerCase() === filterValue);
                }
                renderProjects(filteredProjects);
            });
        });

    } catch (err) {
        console.error('Error initializing projects section:', err);
        container.innerHTML = '<p style="text-align:center; color:red; grid-column: 1 / -1;">Could not load portfolio at this time.</p>';
    }
}

function renderProjects(projectsToRender) {
    const container = document.querySelector('#projects .projects-grid');
    container.innerHTML = ''; // Clear previous projects

    if (projectsToRender.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">No projects match this category.</p>';
        return;
    }

    projectsToRender.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-item reveal';
        // Use project type for the category, defaulting to 'general'
        projectCard.setAttribute('data-category', (project.type || 'general').toLowerCase());
        
        const thumbnailUrl = (project.gallery_images && project.gallery_images.length > 0) ? project.gallery_images[0] : 'images/project-placeholder.jpg'; // A fallback image is good practice

        projectCard.innerHTML = `
            <img src="${thumbnailUrl}" alt="${project.title}" loading="lazy">
            <div class="project-overlay">
                <h3>${project.title}</h3>
                <p>${project.type || 'Project'} • ${project.scope || 'Details'}</p>
                <a href="project-page.html?id=${project.id}" class="btn btn-primary btn-sm">View Details</a>
            </div>
        `;
        container.appendChild(projectCard);
    });
    
    // Re-initialize scroll animations for the newly added items
    initScrollAnimations();
}
