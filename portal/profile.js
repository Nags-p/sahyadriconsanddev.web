// portal/profile.js

async function loadProfileData(supabase, employeeSession) {
    const container = document.getElementById('profile-details');
    container.innerHTML = `<p class="loading-placeholder">Loading profile...</p>`;
    try {
        const { data, error } = await supabase.rpc('get_employee_profile', { p_employee_id: employeeSession.id });
        if (error) throw error;
        const employee = data[0];
        const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'N/A';
        container.innerHTML = `
            <div class="detail-item"><strong>Phone:</strong> <span>${employee.phone || 'N/A'}</span></div>
            <div class="detail-item"><strong>Email:</strong> <span>${employee.email || 'N/A'}</span></div>
            <div class="detail-item"><strong>Emergency Contact:</strong> <span>${employee.emergency_contact_number || 'N/A'}</span></div>
            <div class="detail-item"><strong>Date of Joining:</strong> <span>${formatDate(employee.date_of_joining)}</span></div>
            <div class="detail-item"><strong>Employment Type:</strong> <span>${employee.employment_type || 'N/A'}</span></div>
            <div class="detail-item"><strong>Date of Birth:</strong> <span>${formatDate(employee.date_of_birth)}</span></div>
            <div class="detail-item detail-item-full"><strong>Address:</strong> <span>${employee.address || 'N/A'}</span></div>
            <div class="detail-item"><strong>Bank Account Holder:</strong> <span>${employee.bank_account_holder_name || 'N/A'}</span></div>
            <div class="detail-item"><strong>Bank Account Number:</strong> <span>${employee.bank_account_number || 'N/A'}</span></div>
            <div class="detail-item"><strong>Bank IFSC Code:</strong> <span>${employee.bank_ifsc_code || 'N/A'}</span></div>
        `;
    } catch (err) {
        container.innerHTML = `<p style="color: red;">Error loading profile: ${err.message}</p>`;
    }
}