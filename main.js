document.addEventListener('DOMContentLoaded', () => {
    
    // 1. ANIMATION SCROLL REVEAL (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed
                observer.unobserve(entry.target);
            }
        });
    };

    const revealOptions = {
        threshold: 0.15, // Trigger when 15% of element is visible
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver(revealCallback, revealOptions);
    revealElements.forEach(el => observer.observe(el));

    // 2. SUPABASE CONFIG
    const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 3. MOBILE NAV
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');
    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileToggle.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
    }

    // 4. SWIPER
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

    // 5. SUPABASE FORM
    const contactForm = document.querySelector('#contact-form');
    const submitBtn = document.querySelector('#submit-btn');
    const thankYou = document.querySelector('#thank-you-message');
    const status = document.querySelector('#form-status');

    if (contactForm) {
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
                thankYou.classList.remove('hidden');
                thankYou.style.display = 'block';

            } catch (error) {
                status.textContent = 'Error. Please try again.';
                status.style.color = 'red';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        });
    }
    
    // 6. PROJECT PAGE LOADER
    const projectTitleElement = document.getElementById('project-title');
    if (projectTitleElement) {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = parseInt(urlParams.get('id'));
        const project = projectsData.find(p => p.id === projectId);

        if (project) {
            document.title = `${project.title} - Sahyadri`;
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
            if(gallery) {
                gallery.innerHTML = '';
                project.galleryImages.forEach(url => {
                    const img = document.createElement('img');
                    img.src = url;
                    img.classList.add('reveal'); // Animate images
                    gallery.appendChild(img);
                });
                
                // Re-observe new images
                const newImages = gallery.querySelectorAll('.reveal');
                const observer = new IntersectionObserver(revealCallback, revealOptions);
                newImages.forEach(el => observer.observe(el));
            }
        }
    }

    // 7. BACK TO TOP
    const backToTopBtn = document.querySelector('#back-to-top-btn');
    window.addEventListener('scroll', () => {
        if(backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 300);
    });
});