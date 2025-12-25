// careers.js - Public facing logic for the careers page

document.addEventListener('DOMContentLoaded', () => {
    // 1. SUPABASE CONFIGURATION
    const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';
    
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // =======================
    // LOAD PUBLIC JOB POSTINGS
    // =======================
    // REPLACE the existing loadJobPostings function in careers.js

async function loadJobPostings() {
    const container = document.querySelector('.job-list');
    const positionDropdown = document.querySelector('select[name="position"]');

    if (!container || !positionDropdown) return;
    
    container.innerHTML = '<p style="text-align: center;">Loading openings...</p>';
    
    try {
        const { data: activeJobs, error } = await _supabase
            .from('job_postings')
            .select('title') // We only need the title for this
            .eq('is_active', true)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // --- 1. POPULATE THE DROPDOWN DYNAMICALLY ---
        positionDropdown.innerHTML = '<option value="" disabled selected>Position Applying For</option>'; // Reset
        activeJobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.title;
            option.textContent = job.title;
            positionDropdown.appendChild(option);
        });
        // Add the general application option at the end
        positionDropdown.innerHTML += '<option value="General Application">General Application</option>';
        
        // --- 2. RENDER THE JOB CARDS on the page ---
        // (We re-fetch here to get all data, or you can modify the first query to get all columns)
        const { data: allJobData, error: allDataError } = await _supabase
            .from('job_postings')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (allDataError) throw allDataError;

        container.innerHTML = ''; // Clear loading message
        
        if (allJobData.length === 0) {
            container.innerHTML =`
                <div style="text-align: center; background: #fff; padding: 40px; border-radius: 12px; border: 1px dashed #e2e8f0;">
                        <h3 style="color: var(--brand-navy); font-size: 1.5rem; margin-bottom: 10px;">We're Always Looking for Talent</h3>
                        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 25px auto;">
                            While there are no specific openings at this moment, we are always interested in connecting with passionate professionals. If you believe your skills would be a great fit for our team, we encourage you to submit a general application.
                        </p>
                        <a href="#apply" class="btn btn-primary">Submit a General Application</a>
                    </div>
                    `;
            return;
        }
        
        // ... inside the allJobData.forEach(post => { ... }) loop

        allJobData.forEach(post => {
            const card = document.createElement('div');
            card.className = 'job-card';
            
            // --- NEW: Process description into a list ---
            let descriptionHtml = '';
            if (post.description) {
                const points = post.description.split('\n').filter(p => p.trim() !== '');
                if (points.length > 1) {
                    // If there are multiple lines, create a <ul> list
                    descriptionHtml = '<ul class="job-description-list">';
                    points.forEach(point => {
                        descriptionHtml += `<li>${point}</li>`;
                    });
                    descriptionHtml += '</ul>';
                } else {
                    // If it's just one line, render it as a paragraph
                    descriptionHtml = `<p>${post.description}</p>`;
                }
            }
            // --- END of new code ---

            card.innerHTML = `
                <div class="job-info">
                    <h3>${post.title}</h3>
                    <p class="job-meta">
                        <i class="fas fa-map-marker-alt"></i> ${post.location} &nbsp;|&nbsp; 
                        <i class="fas fa-clock"></i> ${post.job_type}
                    </p>
                    ${descriptionHtml}
                </div>
                <a href="#apply" class="btn btn-secondary apply-now-btn" data-position="${post.title}">Apply Now</a>
            `;
            container.appendChild(card);
        });
// ...
        
        // --- 3. ADD EVENT LISTENERS TO THE NEW BUTTONS ---
        document.querySelectorAll('.apply-now-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const position = e.target.dataset.position;
                if (position) {
                    positionDropdown.value = position;
                }
            });
        });

    } catch (err) {
        container.innerHTML = '<p style="text-align: center; color: red;">Could not load job openings. Please try again later.</p>';
        positionDropdown.innerHTML = '<option value="">Could not load positions</option>';
    }
}

    loadJobPostings();


    // =======================
    // JOB APPLICATION FORM
    // =======================
    // (Your existing code from the old careers.js)
    const careerForm = document.querySelector('#career-form');
    if (careerForm) {
        // ... (The rest of your existing career form submission logic)
        const careerBtn = document.querySelector('#career-submit-btn');
        const careerThankYou = document.querySelector('#career-thank-you');
        const careerStatus = document.querySelector('#career-form-status');

        careerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            careerBtn.disabled = true;
            careerBtn.textContent = 'Uploading...';
            careerStatus.textContent = '';

            try {
                const formData = new FormData(careerForm);
                const file = document.getElementById('resume_upload').files[0];
                let resumeUrl = null;

                if (file) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `resumes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; 
                    
                    const { error: uploadError } = await _supabase.storage
                        .from('contact_uploads') // Make sure this bucket allows uploads
                        .upload(fileName, file);

                    if (uploadError) throw new Error(`Resume upload failed: ${uploadError.message}`);
                    
                    const { data } = _supabase.storage
                        .from('contact_uploads')
                        .getPublicUrl(fileName);
                        
                    resumeUrl = data.publicUrl;
                }

                const { error: dbError } = await _supabase
                    .from('job_applications')
                    .insert([{
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        position: formData.get('position'),
                        message: formData.get('message'),
                        resume_url: resumeUrl,
                        status: 'New'
                    }]);

                if (dbError) throw new Error(dbError.message);

                careerForm.style.display = 'none';
                if (careerThankYou) {
                    careerThankYou.style.display = 'block';
                }

            } catch (error) {
                console.error(error);
                careerStatus.textContent = `Error: ${error.message}`;
                careerStatus.style.color = 'red';
                careerBtn.disabled = false;
                careerBtn.textContent = 'Submit Application';
            }
        });
    }

    // =======================
    // APPLICATION STATUS CHECKER
    // =======================
    // (Your existing code from the old careers.js)
    const statusForm = document.getElementById('status-check-form');
    if (statusForm) {
        // ... (The rest of your existing status checker logic)
        const statusResult = document.getElementById('status-result');
        const resultStatus = document.getElementById('result-status');
        const resultPosition = document.getElementById('result-position');
        
        statusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('check-email');
            const email = emailInput.value.trim();
            const btn = statusForm.querySelector('button');
            const originalText = btn.textContent;

            if (!email) return;

            btn.disabled = true;
            btn.textContent = 'Searching...';
            statusResult.style.display = 'none';

            try {
                const { data, error } = await _supabase
                    .rpc('check_application_status', { applicant_email: email });

                if (error) throw error;

                statusResult.style.display = 'block';

                if (data) {
                    resultPosition.textContent = data.position;
                    let color = '#2563eb';
                    switch(data.status) {
                        case 'Screening': color = '#c2410c'; break;
                        case 'Interview': color = '#7e22ce'; break;
                        case 'Shortlisted': color = '#eab308'; break;
                        case 'Hired': color = '#16a34a'; break;
                        case 'Rejected': color = '#ef4444'; break;
                    }
                    resultStatus.textContent = data.status;
                    resultStatus.style.color = color;
                } else {
                    resultPosition.textContent = "-";
                    resultStatus.textContent = "Application Not Found";
                    resultStatus.style.color = '#64748b';
                }

            } catch (err) {
                console.error("Error checking status:", err);
                alert("Error checking status. Please check your connection.");
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
});