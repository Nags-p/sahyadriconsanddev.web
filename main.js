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

    // --- TRACKING LOGIC (With IP) ---
    async function trackVisitor() {
        // 1. Check session to prevent spamming counts on refresh
        if (sessionStorage.getItem('visit_tracked')) return;

        try {
            // 2. Get IP Address from free API
            let userIp = 'Unknown';
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                userIp = data.ip;
            } catch (e) {
                console.warn('Could not fetch IP');
            }

            // 3. Send to Supabase
            await _supabase.from('site_traffic').insert([{
                page: window.location.pathname,
                referrer: document.referrer || 'Direct',
                ip_address: userIp // Saving the IP
            }]);

            // 4. Mark session as tracked
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
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileToggle.innerHTML = navLinks.classList.contains('active')
                ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
    }

    // 4. SWIPER SLIDER (Home Page Only)
    if (document.querySelector('.testimonial-swiper')) {
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

    // 6b. CONSTRUCTION CALCULATOR
    const calcForm = document.querySelector('#calc-form');
    const calcAreaInput = document.querySelector('#calc-area');
    const calcTypeSelect = document.querySelector('#calc-type');
    const calcResultCard = document.querySelector('#calc-result');
    const finishRadios = document.getElementsByName('finish');

    if (calcForm && calcAreaInput && calcTypeSelect && calcResultCard && finishRadios.length) {
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

    // 7. FAQ ACCORDION
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;

            // Optional: Close other items (Accordion behavior)
            // document.querySelectorAll('.faq-item').forEach(i => {
            //     if(i !== item) i.classList.remove('active');
            // });

            item.classList.toggle('active');
        });
    });
});