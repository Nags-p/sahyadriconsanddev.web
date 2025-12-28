document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION ---
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) { window.location.href = 'index.html'; return; }
        initializeApp();
    }

    function initializeApp() {
        // --- Elements ---
        const exportMasterBtn = document.getElementById('export-employee-master-btn');
        const generateProjectBtn = document.getElementById('generate-project-resource-btn');
        const projectReportOutput = document.getElementById('project-resource-output');
        
        let projectResourceData = []; // Cache for the generated report data

        // --- Helper function for CSV escaping ---
        const escapeCsvCell = (cell) => { /* ... same as before ... */ 
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // --- Function for Employee Master Report (unchanged) ---
        async function exportEmployeeMaster() { /* ... same as before ... */ 
            exportMasterBtn.disabled = true; exportMasterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            try {
                const { data: employees, error } = await _supabase.from('employees').select('*').order('employee_id', { ascending: true });
                if (error) throw error; if (employees.length === 0) { alert('No employee data to export.'); return; }
                const headers = ['Employee ID', 'Full Name', 'Phone', 'Email', 'Date of Joining', 'Date of Birth', 'Designation', 'Employment Type', 'Gross Salary', 'Bank Account Holder Name', 'Bank Account Number', 'Bank IFSC Code', 'Address', 'Emergency Contact Number', 'Is Active'];
                const rows = employees.map(emp => [emp.employee_id, emp.full_name, emp.phone, emp.email, emp.date_of_joining, emp.date_of_birth, emp.designation, emp.employment_type, emp.gross_salary, emp.bank_account_holder_name, emp.bank_account_number, emp.bank_ifsc_code, emp.address, emp.emergency_contact_number, emp.is_active].map(escapeCsvCell).join(','));
                const csvContent = [headers.join(','), ...rows].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); const today = new Date().toISOString().split('T')[0];
                link.setAttribute("download", `Employee_Master_Report_${today}.csv`);
                link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
            } catch (err) { alert(`Failed to export data: ${err.message}`);
            } finally { exportMasterBtn.disabled = false; exportMasterBtn.innerHTML = '<i class="fas fa-download"></i> Export CSV'; }
        }

        // ==========================================================
        // --- NEW: LOGIC FOR PROJECT RESOURCE REPORT ---
        // ==========================================================
        async function generateProjectResourceReport() {
            generateProjectBtn.disabled = true;
            generateProjectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            projectReportOutput.style.display = 'block';
            projectReportOutput.innerHTML = '<p style="text-align: center;">Fetching project and employee data...</p>';

            try {
                // 1. Fetch all active projects and all employee assignments in parallel
                const [
                    { data: projects, error: pError },
                    { data: assignments, error: aError }
                ] = await Promise.all([
                    _supabase.from('erp_projects').select('id, project_name').eq('status', 'Active'),
                    _supabase.from('employee_assignments').select('project_id, role_on_project, employees(full_name, employee_id)')
                ]);

                if (pError) throw pError;
                if (aError) throw aError;
                
                // 2. Group assignments by project ID for easy lookup
                const assignmentsByProject = assignments.reduce((acc, asgn) => {
                    const projectId = asgn.project_id;
                    if (!acc[projectId]) {
                        acc[projectId] = [];
                    }
                    // Only add if employee data exists (to prevent errors from orphaned assignments)
                    if (asgn.employees) {
                        acc[projectId].push({
                            employeeId: asgn.employees.employee_id,
                            employeeName: asgn.employees.full_name,
                            role: asgn.role_on_project || 'N/A'
                        });
                    }
                    return acc;
                }, {});

                // 3. Render the report HTML
                renderProjectResourceReport(projects, assignmentsByProject);
                
                // Cache the data for export
                projectResourceData = { projects, assignmentsByProject };

            } catch (err) {
                console.error('Project Resource Report Error:', err);
                projectReportOutput.innerHTML = `<p style="text-align: center; color: red;">Error: ${err.message}</p>`;
            } finally {
                generateProjectBtn.disabled = false;
                generateProjectBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Regenerate Report';
            }
        }

        function renderProjectResourceReport(projects, assignmentsByProject) {
            if (projects.length === 0) {
                projectReportOutput.innerHTML = '<p style="text-align: center;">No active projects found.</p>';
                return;
            }

            let reportHtml = '';
            projects.forEach(project => {
                const assignedEmployees = assignmentsByProject[project.id] || [];
                
                reportHtml += `
                    <div class="project-report-container">
                        <div class="project-report-header">
                            <h4>${project.project_name}</h4>
                        </div>
                `;

                if (assignedEmployees.length > 0) {
                    reportHtml += `<table class="project-report-table"><thead><tr><th>Employee ID</th><th>Employee Name</th><th>Role on Project</th></tr></thead><tbody>`;
                    assignedEmployees.forEach(emp => {
                        reportHtml += `<tr><td>${emp.employeeId}</td><td>${emp.employeeName}</td><td>${emp.role}</td></tr>`;
                    });
                    reportHtml += `</tbody></table>`;
                } else {
                    reportHtml += `<p style="padding: 15px;">No employees are currently assigned to this project.</p>`;
                }

                reportHtml += `</div>`;
            });
            
            // Add an export button at the end
            reportHtml += `
                <div class="button-group" style="margin-top: 20px; justify-content: flex-end;">
                    <button id="export-project-resource-btn" class="btn-secondary"><i class="fas fa-download"></i> Export This View as CSV</button>
                </div>
            `;

            projectReportOutput.innerHTML = reportHtml;

            // Attach event listener to the newly created export button
            document.getElementById('export-project-resource-btn').addEventListener('click', exportProjectResourceReport);
        }

        function exportProjectResourceReport() {
            const { projects, assignmentsByProject } = projectResourceData;
            if (!projects || projects.length === 0) {
                alert('No data to export.');
                return;
            }

            const headers = ['Project Name', 'Employee ID', 'Employee Name', 'Role on Project'];
            let rows = [];

            projects.forEach(project => {
                const assignedEmployees = assignmentsByProject[project.id] || [];
                if (assignedEmployees.length > 0) {
                    assignedEmployees.forEach(emp => {
                        rows.push([
                            project.project_name,
                            emp.employeeId,
                            emp.employeeName,
                            emp.role
                        ].map(escapeCsvCell).join(','));
                    });
                } else {
                    // Optionally, include projects with no employees in the export
                    rows.push([project.project_name, 'N/A', 'No employees assigned', 'N/A'].map(escapeCsvCell).join(','));
                }
            });

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const today = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `Project_Resource_Report_${today}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // --- Event Listeners ---
        if (exportMasterBtn) {
            exportMasterBtn.addEventListener('click', exportEmployeeMaster);
        }
        if (generateProjectBtn) {
            generateProjectBtn.addEventListener('click', generateProjectResourceReport);
        }
    }

    checkAuthAndLoad();
});