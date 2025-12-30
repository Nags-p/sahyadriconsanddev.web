// portal/leaves.js

function initializeLeaveTab(supabase, employeeSession) {
    const leaveApplyForm = document.getElementById('leave-apply-form');
    const leaveEditForm = document.getElementById('leave-edit-form');
    const historyTable = document.getElementById('leave-history-table');
    const editModal = document.getElementById('leave-edit-modal');
    const closeModalBtn = document.getElementById('leave-edit-modal-close-btn');
    const deleteBtn = document.getElementById('delete-leave-btn');

    if (leaveApplyForm) {
        leaveApplyForm.addEventListener('submit', (e) => handleLeaveApply(e, supabase, employeeSession));
    }

    // --- NEW: Event Listeners for the Edit Modal ---
    if (leaveEditForm) {
        leaveEditForm.addEventListener('submit', (e) => handleLeaveUpdate(e, supabase));
    }
    if (historyTable) {
        historyTable.addEventListener('click', (e) => handleHistoryTableClick(e, supabase, employeeSession));
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeLeaveEditModal);
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleLeaveDelete(supabase));
    }

    loadLeaveData(supabase, employeeSession);
}

async function loadLeaveData(supabase, employeeSession) {
    loadLeaveBalances(supabase);
    loadLeaveHistory(supabase, employeeSession);
    loadLeaveTypesForForm(supabase);
}

async function loadLeaveBalances(supabase) {
    // ... this function remains unchanged
    const container = document.getElementById('leave-balances-container');
    container.innerHTML = 'Loading balances...';
    const { data, error } = await supabase.from('leave_types').select('name, default_balance');
    if (error) { container.innerHTML = `<p style="color:red">Error loading balances</p>`; return; }
    container.innerHTML = data.map(lt => `<div class="balance-card"><span>${lt.name}</span><span class="balance-value">${lt.default_balance}</span></div>`).join('');
}

async function loadLeaveHistory(supabase, employeeSession) {
    // --- THIS FUNCTION IS UPDATED ---
    const container = document.getElementById('leave-history-table');
    container.innerHTML = 'Loading history...';
    const { data, error } = await supabase.from('leave_requests').select(`*, leave_types(name)`).eq('employee_id', employeeSession.id).order('created_at', { ascending: false });
    if (error) { container.innerHTML = `<p style="color:red">Error loading leave history.</p>`; return; }
    if (data.length === 0) { container.innerHTML = '<p>You have not applied for any leaves yet.</p>'; return; }

    let tableHtml = `<table class="payslips-table"><thead><tr><th>Type</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    data.forEach(req => {
        const actionButton = req.status === 'Pending'
            ? `<button class="btn-secondary edit-leave-btn" data-request-id="${req.id}" style="padding: 6px 10px; font-size: 0.8rem;"><i class="fas fa-edit"></i> Edit</button>`
            : `<span>-</span>`;

        tableHtml += `
            <tr data-request='${JSON.stringify(req)}'>
                <td>${req.leave_types.name}</td>
                <td>${new Date(req.start_date).toLocaleDateString('en-GB')} - ${new Date(req.end_date).toLocaleDateString('en-GB')}</td>
                <td>${req.status}</td>
                <td>${actionButton}</td>
            </tr>`;
    });
    container.innerHTML = tableHtml + `</tbody></table>`;
}

async function loadLeaveTypesForForm(supabase, targetSelectId = 'leave-type') {
    // --- THIS FUNCTION IS UPDATED to populate both forms ---
    const select = document.getElementById(targetSelectId);
    const { data } = await supabase.from('leave_types').select('id, name');
    if (data) {
        select.innerHTML = data.map(lt => `<option value="${lt.id}">${lt.name}</option>`).join('');
    }
}

async function handleLeaveApply(e, supabase, employeeSession) {
    // ... this function remains unchanged
    e.preventDefault();
    const form = e.target;
    const statusEl = document.getElementById('apply-status');
    const request = { 
        employee_id: employeeSession.id,
        leave_type_id: form.querySelector('#leave-type').value, 
        start_date: form.querySelector('#start-date').value, 
        end_date: form.querySelector('#end-date').value, 
        reason: form.querySelector('#reason').value 
    };
    const { error } = await supabase.from('leave_requests').insert([request]);
    if (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'status-message error';
    } else {
        statusEl.textContent = 'Leave request submitted successfully!';
        statusEl.className = 'status-message success';
        form.reset();
        loadLeaveHistory(supabase, employeeSession);
    }
    statusEl.style.display = 'block';
}

// --- NEW FUNCTIONS FOR THE EDIT MODAL ---

function handleHistoryTableClick(e, supabase, employeeSession) {
    const editButton = e.target.closest('.edit-leave-btn');
    if (editButton) {
        const row = editButton.closest('tr');
        const requestData = JSON.parse(row.dataset.request);
        openLeaveEditModal(requestData, supabase);
    }
}

function openLeaveEditModal(request, supabase) {
    const modal = document.getElementById('leave-edit-modal');
    document.getElementById('edit-request-id').value = request.id;
    document.getElementById('edit-start-date').value = request.start_date;
    document.getElementById('edit-end-date').value = request.end_date;
    document.getElementById('edit-reason').value = request.reason || '';

    // Populate and set the leave type dropdown
    const leaveTypeSelect = document.getElementById('edit-leave-type');
    loadLeaveTypesForForm(supabase, 'edit-leave-type').then(() => {
        leaveTypeSelect.value = request.leave_type_id;
    });
    
    modal.classList.add('active');
}

function closeLeaveEditModal() {
    const modal = document.getElementById('leave-edit-modal');
    modal.classList.remove('active');
}

async function handleLeaveUpdate(e, supabase) {
    e.preventDefault();
    const form = e.target;
    const statusEl = document.getElementById('edit-status');
    const requestId = document.getElementById('edit-request-id').value;
    const employeeSession = JSON.parse(sessionStorage.getItem('employeeSession'));

    const updatedRequest = {
        leave_type_id: form.querySelector('#edit-leave-type').value, 
        start_date: form.querySelector('#edit-start-date').value, 
        end_date: form.querySelector('#edit-end-date').value, 
        reason: form.querySelector('#edit-reason').value 
    };

    const { error } = await supabase
        .from('leave_requests')
        .update(updatedRequest)
        .eq('id', requestId);

    if (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'status-message error';
    } else {
        statusEl.textContent = 'Update successful!';
        statusEl.className = 'status-message success';
        loadLeaveHistory(supabase, employeeSession);
        setTimeout(closeLeaveEditModal, 1500); // Close modal after 1.5s
    }
    statusEl.style.display = 'block';
}

async function handleLeaveDelete(supabase) {
    const requestId = document.getElementById('edit-request-id').value;
    if (!confirm("Are you sure you want to cancel this leave request?")) {
        return;
    }
    
    const employeeSession = JSON.parse(sessionStorage.getItem('employeeSession'));

    const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId);

    if (error) {
        alert(`Error deleting request: ${error.message}`);
    } else {
        alert("Leave request cancelled successfully.");
        loadLeaveHistory(supabase, employeeSession);
        closeLeaveEditModal();
    }
}