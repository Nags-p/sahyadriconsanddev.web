// --- Security Check ---
if (!sessionStorage.getItem('employeeSession')) {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INITIALIZE APP & GET DATA ---
    const employeeSession = JSON.parse(sessionStorage.getItem('employeeSession'));

    if (!employeeSession) {
        window.location.href = 'index.html';
        return;
    }

    const _supabase = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    // --- 2. GET DOM ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // ==========================================================
    // --- 3. DEFINE ALL FUNCTIONS FIRST ---
    // ==========================================================

    function handleLogout() {
        sessionStorage.removeItem('employeeSession');
        window.location.href = 'index.html';
    }

    // --- DATA LOADING FUNCTIONS ---

    async function loadProfileData() {
        const profileDetailsContainer = document.getElementById('profile-details');
        
        try {
            const { data, error } = await _supabase.rpc('get_employee_profile', {
                p_employee_id: employeeSession.id // Pass the employee's UUID
            });

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Profile not found.");

            const employee = data[0];

            // Helper for date formatting
            const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : 'N/A';

            profileDetailsContainer.innerHTML = `
                <div class="detail-item"><strong>Phone:</strong> <span>${employee.phone || 'N/A'}</span></div>
                <div class="detail-item"><strong>Email:</strong> <span>${employee.email || 'N/A'}</span></div>
                <div class="detail-item"><strong>Emergency Contact:</strong> <span>${employee.emergency_contact_number || 'N/A'}</span></div>
                <div class="detail-item"><strong>Date of Joining:</strong> <span>${formatDate(employee.date_of_joining)}</span></div>
                <div class="detail-item"><strong>Employment Type:</strong> <span>${employee.employment_type || 'N/A'}</span></div>
                <div class="detail-item"><strong>Date of Birth:</strong> <span>${formatDate(employee.date_of_birth)}</span></div>
                <div class="detail-item detail-item-full"><strong>Address:</strong> <span>${employee.address || 'N/A'}</span></div>
                <div class="detail-item"><strong>Bank Account Holder:</strong> <span>${employee.bank_account_holder_name || 'N/A'}</span></div>
                <div class="detail-item"><strong>Bank Account Number:</strong> <span>${employee.bank_account_number || 'N/A'}</span></div>
                <div class="detail-item"><strong>Bank IFSC Code:</strong> <span>${employee.bank_ifsc_code || 'N/A'}</span></div>
            `;

        } catch (err) {
            profileDetailsContainer.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
        }
    }

    // ==========================================================
    // --- NEW: ATTENDANCE CALENDAR LOGIC ---
    // ==========================================================
    let calendarDate = new Date(); // State for the calendar's current month

    async function loadAttendanceData(date) {
        const attendanceContainer = document.getElementById('attendance-calendar');
        attendanceContainer.innerHTML = '<p class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading attendance calendar...</p>';

        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        try {
            const { data, error } = await _supabase.rpc('get_employee_attendance', {
                p_employee_id: employeeSession.id,
                p_start_date: startDate,
                p_end_date: endDate
            });

            if (error) throw error;
            
            const attendanceMap = new Map((data || []).map(rec => [rec.attendance_date, rec.status]));
            renderCalendar(year, month, attendanceMap);

        } catch (err) {
            attendanceContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        }
    }

    function renderCalendar(year, month, attendanceMap) {
        const attendanceContainer = document.getElementById('attendance-calendar');
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        let calendarHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <button id="prev-month-btn" title="Previous Month"><i class="fas fa-chevron-left"></i></button>
                    <h4>${monthNames[month]} ${year}</h4>
                    <button id="next-month-btn" title="Next Month"><i class="fas fa-chevron-right"></i></button>
                </div>
                <div class="calendar-grid">
        `;
        dayNames.forEach(day => { calendarHTML += `<div class="day-name">${day}</div>`; });
        for (let i = 0; i < firstDay; i++) { calendarHTML += `<div class="calendar-day empty"></div>`; }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = attendanceMap.get(dateStr);
            let statusClass = status ? status.toLowerCase() : '';
            let todayClass = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) ? 'today' : '';
            calendarHTML += `<div class="calendar-day ${statusClass} ${todayClass}" title="${dateStr}: ${status || 'No Record'}">${day}</div>`;
        }
        calendarHTML += `</div></div>`; // Close grid and container

        const legendHTML = `
            <div class="calendar-legend">
                <div class="legend-item"><span class="legend-color-box present"></span>Present</div>
                <div class="legend-item"><span class="legend-color-box absent"></span>Absent</div>
                <div class="legend-item"><span class="legend-color-box leave"></span>Leave</div>
            </div>
        `;
        attendanceContainer.innerHTML = calendarHTML + legendHTML;

        document.getElementById('prev-month-btn').addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            loadAttendanceData(calendarDate);
        });
        document.getElementById('next-month-btn').addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            loadAttendanceData(calendarDate);
        });
    }

    async function loadPayslipsData() {
        const payslipsContainer = document.getElementById('payslips-history');
        try {
             const { data: history, error } = await _supabase.rpc('get_employee_payroll_history', {
                p_employee_id: employeeSession.id
            });

            if (error) throw error;

            if (!history || history.length === 0) {
                payslipsContainer.innerHTML = '<p>No payroll history found.</p>';
                return;
            }

            let tableHtml = `<table class="payslips-table"><thead><tr><th>Payroll Month</th><th>Net Salary Paid</th><th>Actions</th></tr></thead><tbody>`;
            history.forEach(record => {
                const payrollMonth = new Date(record.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' });
                tableHtml += `
                    <tr>
                        <td><strong>${payrollMonth}</strong></td>
                        <td><strong>₹${parseFloat(record.net_salary).toLocaleString('en-IN')}</strong></td>
                        <td class="action-buttons">
                            <button class="btn-secondary download-slip-btn" data-record-id="${record.id}"><i class="fas fa-download"></i> Download</button>
                        </td>
                    </tr>
                `;
            });
            tableHtml += `</tbody></table>`;
            payslipsContainer.innerHTML = tableHtml;

            // Add event listeners for the new download buttons
            document.querySelectorAll('.download-slip-btn').forEach(btn => {
                btn.addEventListener('click', () => alert('Download payslip functionality coming soon!'));
            });

        } catch(err) {
            payslipsContainer.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
        }
    }

    // ... after the renderCalendar function

    // ==========================================================
    // --- NEW: PAYSLIP HISTORY & DOWNLOAD LOGIC ---
    // ==========================================================
    async function loadPayslipsData() {
        const payslipsContainer = document.getElementById('payslips-history');
        try {
             const { data: history, error } = await _supabase.rpc('get_employee_payroll_history', {
                p_employee_id: employeeSession.id
            });
            if (error) throw error;
            if (!history || history.length === 0) { payslipsContainer.innerHTML = '<p>No payroll history found.</p>'; return; }

            let tableHtml = `<table class="payslips-table"><thead><tr><th>Payroll Month</th><th>Net Salary Paid</th><th>Actions</th></tr></thead><tbody>`;
            history.forEach(record => {
                const payrollMonth = new Date(record.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' });
                tableHtml += `
                    <tr>
                        <td><strong>${payrollMonth}</strong></td>
                        <td><strong>₹${parseFloat(record.net_salary).toLocaleString('en-IN')}</strong></td>
                        <td class="action-buttons">
                            <button class="btn-secondary download-slip-btn" data-record-id="${record.id}"><i class="fas fa-download"></i> Download</button>
                        </td>
                    </tr>
                `;
            });
            tableHtml += `</tbody></table>`;
            payslipsContainer.innerHTML = tableHtml;

            document.querySelectorAll('.download-slip-btn').forEach(btn => btn.addEventListener('click', handleDownloadSingleSlip));

        } catch(err) { payslipsContainer.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`; }
    }

    // In portal.js...

