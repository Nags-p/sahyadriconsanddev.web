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
                .select(`*, employees(full_name), leave_types(name)`)
                .eq('status', status)
                .order('created_at', { ascending: true });

            if (error) {
                tableBody.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>`;
                return;
            }
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
                
                tr.innerHTML = `
                    <td>${req.employees.full_name}</td>
                    <td>${req.leave_types.name}</td>
                    <td>${startDate} to ${endDate}</td>
                    <td>${req.reason || 'N/A'}</td>
                    <td class="action-buttons">
                        ${currentStatus === 'Pending' ? `<button class="btn-primary process-btn" data-id="${req.id}">Process</button>` : 'N/A'}
                    </td>
                `;
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

        async function handleAction(newStatus) {
            const requestId = requestIdInput.value;
            const comments = commentsInput.value;
            
            const { error } = await _supabase
                .from('leave_requests')
                .update({ 
                    status: newStatus, 
                    comments: comments,
                    approved_by: currentAdminId 
                })
                .eq('id', requestId);

            if (error) {
                actionStatus.textContent = `Error: ${error.message}`;
                actionStatus.className = 'status-message error';
                actionStatus.style.display = 'block';
            } else {
                closeActionModal();
                loadLeaveRequests(currentStatus);
            }
        }

        // Event Listeners
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadLeaveRequests(btn.dataset.status);
            });
        });

        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('process-btn')) {
                openActionModal(e.target.dataset.id);
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