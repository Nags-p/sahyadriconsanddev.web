document.addEventListener('DOMContentLoaded', () => {
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        initializeApp(session.user.id);
    }

    function initializeApp(currentUserId) {
        // --- Elements for Tab 1: Daily Entry ---
        const attendanceDateInput = document.getElementById('attendance-date');
        const projectFilterSelect = document.getElementById('project-filter-select');
        const attendanceTable = document.getElementById('attendance-table');
        const attendanceTableBody = document.getElementById('attendance-table-body');
        const placeholder = document.getElementById('attendance-placeholder');
        const actionsContainer = document.getElementById('attendance-actions');
        const saveBtn = document.getElementById('save-attendance-btn');
        const statusEl = document.getElementById('attendance-status');
        const markAllPresentBtn = document.getElementById('mark-all-present-btn');
        
        // --- Elements for Tab 2: Monthly Summary ---
        const monthInput = document.getElementById('report-month');
        const employeeSelect = document.getElementById('report-employee');
        const generateBtn = document.getElementById('generate-report-btn');
        const reportOutput = document.getElementById('report-output');
        const reportPlaceholder = document.getElementById('report-placeholder');

        let currentProjectEmployees = [];

        // ==========================================================
        // --- TAB 1: DAILY ENTRY LOGIC ---
        // ==========================================================
        function setDefaultDate() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            attendanceDateInput.value = `${year}-${month}-${day}`;
        }

        async function loadProjectsForFilter() {
            const { data, error } = await _supabase.from('erp_projects').select('id, project_name').eq('status', 'Active');
            projectFilterSelect.innerHTML = '<option value="">-- Select a Project --</option>';
            if (data) {
                data.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.project_name;
                    projectFilterSelect.appendChild(option);
                });
            }
        }

        async function fetchAndDisplayAttendance() {
            const projectId = projectFilterSelect.value;
            if (!projectId) return;

            placeholder.textContent = 'Loading employees...';
            attendanceTable.style.display = 'none';
            actionsContainer.style.display = 'none';
            
            const { data: assignments, error: empError } = await _supabase.from('employee_assignments').select('employees(*)').eq('project_id', projectId);
            if (empError) { placeholder.textContent = `Error: ${empError.message}`; return; }
            
            currentProjectEmployees = assignments.map(a => a.employees).filter(e => e && e.is_active);

            const { data: existingAttendance } = await _supabase.from('attendance').select('*').eq('attendance_date', attendanceDateInput.value).in('employee_id', currentProjectEmployees.map(e => e.id));
            
            renderAttendanceSheet(existingAttendance || []);
        }

        function renderAttendanceSheet(existingAttendance) {
            attendanceTableBody.innerHTML = '';
            if (currentProjectEmployees.length === 0) {
                placeholder.textContent = 'No active employees are assigned to this project.';
                return;
            }
            currentProjectEmployees.forEach(employee => {
                const record = existingAttendance.find(rec => rec.employee_id === employee.id);
                const status = record ? record.status : 'Present';
                const remarks = record ? record.remarks : '';
                const tr = document.createElement('tr');
                tr.dataset.employeeId = employee.id;
                tr.innerHTML = `<td><strong>${employee.full_name}</strong><br><small>${employee.designation||'N/A'}</small></td><td><div class="attendance-status-group"><label><input type="radio" name="status_${employee.id}" value="Present" ${status==='Present'?'checked':''}> Present</label><label><input type="radio" name="status_${employee.id}" value="Absent" ${status==='Absent'?'checked':''}> Absent</label><label><input type="radio" name="status_${employee.id}" value="Leave" ${status==='Leave'?'checked':''}> Leave</label></div></td><td><input type="text" class="attendance-remarks" value="${remarks||''}" placeholder="Optional notes..."></td>`;
                attendanceTableBody.appendChild(tr);
            });
            placeholder.style.display = 'none';
            attendanceTable.style.display = 'table';
            actionsContainer.style.display = 'flex';
        }

        async function handleSaveAttendance() {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            const records = Array.from(attendanceTableBody.querySelectorAll('tr')).map(row => ({
                employee_id: row.dataset.employeeId,
                attendance_date: attendanceDateInput.value,
                status: row.querySelector(`input[name^="status_"]:checked`).value,
                remarks: row.querySelector('.attendance-remarks').value,
                marked_by_user_id: currentUserId
            }));
            const { error } = await _supabase.from('attendance').upsert(records, { onConflict: 'employee_id, attendance_date' });
            statusEl.textContent = error ? `Error: ${error.message}` : 'Attendance saved successfully!';
            statusEl.className = `status-message ${error ? 'error' : 'success'}`;
            statusEl.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Attendance';
        }

        function handleMarkAllPresent() {
            attendanceTableBody.querySelectorAll('input[value="Present"]').forEach(radio => radio.checked = true);
        }

        // ==========================================================
        // --- TAB 2: MONTHLY SUMMARY LOGIC ---
        // ==========================================================
        function setDefaultMonth() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            monthInput.value = `${year}-${month}`;
        }

        async function loadEmployeesForFilter() {
            const { data, error } = await _supabase.from('employees').select('id, full_name').eq('is_active', true).order('full_name');
            if (data) {
                data.forEach(emp => {
                    employeeSelect.innerHTML += `<option value="${emp.id}">${emp.full_name}</option>`;
                });
            }
        }

        async function generateReport() {
            if (!monthInput.value || !employeeSelect.value) {
                reportPlaceholder.textContent = "Please select a month, year, and employee.";
                return;
            }
            reportPlaceholder.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating report...';

            const [year, month] = monthInput.value.split('-');
            const startDate = `${year}-${month}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            const { data, error } = await _supabase.from('attendance').select('attendance_date, status').eq('employee_id', employeeSelect.value).gte('attendance_date', startDate).lte('attendance_date', endDate).order('attendance_date');
            
            if (error) { reportPlaceholder.textContent = `Error: ${error.message}`; return; }
            renderReport(data, year, month);
        }

        function renderReport(data, year, month) {
            const daysInMonth = new Date(year, month, 0).getDate();
            const counts = { Present: 0, Absent: 0, Leave: 0 };
            data.forEach(rec => { if (counts.hasOwnProperty(rec.status)) counts[rec.status]++; });

            let tableHtml = `<table id="report-table"><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>`;
            data.forEach(rec => {
                const date = new Date(rec.attendance_date.replace(/-/g, '/')).toLocaleDateString('en-GB');
                tableHtml += `<tr><td>${date}</td><td>${rec.status}</td></tr>`;
            });
            tableHtml += `</tbody></table>`;
            
            const summaryHtml = `<div class="report-summary"><div class="stat-card"><h3>Total Days</h3><p>${daysInMonth}</p></div><div class="stat-card"><h3>Present</h3><p>${counts.Present}</p></div><div class="stat-card"><h3>Absent</h3><p>${counts.Absent}</p></div><div class="stat-card"><h3>On Leave</h3><p>${counts.Leave}</p></div></div>`;
            reportOutput.innerHTML = summaryHtml + tableHtml;
        }

        // ==========================================================
        // --- TAB SWITCHING LOGIC ---
        // ==========================================================
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
        projectFilterSelect.addEventListener('change', fetchAndDisplayAttendance);
        attendanceDateInput.addEventListener('change', fetchAndDisplayAttendance);
        saveBtn.addEventListener('click', handleSaveAttendance);
        markAllPresentBtn.addEventListener('click', handleMarkAllPresent);
        generateBtn.addEventListener('click', generateReport);

        // --- Initial Load ---
        setDefaultDate();
        setDefaultMonth();
        loadProjectsForFilter();
        loadEmployeesForFilter();
    }

    checkAuthAndLoad();
});