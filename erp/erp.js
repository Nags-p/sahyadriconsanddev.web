document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION ---
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    let allEmployees = []; 
    
    // --- 2. AUTHENTICATION CHECK ---
    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
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
        const employeeModal = document.getElementById('employee-modal');
        const closeModalBtn = document.getElementById('modal-close-btn');
        const employeeForm = document.getElementById('employee-form');
        const formStatus = document.getElementById('form-status');
        const modalTitle = document.getElementById('modal-title');
        const employeeSearchInput = document.getElementById('employee-search');

        // --- Core Functions ---
        async function loadEmployees() {
            employeesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;
            const { data, error } = await _supabase
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

        function openModal(employee = null) {
            formStatus.style.display = 'none';
            employeeForm.reset();
            const saveBtn = document.getElementById('save-employee-btn');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';

            if (employee) {
                modalTitle.textContent = "Edit Employee";
                document.getElementById('employee_id').value = employee.employee_id;
                document.getElementById('full_name').value = employee.full_name;
                document.getElementById('phone').value = employee.phone;
                document.getElementById('email').value = employee.email;
                document.getElementById('date_of_joining').value = employee.date_of_joining;
                document.getElementById('date_of_birth').value = employee.date_of_birth;
                document.getElementById('designation').value = employee.designation;
                document.getElementById('employment_type').value = employee.employment_type;
                employeeForm.dataset.employeeId = employee.id;
            } else {
                modalTitle.textContent = "Add New Employee";
                delete employeeForm.dataset.employeeId;
            }
            employeeModal.classList.add('active');
        }

        function closeModal() {
            employeeModal.classList.remove('active');
        }
        
        async function handleFormSubmit(event) {
            event.preventDefault();
            const saveBtn = document.getElementById('save-employee-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            const formData = new FormData(employeeForm);
            const employeeData = Object.fromEntries(formData.entries());
            const employeeDbId = employeeForm.dataset.employeeId;
            if (!employeeData.email) employeeData.email = null;
            if (!employeeData.date_of_birth) employeeData.date_of_birth = null;
            if (!employeeData.designation) employeeData.designation = null;
            let error;
            if (employeeDbId) {
                const { error: updateError } = await _supabase.from('employees').update(employeeData).eq('id', employeeDbId);
                error = updateError;
            } else {
                const { error: insertError } = await _supabase.from('employees').insert([employeeData]);
                error = insertError;
            }
            if (error) {
                formStatus.textContent = `Error: ${error.message}`;
                formStatus.className = 'status-message error';
                formStatus.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            } else {
                closeModal();
                loadEmployees();
            }
        }

        async function toggleEmployeeStatus(employeeId, newStatus) {
            const employee = allEmployees.find(e => e.id === employeeId);
            const action = newStatus ? 'Reactivate' : 'Deactivate';

            if (confirm(`Are you sure you want to ${action} ${employee.full_name}?`)) {
                const { error } = await _supabase
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
            const target = event.target.closest('button, a'); // Also listen for clicks on anchor tags
            if (!target) return;

            const employeeId = target.dataset.id;

            if (target.classList.contains('edit-btn')) {
                const employee = allEmployees.find(e => e.id == employeeId);
                openModal(employee);
            } else if (target.classList.contains('deactivate-btn')) {
                toggleEmployeeStatus(employeeId, false);
            } else if (target.classList.contains('activate-btn')) {
                toggleEmployeeStatus(employeeId, true);
            }
            // The view button is now an anchor tag, so it will navigate automatically.
        }

        // --- Event Listeners ---
        addEmployeeBtn.addEventListener('click', () => openModal());
        closeModalBtn.addEventListener('click', closeModal);
        employeeModal.addEventListener('click', (event) => {
            if (event.target === employeeModal) closeModal();
        });
        employeeForm.addEventListener('submit', handleFormSubmit);
        employeeSearchInput.addEventListener('keyup', handleSearch);
        employeesTableBody.addEventListener('click', handleTableClick);

        // --- Initial Data Load ---
        loadEmployees();
    }

    // --- 4. START THE APP ---
    checkAuthAndLoad();
});