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

    // --- STEP 3: FORMS ---
    initContactForm();
    initCalculator();

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
    // Mobile Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (mobileToggle && navLinksContainer) {
        mobileToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            mobileToggle.innerHTML = navLinksContainer.classList.contains('active')
                ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
    }

    // Initial Active Link Highlighting (based on URL)
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
function initScrollSpy() {
    // Only run on Homepage
    const path = window.location.pathname;
    const isHome = path.endsWith('index.html') || path === '/' || path.endsWith('/');
    
    if (!isHome) return;

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';

        // Determine which section is currently in view
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // 150px offset for the fixed header
            if (pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        // Special check for top of page (Home)
        if (window.scrollY < 100) {
            current = 'home'; 
        }

        // Remove active class from all and add to current
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');

            // If we are at top, highlight Home
            if (current === 'home' && (!href.includes('#') || href.includes('#hero'))) {
                link.classList.add('active');
            }
            // Otherwise match the section ID
            else if (current && href.includes('#' + current)) {
                link.classList.add('active');
            }
        });
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

// --- 9. CONTACT FORM LOGIC ---
function initContactForm() {
    const contactForm = document.querySelector('#contact-form');
    if (contactForm && !document.querySelector('#career-form')) {
        const submitBtn = document.querySelector('#submit-btn');
        const thankYou = document.querySelector('#thank-you-message');
        const status = document.querySelector('#form-status');

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
                console.error(error);
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

// --- 10. CALCULATOR LOGIC ---
function initCalculator() {
    const calcForm = document.querySelector('#calc-form');
    if (calcForm) {
        const calcAreaInput = document.querySelector('#calc-area');
        const calcTypeSelect = document.querySelector('#calc-type');
        const calcResultCard = document.querySelector('#calc-result');
        const finishRadios = document.getElementsByName('finish');

        const rateMatrix = {
            standard: { residential: 1650, commercial: 1850, interiors: 900 },
            premium: { residential: 2150, commercial: 2350, interiors: 1200 },
            luxury: { residential: 2550, commercial: 2750, interiors: 1500 }
        };

        calcForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const area = parseFloat(calcAreaInput.value || '0');
            const type = calcTypeSelect.value;
            const finish = Array.from(finishRadios).find(r => r.checked)?.value || 'standard';

            if (!area || area <= 0) {
                calcResultCard.innerHTML = `<h4>Estimated Budget</h4><p>Please enter a valid area.</p>`;
                return;
            }

            const rate = rateMatrix[finish][type] || 0;
            const estimate = Math.round(area * rate);
            const formatted = estimate.toLocaleString('en-IN');
            const monthly = Math.round(estimate / 12).toLocaleString('en-IN');

            calcResultCard.innerHTML = `
                <h4>Estimated Budget</h4>
                <p><strong>₹${formatted}</strong> (±7%)</p>
                <p style="font-size:0.9rem; color: var(--text-secondary);">Indicative milestone of ₹${monthly}/month across 12 months.</p>
            `;
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