// REPLACE this entire function
    async function handleDownloadSingleSlip(event) {
        const button = event.currentTarget;
        const recordId = button.dataset.recordId;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            // ==========================================================
            // --- THIS IS THE FIX ---
            // ==========================================================
            // Query 1: Fetch the specific payroll record.
            const { data: record, error: recordError } = await _supabase
                .from('payroll_history')
                .select('*')
                .eq('id', recordId)
                .single();

            if (recordError) throw recordError;
            if (!record) throw new Error("Payroll record not found.");

            // Query 2: Fetch the associated employee using the ID from the payroll record.
            const { data: employee, error: employeeError } = await _supabase
                .from('employees')
                .select('*')
                .eq('id', record.employee_id)
                .single();

            if (employeeError) throw employeeError;
            if (!employee) throw new Error("Associated employee not found.");
            // ==========================================================
            // --- END OF FIX ---
            // ==========================================================

            const template = document.getElementById('payslip-template');
            if (typeof numberToWords !== 'function') {
                window.numberToWords = function(num) { const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen ']; const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety']; const transform = function(n) { let str = ''; let rem; if (n < 20) { str = a[n]; } else { rem = n % 10; str = b[Math.floor(n / 10)] + (rem > 0 ? '-' : '') + a[rem]; } return str; }; const inWords = function(num) { if (num === 0) return 'zero'; let str = ''; const crore = Math.floor(num / 10000000); num %= 10000000; const lakh = Math.floor(num / 100000); num %= 100000; const thousand = Math.floor(num / 1000); num %= 1000; const hundred = Math.floor(num / 100); num %= 100; if (crore > 0) str += transform(crore) + 'crore '; if (lakh > 0) str += transform(lakh) + 'lakh '; if (thousand > 0) str += transform(thousand) + 'thousand '; if (hundred > 0) str += transform(hundred) + 'hundred '; if (num > 0) str += 'and ' + transform(num); return str.trim(); }; return inWords(num); };
            }
            
            // Now populate the template using the 'record' and 'employee' objects
            document.getElementById('slip-month-year').textContent = new Date(record.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' });
            document.getElementById('slip-employee-name').textContent = employee.full_name;
            document.getElementById('slip-employee-id').textContent = employee.employee_id || 'N/A';
            document.getElementById('slip-designation').textContent = employee.designation || 'N/A';
            document.getElementById('slip-doj').textContent = new Date(employee.date_of_joining).toLocaleDateString('en-GB');
            
            const grossSalary = parseFloat(record.gross_salary_at_time), deductions = parseFloat(record.deductions), netSalary = parseFloat(record.net_salary);
            const grossSalaryFormatted = `₹${grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('slip-gross').textContent = grossSalaryFormatted; document.getElementById('slip-total-earnings').textContent = grossSalaryFormatted;
            const deductionsFormatted = `₹${deductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('slip-deductions').textContent = deductionsFormatted; document.getElementById('slip-total-deductions').textContent = deductionsFormatted;
            document.getElementById('slip-total-days').textContent = record.total_days; document.getElementById('slip-payable-days').textContent = record.payable_days;
            document.getElementById('slip-net-salary').textContent = `₹${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            document.getElementById('slip-net-words').textContent = `(In Words: Rupees ${window.numberToWords(Math.round(netSalary))} Only)`;

            const canvas = await html2canvas(template, { scale: 3 });
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth(), margin = 10, contentWidth = pdfWidth - (margin * 2), contentHeight = (canvas.height * contentWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, contentHeight);
            const monthStr = new Date(record.payroll_month).toLocaleString('default', { month: 'short', year: 'numeric' });
            pdf.save(`Payslip_${employee.full_name.replace(/ /g, '_')}_${monthStr.replace(/ /g, '_')}.pdf`);

        } catch (err) { 
            console.error("Error generating payslip:", err);
            alert("Could not generate payslip. " + err.message);
        } finally { 
            button.disabled = false; 
            button.innerHTML = '<i class="fas fa-download"></i> Download'; 
        }
    }


// ... the handleTabClick function will go here ...

    // --- TAB SWITCHING LOGIC ---
    // Replace the old handleTabClick function with this one

    function handleTabClick(e) {
        const tabName = e.currentTarget.dataset.tab;

        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        e.currentTarget.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        const container = document.getElementById(
            tabName === 'profile' ? 'profile-details' :
            tabName === 'attendance' ? 'attendance-calendar' :
            'payslips-history'
        );
        
        // Only load data if the placeholder text is still there
        if (container.innerHTML.includes('Loading')) {
            switch (tabName) {
                case 'profile':
                    loadProfileData();
                    break;
                case 'attendance':
                    loadAttendanceData(calendarDate);
                    break;
                case 'payslips':
                    loadPayslipsData();
                    break;
            }
        }
    }

    

    // ==========================================================
    // --- 4. INITIAL PAGE SETUP & EVENT LISTENERS ---
    // ==========================================================
    
    welcomeMessage.textContent = `Welcome, ${employeeSession.full_name}`;

    logoutBtn.addEventListener('click', handleLogout);
    tabButtons.forEach(btn => btn.addEventListener('click', handleTabClick));

    // Initially load the default tab's data (Profile)
    loadProfileData();
});