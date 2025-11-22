/* ==================================================
   MAIN SITE LOGIC (Navigation, Animations, Home Form)
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. SUPABASE CONFIG
    const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // ... Supabase Config ...

    // --- TRACKING LOGIC ---
    async function trackVisitor() {
        // Check if we already counted this user this session to prevent spamming
        if (sessionStorage.getItem('visit_tracked')) return; 

        try {
            await _supabase.from('site_traffic').insert([{ 
                page: window.location.pathname,
                referrer: document.referrer || 'Direct'
            }]);
            
            // Mark as tracked for this session (tab open)
            sessionStorage.setItem('visit_tracked', 'true');
        } catch (err) {
            console.log('Tracking skipped');
        }
    }
    
    // Run tracking
    trackVisitor();

    // 2. ANIMATION SCROLL REVEAL
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

    // 3. MOBILE NAV TOGGLE
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileToggle.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
    }

    // 4. SWIPER SLIDER (Home Page Only)
    if(document.querySelector('.testimonial-swiper')) {
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

    // 5. BACK TO TOP BUTTON
    const backToTopBtn = document.querySelector('#back-to-top-btn');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            backToTopBtn.classList.toggle('visible', window.scrollY > 300);
        });
    }

    // 6. HOME PAGE CONTACT FORM
    const contactForm = document.querySelector('#contact-form');
    const submitBtn = document.querySelector('#submit-btn');
    const thankYou = document.querySelector('#thank-you-message');
    const status = document.querySelector('#form-status');

    // Check if this form exists (so it doesn't error on Careers page)
    if (contactForm && !document.querySelector('#career-form')) { 
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
                    if(error) throw error;
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
                if(error) throw error;

                contactForm.style.display = 'none';
                thankYou.style.display = 'block';
                thankYou.classList.remove('hidden');

            } catch (error) {
                status.textContent = 'Error. Please try again.';
                status.style.color = 'red';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        });
    }
});