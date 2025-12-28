// erp/employee-profile.js

document.addEventListener('DOMContentLoaded', async () => {
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    // --- State Variable ---
    let currentEmployee = null; // To store the full employee object

    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const employeeDbId = urlParams.get('id');

    if (!employeeDbId) {
        document.getElementById('profile-name').textContent = "Employee not found";
        return;
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // --- Get DOM Elements ---
    const docUploadForm = document.getElementById('document-upload-form');
    const docsTableBody = document.getElementById('documents-table-body');
    const uploadStatusEl = document.getElementById('upload-status');
    const assignProjectBtn = document.getElementById('assign-project-btn');
    const assignmentModal = document.getElementById('assignment-modal');
    const assignmentCloseBtn = document.getElementById('assignment-modal-close-btn');
    const assignmentForm = document.getElementById('assignment-form');
    const projectSelect = document.getElementById('project-select');
    const historyContainer = document.getElementById('tab-pane-history');

    // --- Main Data Loading Function ---
    async function loadProfileData() {
        const { data: employee, error } = await _supabase.from('employees').select('*').eq('id', employeeDbId).single();
        if (error || !employee) {
            document.getElementById('profile-name').textContent = "Error loading profile";
            return;
        }

        currentEmployee = employee;
        
        document.title = `${employee.full_name} - Profile`;
        document.getElementById('profile-name').textContent = employee.full_name;
        document.getElementById('profile-designation').textContent = `${employee.designation || 'N/A'} (${employee.employee_id})`;
        const statusBadge = document.getElementById('profile-status');
        statusBadge.textContent = employee.is_active ? 'Active' : 'Inactive';
        statusBadge.style.background = employee.is_active ? '#dcfce7' : '#fee2e2';
        statusBadge.style.color = employee.is_active ? '#15803d' : '#b91c1c';
        const infoContainer = document.getElementById('tab-pane-info');
        infoContainer.innerHTML = `<div class="detail-item"><strong>Phone:</strong> <span>${employee.phone}</span></div><div class="detail-item"><strong>Email:</strong> <span>${employee.email || 'N/A'}</span></div><div class="detail-item"><strong>Date of Joining:</strong> <span>${formatDate(employee.date_of_joining)}</span></div><div class="detail-item"><strong>Date of Birth:</strong> <span>${formatDate(employee.date_of_birth)}</span></div><div class="detail-item"><strong>Employment Type:</strong> <span>${employee.employment_type}</span></div>`;

        // ==========================================================
        // --- NEW LOGIC TO LOAD AND DISPLAY PROFILE PICTURE ---
        // ==========================================================
        const { data: photoDoc } = await _supabase
            .from('employee_documents')
            .select('file_path')
            .eq('employee_id', employeeDbId)
            .eq('doc_type', 'Photo')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

        const avatarDiv = document.getElementById('profile-avatar');
        if (photoDoc && photoDoc.file_path) {
            const { data: urlData } = _supabase.storage
                .from('employee-documents')
                .getPublicUrl(photoDoc.file_path);

            if (urlData && urlData.publicUrl) {
                // If a photo exists, clear the icon and set the background image
                avatarDiv.innerHTML = '';
                avatarDiv.style.backgroundImage = `url('${urlData.publicUrl}')`;
                avatarDiv.style.backgroundSize = 'cover';
                avatarDiv.style.backgroundPosition = 'center';
            }
        }
        // If no photo is found, the default icon from the HTML will be shown automatically.
        // ==========================================================

        loadProjectHistory();
        loadDocuments();
    }

    async function loadProjectHistory() {
        historyContainer.innerHTML = '<p>Loading history...</p>';
        const { data, error } = await _supabase.from('employee_assignments').select('*, erp_projects(project_name)').eq('employee_id', employeeDbId).order('assignment_date', { ascending: false });
        if (error) { historyContainer.innerHTML = '<p style="color:red;">Could not load project history.</p>'; return; }
        if (data.length === 0) { historyContainer.innerHTML = '<p>This employee has not been assigned to any projects yet.</p>'; return; }
        let tableHtml = `<table id="history-table"><thead><tr><th>Project Name</th><th>Role</th><th>Assigned Date</th></tr></thead><tbody>`;
        data.forEach(asgn => { tableHtml += `<tr><td>${asgn.erp_projects.project_name}</td><td>${asgn.role_on_project || 'N/A'}</td><td>${formatDate(asgn.assignment_date)}</td></tr>`; });
        tableHtml += `</tbody></table>`;
        historyContainer.innerHTML = tableHtml;
    }
    
    // --- Document Management Functions ---
    async function loadDocuments() {
        docsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>`;
        const { data, error } = await _supabase.from('employee_documents').select('*').eq('employee_id', employeeDbId).order('uploaded_at', { ascending: false });

        if (error) {
            console.error("Error loading documents from DB:", error);
            docsTableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Error loading documents. Check RLS policy.</td></tr>`;
            return;
        }

        if (data.length === 0) {
            docsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No documents uploaded yet.</td></tr>`;
            return;
        }

        docsTableBody.innerHTML = '';
        data.forEach(doc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${doc.doc_type}</td>
                <td>${formatDate(doc.uploaded_at)}</td>
                <td class="action-buttons">
                    <button class="btn-secondary btn-icon view-btn" data-path="${doc.file_path}" title="View"><i class="fas fa-external-link-alt"></i></button>
                    <button class="btn-danger btn-icon delete-btn" data-id="${doc.id}" data-path="${doc.file_path}" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            docsTableBody.appendChild(tr);
        });
    }

    async function handleDocumentUpload(e) {
        e.preventDefault();
        const fileInput = document.getElementById('file-upload');
        const docType = document.getElementById('doc-type').value;
        const file = fileInput.files[0];

        if (!file) { alert("Please select a file to upload."); return; }
        if (!currentEmployee || !currentEmployee.employee_id) {
            alert("Employee data not loaded correctly. Please refresh.");
            return;
        }
        
        const MAX_SIZE_MB = 5;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            uploadStatusEl.textContent = `Error: File is too large. Maximum size is ${MAX_SIZE_MB}MB.`;
            uploadStatusEl.className = 'status-message error';
            uploadStatusEl.style.display = 'block';
            fileInput.value = '';
            return;
        }

        uploadStatusEl.textContent = 'Uploading...';
        uploadStatusEl.className = 'status-message';
        uploadStatusEl.style.display = 'block';

        const fileExt = file.name.split('.').pop();
        const filePath = `${currentEmployee.employee_id}/${docType}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await _supabase.storage
            .from('employee-documents')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Storage Upload Error:", uploadError);
            let userMessage = `Upload Error: ${uploadError.message}.`;
            if (uploadError.message.includes('size')) {
                userMessage = "Error: The file exceeded the maximum allowed size. Please increase the limit in your Supabase bucket settings.";
            } else {
                 userMessage += " Check Storage RLS policies.";
            }
            uploadStatusEl.textContent = userMessage;
            uploadStatusEl.className = 'status-message error';
            return;
        }

        const { error: dbError } = await _supabase.from('employee_documents').insert({
            employee_id: employeeDbId,
            doc_type: docType,
            file_path: filePath
        });

        if (dbError) {
            console.error("Database Insert Error:", dbError);
            uploadStatusEl.textContent = `DB Error: ${dbError.message}. Check Table RLS policies.`;
            uploadStatusEl.className = 'status-message error';
        } else {
            uploadStatusEl.textContent = 'Upload successful!';
            uploadStatusEl.className = 'status-message success';
            docUploadForm.reset();
            loadDocuments();
            // If the uploaded file was a Photo, refresh the whole profile to show it
            if (docType === 'Photo') {
                loadProfileData();
            }
        }
    }

    async function handleDocumentAction(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const path = button.dataset.path;
        
        if (button.classList.contains('view-btn')) {
            const { data } = _supabase.storage.from('employee-documents').getPublicUrl(path);
            if (data && data.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else {
                alert('Could not get public URL for this file.');
            }
        }

        if (button.classList.contains('delete-btn')) {
            if (confirm("Are you sure you want to permanently delete this document?")) {
                const docId = button.dataset.id;
                await _supabase.storage.from('employee-documents').remove([path]);
                await _supabase.from('employee_documents').delete().eq('id', docId);
                loadDocuments();
                // If the deleted file was a Photo, refresh the whole profile to revert to the icon
                if (path.includes('/Photo_')) {
                    // Revert avatar to default icon state
                    const avatarDiv = document.getElementById('profile-avatar');
                    avatarDiv.style.backgroundImage = 'none';
                    avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
                }
            }
        }
    }
    
    // --- Modal Functions ---
    async function openAssignmentModal() {
        const { data: projects } = await _supabase.from('erp_projects').select('id, project_name').eq('status', 'Active');
        projectSelect.innerHTML = '<option value="">Select a project</option>';
        if (projects) {
            projects.forEach(p => { projectSelect.innerHTML += `<option value="${p.id}">${p.project_name}</option>`; });
        }
        assignmentModal.classList.add('active');
    }
    function closeAssignmentModal() {
        assignmentModal.classList.remove('active');
    }

    async function handleAssignmentSubmit(e) {
        e.preventDefault();
        const projectId = projectSelect.value;
        const role = document.getElementById('role-on-project').value;
        if (!projectId) return;
        const { error } = await _supabase.from('employee_assignments').insert([{ employee_id: employeeDbId, project_id: projectId, role_on_project: role }]);
        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            closeAssignmentModal();
            loadProjectHistory();
        }
    }
    
    // --- Tab Switching Logic ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`tab-pane-${button.dataset.tab}`).classList.add('active');
        });
    });
    
    // --- Event Listeners ---
    docUploadForm.addEventListener('submit', handleDocumentUpload);
    docsTableBody.addEventListener('click', handleDocumentAction);
    assignProjectBtn.addEventListener('click', openAssignmentModal);
    assignmentCloseBtn.addEventListener('click', closeAssignmentModal);
    assignmentModal.addEventListener('click', (e) => {
        if (e.target === assignmentModal) closeAssignmentModal();
    });
    assignmentForm.addEventListener('submit', handleAssignmentSubmit);
    
    // --- Initial Load ---
    loadProfileData();
});