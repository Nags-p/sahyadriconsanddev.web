// portal/leaves.js

function initializeLeaveTab(supabase, employeeSession) {
    const leaveApplyForm = document.getElementById('leave-apply-form');
    if (leaveApplyForm) {
        leaveApplyForm.addEventListener('submit', (e) => handleLeaveApply(e, supabase, employeeSession));
    }
    loadLeaveData(supabase, employeeSession);
}

async function loadLeaveData(supabase, employeeSession) {
    loadLeaveBalances(supabase);
    loadLeaveHistory(supabase, employeeSession);
    loadLeaveTypesForForm(supabase);
}

async function loadLeaveBalances(supabase) {
    const container = document.getElementById('leave-balances-container');
    container.innerHTML = 'Loading balances...';
    const { data, error } = await supabase.from('leave_types').select('name, default_balance');
    if (error) { container.innerHTML = `<p style="color:red">Error loading balances</p>`; return; }
    container.innerHTML = data.map(lt => `<div class="balance-card"><span>${lt.name}</span><span class="balance-value">${lt.default_balance}</span></div>`).join('');
}

async function loadLeaveHistory(supabase, employeeSession) {
    const container = document.getElementById('leave-history-table');
    container.innerHTML = 'Loading history...';
    const { data, error } = await supabase.from('leave_requests').select(`*, leave_types(name)`).eq('employee_id', employeeSession.id).order('created_at', { ascending: false });
    if (error) { container.innerHTML = `<p style="color:red">Error loading leave history.</p>`; return; }
    if (data.length === 0) { container.innerHTML = '<p>You have not applied for any leaves yet.</p>'; return; }
    let tableHtml = `<table class="payslips-table"><thead><tr><th>Type</th><th>Dates</th><th>Status</th></tr></thead><tbody>`;
    data.forEach(req => {
        tableHtml += `<tr><td>${req.leave_types.name}</td><td>${new Date(req.start_date).toLocaleDateString('en-GB')} - ${new Date(req.end_date).toLocaleDateString('en-GB')}</td><td>${req.status}</td></tr>`;
    });
    container.innerHTML = tableHtml + `</tbody></table>`;
}

async function loadLeaveTypesForForm(supabase) {
    const select = document.getElementById('leave-type');
    const { data } = await supabase.from('leave_types').select('id, name');
    if (data) select.innerHTML = data.map(lt => `<option value="${lt.id}">${lt.name}</option>`).join('');
}

async function handleLeaveApply(e, supabase, employeeSession) {
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