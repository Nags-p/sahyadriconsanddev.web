// erp/employee-profile.js

document.addEventListener('DOMContentLoaded', async () => {
    // This check ensures _supabase is globally available for the modal logic script.
    if (!window._supabase) {
        const { createClient } = supabase;
        window._supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }

    // --- State Variable ---
    let currentEmployee = null;

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
        const infoContainer = document.getElementById('profile-details-container');
        infoContainer.innerHTML = `<div class="detail-item"><strong>Phone:</strong> <span>${employee.phone}</span></div>
            <div class="detail-item"><strong>Email:</strong> <span>${employee.email || 'N/A'}</span></div>
            <div class="detail-item"><strong>Date of Joining:</strong> <span>${formatDate(employee.date_of_joining)}</span></div>
            <div class="detail-item"><strong>Date of Birth:</strong> <span>${formatDate(employee.date_of_birth)}</span></div>
            <div class="detail-item"><strong>Employment Type:</strong> <span>${employee.employment_type}</span></div>
            <div class="detail-item"><strong>Address:</strong> <span>${employee.address || 'N/A'}</span></div>
            <div class="detail-item"><strong>Emergency Contact:</strong> <span>${employee.emergency_contact_number || 'N/A'}</span></div>`;

        // ==========================================================
        // --- LOGIC TO LOAD AND DISPLAY PROFILE PICTURE ---
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
        
        // ** FIX: DO NOT load these here. They will be loaded on tab click. **
        // loadProjectHistory();
        // loadDocuments();
    }

    // --- Function to load Attendance Data ---
    // --- NEW: Function to load Attendance Calendar ---
let calendarDate = new Date(); // State for the calendar's current month

async function loadAttendanceData(date) {
    const attendanceContainer = document.getElementById('tab-pane-attendance');
    attendanceContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading attendance calendar...</p>';

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed (0 for Jan)

    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // 1. Fetch this month's attendance data
    const { data, error } = await _supabase
        .from('attendance')
        .select('attendance_date, status')
        .eq('employee_id', employeeDbId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

    if (error) {
        attendanceContainer.innerHTML = `<p style="color:red;">Error loading attendance: ${error.message}</p>`;
        return;
    }

    // 2. Create a Map for quick lookups (e.g., '2025-12-29' -> 'Present')
    const attendanceMap = new Map(data.map(rec => [rec.attendance_date, rec.status]));

    // 3. Render the calendar
    renderCalendar(year, month, attendanceMap);
}

function renderCalendar(year, month, attendanceMap) {
    const attendanceContainer = document.getElementById('tab-pane-attendance');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let calendarHTML = `
        <div class="calendar-container">
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button id="prev-month-btn" title="Previous Month"><i class="fas fa-chevron-left"></i></button>
                </div>
                <h4>${monthNames[month]} ${year}</h4>
                <div class="calendar-nav">
                    <button id="next-month-btn" title="Next Month"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            <div class="calendar-grid">
    `;

    // Day names header
    dayNames.forEach(day => {
        calendarHTML += `<div class="day-name">${day}</div>`;
    });

    // Empty cells for the first week
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += `<div class="calendar-day empty"></div>`;
    }

    // Date cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const status = attendanceMap.get(dateStr);
        
        let statusClass = '';
        if (status === 'Present') statusClass = 'present';
        else if (status === 'Absent') statusClass = 'absent';
        else if (status === 'Leave') statusClass = 'leave';

        let todayClass = '';
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            todayClass = 'today';
        }

        calendarHTML += `<div class="calendar-day ${statusClass} ${todayClass}" title="${dateStr}: ${status || 'No Record'}">${day}</div>`;
    }

    calendarHTML += `</div>`; // Close .calendar-grid

    // --- NEW: HTML for the legend ---
    const legendHTML = `
        <div class="calendar-legend">
            <div class="legend-item">
                <span class="legend-color-box present"></span>
                <span>Present</span>
            </div>
            <div class="legend-item">
                <span class="legend-color-box absent"></span>
                <span>Absent</span>
            </div>
            <div class="legend-item">
                <span class="legend-color-box leave"></span>
                <span>Leave</span>
            </div>
            <div class="legend-item">
                <span class="legend-color-box" style="background-color: #f8fafc;"></span>
                <span>No Record</span>
            </div>
        </div>
    `;
    
    calendarHTML += `</div>`; // Close .calendar-container
    
    attendanceContainer.innerHTML = calendarHTML + legendHTML;

    // Add event listeners for navigation
    document.getElementById('prev-month-btn').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        loadAttendanceData(calendarDate);
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        loadAttendanceData(calendarDate);
    });
}

    // --- Placeholder for Payroll History ---
    async function loadPayrollData() {
        const payrollContainer = document.getElementById('tab-pane-payroll');
        payrollContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading payroll history...</p>';

        const { data: history, error } = await _supabase
            .from('payroll_history')
            .select('*')
            .eq('employee_id', employeeDbId)
            .order('payroll_month', { ascending: false }); // Show most recent first

        if (error) {
            payrollContainer.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
            return;
        }

        if (!history || history.length === 0) {
            payrollContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; border: 1px dashed #e2e8f0; border-radius: 8px;">
                    <i class="fas fa-file-invoice-dollar" style="font-size: 2rem; color: #94a3b8; margin-bottom: 15px;"></i>
                    <h4 style="margin:0;">No Payroll History Found</h4>
                    <p style="color: var(--text-secondary);">There are no processed payroll records for this employee yet.</p>
                </div>
            `;
            return;
        }

        // If data exists, build the table
        let tableHtml = `
            <div style="overflow-x: auto;">
                <table id="payroll-history-table">
                    <thead>
                        <tr>
                            <th>Payroll Month</th>
                            <th>Payable Days</th>
                            <th>Gross Salary</th>
                            <th>Net Salary Paid</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        history.forEach(record => {
            const payrollMonth = new Date(record.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' });
            tableHtml += `
                <tr>
                    <td><strong>${payrollMonth}</strong></td>
                    <td>${record.payable_days} / ${record.total_days}</td>
                    <td>₹${parseFloat(record.gross_salary_at_time).toLocaleString('en-IN')}</td>
                    <td><strong>₹${parseFloat(record.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                    <td class="action-buttons">
                        <button class="btn-secondary download-slip-btn" data-record-id="${record.id}" title="Download Payslip">
                            <i class="fas fa-download"></i> Download Slip
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></div>`;
        payrollContainer.innerHTML = tableHtml;

        // Add event listeners to all the new download buttons
        document.querySelectorAll('.download-slip-btn').forEach(button => {
            button.addEventListener('click', handleDownloadSingleSlip);
        });
    }

    // --- ADD THIS NEW HELPER FUNCTION a- a single payslip ---
    async function handleDownloadSingleSlip(event) {
        const button = event.currentTarget;
        const recordId = button.dataset.recordId;

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            // 1. Fetch the specific payroll record AND the employee's details at that time
            const { data: record, error } = await _supabase
                .from('payroll_history')
                .select(`
                    *,
                    employees (employee_id, full_name, designation, date_of_joining)
                `)
                .eq('id', recordId)
                .single();

            if (error || !record) throw new Error(error?.message || "Record not found.");

            // 2. Reuse the PDF generation logic from payroll.js (slightly adapted)
            const template = document.getElementById('payslip-template'); // Assuming template is in employee-profile.html
            
            // --- This part is almost identical to payroll.js ---
            document.getElementById('slip-month-year').textContent = new Date(record.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' });
            document.getElementById('slip-employee-name').textContent = record.employees.full_name;
            document.getElementById('slip-employee-id').textContent = record.employees.employee_id || 'N/A';
            document.getElementById('slip-designation').textContent = record.employees.designation || 'N/A';
            document.getElementById('slip-doj').textContent = new Date(record.employees.date_of_joining).toLocaleDateString('en-GB');
            
            const grossSalary = parseFloat(record.gross_salary_at_time);
            const deductions = parseFloat(record.deductions);
            const netSalary = parseFloat(record.net_salary);

            const grossSalaryFormatted = `₹${grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('slip-gross').textContent = grossSalaryFormatted;
            document.getElementById('slip-total-earnings').textContent = grossSalaryFormatted;
            
            const deductionsFormatted = `₹${deductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('slip-deductions').textContent = deductionsFormatted;
            document.getElementById('slip-total-deductions').textContent = deductionsFormatted;

            document.getElementById('slip-total-days').textContent = record.total_days;
            document.getElementById('slip-payable-days').textContent = record.payable_days;
            
            document.getElementById('slip-net-salary').textContent = `₹${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            
            // --- Re-use the numberToWords helper ---
            // We need to define it or make it globally available if it's not already
            if (typeof numberToWords !== 'function') {
                 window.numberToWords = function(num) { /* Add the full numberToWords function code here */ 
                    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
                    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
                    const transform = function(n) { let str = ''; let rem; if (n < 20) { str = a[n]; } else { rem = n % 10; str = b[Math.floor(n / 10)] + (rem > 0 ? '-' : '') + a[rem]; } return str; };
                    const inWords = function(num) { if (num === 0) return 'zero'; let str = ''; const crore = Math.floor(num / 10000000); num %= 10000000; const lakh = Math.floor(num / 100000); num %= 100000; const thousand = Math.floor(num / 1000); num %= 1000; const hundred = Math.floor(num / 100); num %= 100; if (crore > 0) str += transform(crore) + 'crore '; if (lakh > 0) str += transform(lakh) + 'lakh '; if (thousand > 0) str += transform(thousand) + 'thousand '; if (hundred > 0) str += transform(hundred) + 'hundred '; if (num > 0) str += 'and ' + transform(num); return str.trim(); };
                    return inWords(num);
                };
            }
            document.getElementById('slip-net-words').textContent = `(In Words: Rupees ${window.numberToWords(Math.round(netSalary))} Only)`;

            const canvas = await html2canvas(template, { scale: 3 });
            const imgData = canvas.toDataURL('image/png');
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;
            const contentWidth = pdfWidth - (margin * 2);
            const contentHeight = (canvas.height * contentWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
            
            const monthStr = new Date(record.payroll_month).toLocaleString('default', { month: 'short', year: 'numeric' });
            const fileName = `Payslip_${record.employees.full_name.replace(/ /g, '_')}_${monthStr.replace(/ /g, '_')}.pdf`;
            pdf.save(fileName);
            // --- End of PDF logic ---

        } catch (err) {
            console.error("Error generating single payslip:", err);
            alert("Could not generate payslip. " + err.message);
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-download"></i> Download Slip';
        }
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
    
    // --- ** FIX: UPDATED TAB SWITCHING LOGIC ** ---
    // --- ** FIX: UPDATED TAB SWITCHING LOGIC ** ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Activate the clicked tab and its corresponding pane
            button.classList.add('active');
            const targetPane = document.getElementById(`tab-pane-${button.dataset.tab}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }

            // --- ON-DEMAND DATA LOADING ---
            const tabName = button.dataset.tab;
            
            // Only load data if the content hasn't been loaded yet (check for placeholder)
            if (tabName === 'docs' && docsTableBody.innerHTML.includes('Loading')) {
                loadDocuments();
            } else if (tabName === 'history' && (historyContainer.innerHTML.includes('Loading') || historyContainer.innerHTML.includes('coming soon'))) {
                loadProjectHistory();
            } else if (tabName === 'attendance' && document.getElementById('tab-pane-attendance').innerHTML.includes('Loading')) {
                loadAttendanceData(calendarDate); 
            } else if (tabName === 'payroll' && document.getElementById('tab-pane-payroll').innerHTML.includes('development')) {
                loadPayrollData();
            }
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

    // --- Event listener for Edit Profile button ---
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            // Check if employee data has been loaded
            if (currentEmployee) {
                // Call the global openModal function from employee-modal-logic.js
                // Pass the current employee object to pre-fill the form.
                // Pass the loadProfileData function as a callback to refresh this page on success.
                openModal(currentEmployee, loadProfileData);
            } else {
                alert("Employee data not loaded yet. Please wait a moment and try again.");
            }
        });
    }


    
    // --- Initial Load ---
    loadProfileData();
});