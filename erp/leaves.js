// erp/leaves.js (Upgraded with auto-attendance marking)

document.addEventListener('DOMContentLoaded', () => {
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    
    let currentAdminId = null;

    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        currentAdminId = session.user.id;
        initializeApp();
    }

    function initializeApp() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tableBody = document.getElementById('leaves-table-body');
        const modal = document.getElementById('leave-action-modal');
        const closeModalBtn = modal.querySelector('.modal-close');
        const approveBtn = document.getElementById('approve-btn');
        const rejectBtn = document.getElementById('reject-btn');
        const requestIdInput = document.getElementById('request-id');
        const commentsInput = document.getElementById('admin-comments');
        const actionStatus = document.getElementById('action-status');
        
        let currentStatus = 'Pending';
        let allRequests = [];

        async function loadLeaveRequests(status) {
            currentStatus = status;
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>`;
            const { data, error } = await _supabase
                .from('leave_requests')
                .select(`id, start_date, end_date, reason, employees(full_name), leave_types(name)`) // Optimized query
                .eq('status', status)
                .order('created_at', { ascending: true });
            if (error) { tableBody.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>`; return; }
            allRequests = data;
            renderTable(data);
        }

        function renderTable(requests) {
            tableBody.innerHTML = '';
            if (requests.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No ${currentStatus.toLowerCase()} requests found.</td></tr>`;
                return;
            }
            requests.forEach(req => {
                const tr = document.createElement('tr');
                const startDate = new Date(req.start_date).toLocaleDateString('en-GB');
                const endDate = new Date(req.end_date).toLocaleDateString('en-GB');
                const actionButtonHtml = currentStatus === 'Pending'
                    ? `<button class="btn-primary process-btn" data-id="${req.id}">Process</button>`
                    : `<button class="btn-secondary revert-btn" data-id="${req.id}" title="Revert to Pending"><i class="fas fa-undo"></i> Revert</button>`;
                tr.innerHTML = `
                    <td>${req.employees.full_name}</td>
                    <td>${req.leave_types.name}</td>
                    <td>${startDate} to ${endDate}</td>
                    <td>${req.reason || 'N/A'}</td>
                    <td class="action-buttons">${actionButtonHtml}</td>`;
                tableBody.appendChild(tr);
            });
        }

        function openActionModal(requestId) {
            requestIdInput.value = requestId;
            commentsInput.value = '';
            actionStatus.style.display = 'none';
            modal.classList.add('active');
        }

        function closeActionModal() {
            modal.classList.remove('active');
        }

        // ==========================================================
        // --- THIS IS THE UPGRADED FUNCTION ---
        // ==========================================================
        // Replace the entire handleAction function in erp/leaves.js

async function handleAction(newStatus) {
    const requestId = requestIdInput.value;
    const comments = commentsInput.value;
    const originalApproveText = approveBtn.innerHTML;
    const originalRejectText = rejectBtn.innerHTML;

    approveBtn.disabled = true;
    rejectBtn.disabled = true;
    actionStatus.style.display = 'none';

    if (newStatus === 'Approved') {
        approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
    } else {
        rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
    }
    
    try {
        const { error: updateError } = await _supabase
            .from('leave_requests')
            .update({ status: newStatus, comments: comments, approved_by: currentAdminId })
            .eq('id', requestId);

        if (updateError) throw updateError;

        if (newStatus === 'Approved') {
            approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking Attendance...';
            
            const request = allRequests.find(r => r.id == requestId);
            if (!request) throw new Error("Could not find leave request details.");

            const { data: emp, error: empError } = await _supabase.from('leave_requests').select('employee_id').eq('id', requestId).single();
            if(empError) throw empError;

            // ==========================================================
            // --- NEW, SIMPLIFIED, AND CORRECT LOOPING LOGIC ---
            // ==========================================================
            const attendanceRecords = [];
            
            // Use UTC to prevent timezone shifts.
            const startDate = new Date(request.start_date + 'T12:00:00Z'); // Use noon UTC
            const endDate = new Date(request.end_date + 'T12:00:00Z');   // Use noon UTC

            // Clone the start date for the loop
            let loopDate = new Date(startDate);

            while (loopDate <= endDate) {
                attendanceRecords.push({
                    employee_id: emp.employee_id,
                    // Format the date to YYYY-MM-DD string
                    attendance_date: loopDate.toISOString().split('T')[0],
                    status: 'Leave',
                    remarks: `Approved leave (${request.leave_types.name})`,
                    marked_by_user_id: currentAdminId,
                    leave_request_id: requestId
                });
                
                // Increment the day
                loopDate.setDate(loopDate.getDate() + 1);
            }
            // ==========================================================
            
            if (attendanceRecords.length > 0) {
                const { error: attendanceError } = await _supabase
                    .from('attendance')
                    .upsert(attendanceRecords, { onConflict: 'employee_id, attendance_date' });
                
                if (attendanceError) throw attendanceError;
            }
        }
        
        closeActionModal();
        loadLeaveRequests(currentStatus);

    } catch (err) {
        actionStatus.textContent = `Error: ${err.message}`;
        actionStatus.className = 'status-message error';
        actionStatus.style.display = 'block';
    } finally {
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        approveBtn.innerHTML = originalApproveText;
        rejectBtn.innerHTML = originalRejectText;
    }
}
        // ==========================================================


        async function handleRevert(requestId, buttonElement) {
            if (!confirm("Are you sure you want to revert this leave request back to 'Pending'? This will also delete the associated 'Leave' entries from the attendance sheet.")) {
                return;
            }

            const originalButtonHtml = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                // --- NEW: Delete attendance records linked to this leave request ---
                const { error: attendanceError } = await _supabase
                    .from('attendance')
                    .delete()
                    .eq('leave_request_id', requestId);
                
                if (attendanceError) throw attendanceError;
                
                // Now, revert the leave request status
                const { error } = await _supabase
                    .from('leave_requests')
                    .update({ status: 'Pending', comments: 'Reverted by admin.', approved_by: null })
                    .eq('id', requestId);

                if (error) throw error;
                loadLeaveRequests(currentStatus);
            } catch (err) {
                alert(`Error reverting leave: ${err.message}`);
                buttonElement.disabled = false;
                buttonElement.innerHTML = originalButtonHtml;
            }
        }
        
        // --- Event Listeners ---
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadLeaveRequests(btn.dataset.status);
            });
        });

        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            if (button.classList.contains('process-btn')) {
                openActionModal(button.dataset.id);
            } else if (button.classList.contains('revert-btn')) {
                handleRevert(button.dataset.id, button);
            }
        });

        approveBtn.addEventListener('click', () => handleAction('Approved'));
        rejectBtn.addEventListener('click', () => handleAction('Rejected'));
        closeModalBtn.addEventListener('click', closeActionModal);
        
        // Initial Load
        loadLeaveRequests('Pending');
    }

    checkAuthAndLoad();
});