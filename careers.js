/* ==================================================
   CAREERS PAGE SPECIFIC LOGIC
   Handles: Application Form & Status Checker
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // 1. SUPABASE CONFIGURATION
    const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';
    
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // =======================
    // JOB APPLICATION FORM
    // =======================
    const careerForm = document.querySelector('#career-form');
    const careerBtn = document.querySelector('#career-submit-btn');
    const careerThankYou = document.querySelector('#career-thank-you');
    const careerStatus = document.querySelector('#career-form-status');

    if (careerForm) {
        careerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            careerBtn.disabled = true;
            careerBtn.textContent = 'Uploading...';
            careerStatus.textContent = '';

            try {
                const formData = new FormData(careerForm);
                const file = document.getElementById('resume_upload').files[0];
                let resumeUrl = null;

                // A. Upload Resume
                if (file) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `resume_${Date.now()}.${fileExt}`; 
                    
                    const { error: uploadError } = await _supabase.storage
                        .from('contact_uploads')
                        .upload(fileName, file);

                    if (uploadError) throw new Error(`Resume upload failed: ${uploadError.message}`);
                    
                    const { data } = _supabase.storage
                        .from('contact_uploads')
                        .getPublicUrl(fileName);
                        
                    resumeUrl = data.publicUrl;
                }

                // B. Insert into Database
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

                // C. Success UI
                careerForm.style.display = 'none';
                if (careerThankYou) {
                    careerThankYou.style.display = 'block';
                    careerThankYou.classList.remove('hidden');
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
    const statusForm = document.getElementById('status-check-form');
    const statusResult = document.getElementById('status-result');
    const resultStatus = document.getElementById('result-status');
    const resultPosition = document.getElementById('result-position');

    if (statusForm) {
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
                // Call the Updated Secure Function
                const { data, error } = await _supabase
                    .rpc('check_application_status', { applicant_email: email });

                if (error) throw error;

                statusResult.style.display = 'block'; // Show result box

                if (data) {
                    // data is now an object: { status: "...", position: "..." }
                    
                    // Set Position Name
                    resultPosition.textContent = data.position;

                    // Status Color Logic
                    let color = '#2563eb'; // Blue (New)
                    let label = data.status;

                    switch(data.status) {
                        case 'Screening': color = '#c2410c'; break; // Orange
                        case 'Interview': color = '#7e22ce'; break; // Purple
                        case 'Shortlisted': color = '#eab308'; break; // Yellow
                        case 'Hired': color = '#16a34a'; break; // Green
                        case 'Rejected': color = '#ef4444'; break; // Red
                    }
                    
                    resultStatus.textContent = label;
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