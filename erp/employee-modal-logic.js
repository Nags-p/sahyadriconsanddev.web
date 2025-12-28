// This file will be loaded after the modal HTML is injected into the page.

// --- 1. DEFINE ELEMENTS AND INITIALIZE ---
const employeeModal = document.getElementById('employee-modal');
const closeModalBtn = document.getElementById('modal-close-btn');
const employeeForm = document.getElementById('employee-form');
const formStatus = document.getElementById('form-status');
const modalTitle = document.getElementById('modal-title');

// Store the callback function to refresh the page data after a successful save
let _onSuccessCallback = null;

// --- 2. DEFINE MODAL FUNCTIONS (These are now globally accessible) ---

/**
 * Opens the universal employee modal.
 * @param {object|null} employee - The employee object to edit, or null to add a new one.
 * @param {function|null} callbackOnSuccess - The function to call after a successful save (e.g., to refresh a table).
 */
function openModal(employee = null, callbackOnSuccess = null) {
    _onSuccessCallback = callbackOnSuccess; // Store the callback

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
        document.getElementById('address').value = employee.address || '';
        document.getElementById('emergency_contact_number').value = employee.emergency_contact_number || '';
        employeeForm.dataset.employeeId = employee.id;
    } else {
        modalTitle.textContent = "Add New Employee";
        delete employeeForm.dataset.employeeId;
    }
    employeeModal.classList.add('active');
}

function closeModal() {
    employeeModal.classList.remove('active');
    _onSuccessCallback = null; // Clear callback when closing
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-employee-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const formData = new FormData(employeeForm);
    const employeeData = Object.fromEntries(formData.entries());
    const employeeDbId = employeeForm.dataset.employeeId;
    
    // Sanitize data
    if (!employeeData.email) employeeData.email = null;
    if (!employeeData.date_of_birth) employeeData.date_of_birth = null;
    if (!employeeData.designation) employeeData.designation = null;
    if (!employeeData.address) employeeData.address = null;
    if (!employeeData.emergency_contact_number) employeeData.emergency_contact_number = null;

    // ==========================================================
    // --- THIS IS THE CORRECTED LOGIC ---
    // ==========================================================
    let result;
    
    // This assumes _supabase is globally available from a script loaded before this one
    if (employeeDbId) {
        // When UPDATING, chain .select() to get the updated data back for confirmation.
        result = await _supabase
            .from('employees')
            .update(employeeData)
            .eq('id', employeeDbId)
            .select();
    } else {
        // When INSERTING, .select() is also useful to get the newly created record.
        result = await _supabase
            .from('employees')
            .insert([employeeData])
            .select();
    }

    const error = result.error;
    const data = result.data;
    // ==========================================================
    // --- END OF CORRECTION ---
    // ==========================================================


    if (error || !data || data.length === 0) {
        const errorMessage = error ? error.message : "Operation failed. No rows were updated. Please check permissions (RLS).";
        formStatus.textContent = `Error: ${errorMessage}`;
        formStatus.className = 'status-message error';
        formStatus.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    } else {
        closeModal();
        // If a callback was provided, execute it to refresh the page data
        if (_onSuccessCallback) {
            _onSuccessCallback();
        }
    }
}

// --- 3. ATTACH EVENT LISTENERS ---
closeModalBtn.addEventListener('click', closeModal);
employeeModal.addEventListener('click', (event) => {
    if (event.target === employeeModal) closeModal();
});
employeeForm.addEventListener('submit', handleFormSubmit);