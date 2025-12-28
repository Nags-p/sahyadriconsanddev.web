document.addEventListener('DOMContentLoaded', () => {
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = '../dashboard.html';
            return;
        }
        initializeApp();
    }

    function initializeApp() {
        const monthInput = document.getElementById('report-month');
        const employeeSelect = document.getElementById('report-employee');
        const generateBtn = document.getElementById('generate-report-btn');
        const reportOutput = document.getElementById('report-output');
        const placeholder = document.getElementById('report-placeholder');

        // Set default month to current month
        function setDefaultMonth() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            monthInput.value = `${year}-${month}`;
        }

        async function loadEmployees() {
            const { data, error } = await _supabase.from('employees').select('id, full_name').eq('is_active', true).order('full_name');
            if (data) {
                data.forEach(emp => {
                    employeeSelect.innerHTML += `<option value="${emp.id}">${emp.full_name}</option>`;
                });
            }
        }

        async function generateReport() {
            const monthYear = monthInput.value;
            const employeeId = employeeSelect.value;

            if (!monthYear || !employeeId) {
                placeholder.textContent = "Please select a month, year, and employee.";
                return;
            }
            
            placeholder.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating report...';

            const [year, month] = monthYear.split('-');
            const startDate = `${year}-${month}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of the month

            const { data, error } = await _supabase.from('attendance')
                .select('attendance_date, status')
                .eq('employee_id', employeeId)
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate)
                .order('attendance_date');

            if (error) {
                placeholder.textContent = `Error: ${error.message}`;
                return;
            }
            
            renderReport(data, year, month);
        }

        function renderReport(attendanceData, year, month) {
            const daysInMonth = new Date(year, month, 0).getDate();
            let presentCount = 0;
            let absentCount = 0;
            let leaveCount = 0;

            let tableHtml = `<h4>Attendance for ${new Date(year, month-1).toLocaleString('default', { month: 'long' })} ${year}</h4>
                             <table id="report-table">
                                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                                <tbody>`;

            attendanceData.forEach(rec => {
                if (rec.status === 'Present') presentCount++;
                if (rec.status === 'Absent') absentCount++;
                if (rec.status === 'Leave') leaveCount++;
                const date = new Date(rec.attendance_date.replace(/-/g, '/')).toLocaleDateString('en-GB');
                tableHtml += `<tr><td>${date}</td><td>${rec.status}</td></tr>`;
            });

            tableHtml += `</tbody></table>`;
            
            const summaryHtml = `
                <div class="report-summary">
                    <div class="stat-card"><h3>Total Days</h3><p>${daysInMonth}</p></div>
                    <div class="stat-card"><h3>Present</h3><p>${presentCount}</p></div>
                    <div class="stat-card"><h3>Absent</h3><p>${absentCount}</p></div>
                    <div class="stat-card"><h3>On Leave</h3><p>${leaveCount}</p></div>
                </div>
            `;
            
            reportOutput.innerHTML = summaryHtml + tableHtml;
        }

        generateBtn.addEventListener('click', generateReport);

        setDefaultMonth();
        loadEmployees();
    }

    checkAuthAndLoad();
});