// This file will be loaded after the modal HTML is injected into the page.

// --- 1. DEFINE ELEMENTS AND INITIALIZE ---
const employeeModal = document.getElementById('employee-modal');
const closeModalBtn = document.getElementById('modal-close-btn');
const employeeForm = document.getElementById('employee-form');
const formStatus = document.getElementById('form-status');
const modalTitle = document.getElementById('modal-title');

let _onSuccessCallback = null;

// --- 2. DEFINE MODAL FUNCTIONS ---
function openModal(employee = null, callbackOnSuccess = null) {
    _onSuccessCallback = callbackOnSuccess;

    formStatus.style.display = 'none';
    employeeForm.reset();
    const saveBtn = document.getElementById('save-employee-btn');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';

    if (employee) {
        modalTitle.textContent = "Edit Employee";
        // Personal & Job Info
        document.getElementById('employee_id').value = employee.employee_id;
        document.getElementById('full_name').value = employee.full_name;
        document.getElementById('phone').value = employee.phone;
        document.getElementById('email').value = employee.email;
        document.getElementById('date_of_joining').value = employee.date_of_joining;
        document.getElementById('date_of_birth').value = employee.date_of_birth;
        document.getElementById('designation').value = employee.designation;
        document.getElementById('employment_type').value = employee.employment_type;
        document.getElementById('address').value = employee.address || '';
        document.getElementById('emergency_contact_number').value = employee.emergency_contact_number || '';
        document.getElementById('gross_salary').value = employee.gross_salary || '';

        // Bank Info
        document.getElementById('bank_account_holder_name').value = employee.bank_account_holder_name || '';
        document.getElementById('bank_account_number').value = employee.bank_account_number || '';
        document.getElementById('bank_ifsc_code').value = employee.bank_ifsc_code || '';
        
        employeeForm.dataset.employeeId = employee.id;
    } else {
        modalTitle.textContent = "Add New Employee";
        delete employeeForm.dataset.employeeId;
    }
    employeeModal.classList.add('active');
}

function closeModal() {
    employeeModal.classList.remove('active');
    _onSuccessCallback = null;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-employee-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const formData = new FormData(employeeForm);
    const employeeData = Object.fromEntries(formData.entries());
    const employeeDbId = employeeForm.dataset.employeeId;
    
    // Sanitize data (set empty strings to null)
    Object.keys(employeeData).forEach(key => {
        if (employeeData[key] === '') {
            employeeData[key] = null;
        }
    });
    // Ensure salary is a number
    employeeData.gross_salary = employeeData.gross_salary ? parseFloat(employeeData.gross_salary) : null;

    let result;
    
    if (employeeDbId) {
        result = await _supabase.from('employees').update(employeeData).eq('id', employeeDbId).select();
    } else {
        result = await _supabase.from('employees').insert([employeeData]).select();
    }

    const { data, error } = result;

    if (error || !data || data.length === 0) {
        const errorMessage = error ? error.message : "Operation failed. No data was returned, check permissions (RLS).";
        formStatus.textContent = `Error: ${errorMessage}`;
        formStatus.className = 'status-message error';
        formStatus.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    } else {
        if (_onSuccessCallback) {
            _onSuccessCallback();
        }
        closeModal();
    }
}

// --- 3. ATTACH EVENT LISTENERS ---
closeModalBtn.addEventListener('click', closeModal);
employeeModal.addEventListener('click', (event) => {
    if (event.target === employeeModal) closeModal();
});
employeeForm.addEventListener('submit', handleFormSubmit);