document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION ---
    const { createClient } = supabase;
    // This creates the global instance for all other scripts to use
    window._supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    
    // --- 2. AUTHENTICATION CHECK ---
    async function checkAuthAndLoad() {
        const { data: { session } } = await window._supabase.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return; 
        }
        initializeApp();
    }

    // --- 3. MAIN APP LOGIC ---
    function initializeApp() {
        const employeesTableBody = document.getElementById('employees-table-body');
        const addEmployeeBtn = document.getElementById('add-employee-btn');
        const employeeSearchInput = document.getElementById('employee-search');

        async function loadEmployees() {
            employeesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
            const { data, error } = await window._supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching employees:', error);
                employeesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error fetching data: ${error.message}</td></tr>`;
                return;
            }
            allEmployees = data;
            renderEmployeeTable(allEmployees);

            const urlParams = new URLSearchParams(window.location.search);
            const employeeIdToEdit = urlParams.get('edit');

            if (employeeIdToEdit) {
                const employeeToEdit = allEmployees.find(e => e.id === employeeIdToEdit);
                if (employeeToEdit) {
                    openModal(employeeToEdit, loadEmployees); // Pass callback
                }
                history.replaceState(null, '', window.location.pathname);
            }
        }

        function renderEmployeeTable(employees) {
            employeesTableBody.innerHTML = '';
            if (employees.length === 0) {
                employeesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No employees found.</td></tr>`;
                return;
            }
            employees.forEach(employee => {
                const tr = document.createElement('tr');
                if (!employee.is_active) {
                    tr.style.opacity = '0.5';
                }

                const statusBadge = employee.is_active
                    ? `<span class="status-badge" style="background:#dcfce7; color:#15803d;">Active</span>`
                    : `<span class="status-badge" style="background:#fee2e2; color:#b91c1c;">Inactive</span>`;

                const toggleStatusBtn = employee.is_active
                    ? `<button class="btn-danger btn-icon deactivate-btn" data-id="${employee.id}" title="Deactivate Employee"><i class="fas fa-user-slash"></i></button>`
                    : `<button class="btn-success btn-icon activate-btn" data-id="${employee.id}" title="Reactivate Employee"><i class="fas fa-user-check"></i></button>`;

                tr.innerHTML = `
                    <td><strong>${employee.employee_id}</strong></td>
                    <td>${employee.full_name}</td>
                    <td>${employee.designation || 'N/A'}</td>
                    <td>${employee.employment_type}</td>
                    <td>${employee.phone}</td>
                    <td>${statusBadge}</td>
                    <td class="action-buttons">
                        <a href="employee-profile.html?id=${employee.id}" class="btn-info btn-icon" title="View Profile"><i class="fas fa-eye"></i></a>
                        <button class="btn-secondary btn-icon edit-btn" data-id="${employee.id}" title="Edit"><i class="fas fa-edit"></i></button>
                        ${toggleStatusBtn}
                    </td>
                `;
                employeesTableBody.appendChild(tr);
            });
        }

        function handleSearch() {
            const searchTerm = employeeSearchInput.value.toLowerCase();
            const filteredEmployees = allEmployees.filter(employee => {
                return (
                    employee.full_name.toLowerCase().includes(searchTerm) ||
                    employee.employee_id.toLowerCase().includes(searchTerm) ||
                    employee.phone.includes(searchTerm)
                );
            });
            renderEmployeeTable(filteredEmployees);
        }

        async function toggleEmployeeStatus(employeeId, newStatus) {
            const employee = allEmployees.find(e => e.id === employeeId);
            const action = newStatus ? 'Reactivate' : 'Deactivate';

            if (confirm(`Are you sure you want to ${action} ${employee.full_name}?`)) {
                const { error } = await window._supabase
                    .from('employees')
                    .update({ is_active: newStatus })
                    .eq('id', employeeId);

                if (error) {
                    alert(`Error: ${error.message}`);
                } else {
                    loadEmployees();
                }
            }
        }

        function handleTableClick(event) {
            const target = event.target.closest('button, a');
            if (!target) return;

            const employeeId = target.dataset.id;
            
            if (target.classList.contains('edit-btn')) {
                const employee = allEmployees.find(e => e.id == employeeId);
                openModal(employee, loadEmployees);
            } else if (target.classList.contains('deactivate-btn')) {
                toggleEmployeeStatus(employeeId, false);
            } else if (target.classList.contains('activate-btn')) {
                toggleEmployeeStatus(employeeId, true);
            }
        }

        // --- Event Listeners ---
        addEmployeeBtn.addEventListener('click', () => openModal(null, loadEmployees));
        employeeSearchInput.addEventListener('keyup', handleSearch);
        employeesTableBody.addEventListener('click', handleTableClick);

        // --- Initial Data Load ---
        loadEmployees();
    }

    // --- 4. START THE APP ---
    checkAuthAndLoad();
});