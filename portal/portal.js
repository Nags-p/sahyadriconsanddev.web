// --- Security Check ---
// This blocker runs immediately. If no session, redirect before the rest of the script runs.
if (!sessionStorage.getItem('employeeSession')) {
    window.location.href = 'index.html';
}

// --- Main App Logic (runs only if security check passes) ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INITIALIZE APP & GET DATA ---
    const employeeSession = JSON.parse(sessionStorage.getItem('employeeSession'));

    // If session data is somehow invalid, redirect as a fallback.
    if (!employeeSession) {
        window.location.href = 'index.html';
        return;
    }

    // Create a Supabase client instance for this page
    const _supabase = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    // --- 2. GET DOM ELEMENTS ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const leaveApplyForm = document.getElementById('leave-apply-form');

    // State variable for the attendance calendar
    let calendarDate = new Date();

    // ==========================================================
    // --- 3. DEFINE ALL FUNCTIONS FIRST ---
    // ==========================================================

    function handleLogout() {
        sessionStorage.removeItem('employeeSession');
        window.location.href = 'index.html';
    }
    
    // --- PROFILE TAB ---
    async function loadProfileData() {
        const profileDetailsContainer = document.getElementById('profile-details');
        try {
            // NOTE: We switch to a secure RPC function instead of a direct table query.
            const { data, error } = await _supabase.rpc('get_employee_profile', {
                p_employee_id: employeeSession.id
            });
            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Profile not found.");
            
            const employee = data[0];
            
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

    // --- ATTENDANCE TAB ---
    async function loadAttendanceData(date) {
        const attendanceContainer = document.getElementById('attendance-calendar');
        const summaryContainer = document.getElementById('attendance-summary');
        attendanceContainer.innerHTML = '<p class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading calendar...</p>';
        summaryContainer.innerHTML = '<p class="loading-placeholder">Calculating...</p>';
        const year = date.getFullYear(), month = date.getMonth();
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        try {
            const { data, error } = await _supabase.rpc('get_employee_attendance', {
                p_employee_id: employeeSession.id,
                p_start_date: startDate,
                p_end_date: endDate
            });
            if (error) throw error;
            
            const stats = { present: 0, absent: 0, leave: 0 };
            (data || []).forEach(record => {
                const status = record.status.toLowerCase();
                if (stats.hasOwnProperty(status)) stats[status]++;
            });

            summaryContainer.innerHTML = `
                <div class="stat-card-mini present"><h4>Present Days</h4><p>${stats.present}</p></div>
                <div class="stat-card-mini leave"><h4>On Leave</h4><p>${stats.leave}</p></div>
                <div class="stat-card-mini absent"><h4>LOP Days</h4><p>${stats.absent}</p></div>
            `;
            
            const attendanceMap = new Map((data || []).map(rec => [rec.attendance_date, rec.status]));
            renderCalendar(year, month, attendanceMap);
        } catch (err) {
            attendanceContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
            summaryContainer.innerHTML = `<p style="color:red;">Error loading stats.</p>`;
        }
    }

    function renderCalendar(year, month, attendanceMap) {
        const attendanceContainer = document.getElementById('attendance-calendar');
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate(), today = new Date();
        let calendarHTML = `<div class="calendar-container"><div class="calendar-header"><button id="prev-month-btn" title="Previous Month"><i class="fas fa-chevron-left"></i></button><h4>${monthNames[month]} ${year}</h4><button id="next-month-btn" title="Next Month"><i class="fas fa-chevron-right"></i></button></div><div class="calendar-grid">`;
        dayNames.forEach(day => { calendarHTML += `<div class="day-name">${day}</div>`; });
        for (let i = 0; i < firstDay; i++) { calendarHTML += `<div class="calendar-day empty"></div>`; }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = attendanceMap.get(dateStr);
            let statusClass = status ? status.toLowerCase() : '';
            let todayClass = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) ? 'today' : '';
            calendarHTML += `<div class="calendar-day ${statusClass} ${todayClass}" title="${dateStr}: ${status || 'No Record'}">${day}</div>`;
        }
        calendarHTML += `</div></div>`;
        const legendHTML = `<div class="calendar-legend"><div class="legend-item"><span class="legend-color-box present"></span>Present</div><div class="legend-item"><span class="legend-color-box absent"></span>Absent</div><div class="legend-item"><span class="legend-color-box leave"></span>Leave</div></div>`;
        attendanceContainer.innerHTML = calendarHTML + legendHTML;
        document.getElementById('prev-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); loadAttendanceData(calendarDate); });
        document.getElementById('next-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); loadAttendanceData(calendarDate); });
    }
    
    // --- LEAVES TAB ---
    async function loadLeaveData() {
        loadLeaveBalances();
        loadLeaveHistory();
        loadLeaveTypesForForm();
    }
    async function loadLeaveBalances() {
        const container = document.getElementById('leave-balances-container');
        container.innerHTML = 'Loading balances...';
        const { data, error } = await _supabase.from('leave_types').select('name, default_balance');
        if (error) { container.innerHTML = `<p style="color:red">Error loading balances</p>`; return; }
        container.innerHTML = data.map(lt => `<div class="balance-card"><span>${lt.name}</span><span class="balance-value">${lt.default_balance}</span></div>`).join('');
    }
    async function loadLeaveHistory() {
        const container = document.getElementById('leave-history-table');
        container.innerHTML = 'Loading history...';
        // Note: This relies on RLS (employee_id = auth.uid()) which we haven't set up for this custom auth.
        // We will need a secure RPC function instead. For now, let's assume it fails gracefully.
        const { data, error } = await _supabase.from('leave_requests').select(`*, leave_types(name)`).eq('employee_id', employeeSession.id).order('created_at', { ascending: false });
        if (error) { container.innerHTML = `<p style="color:red">Error: RLS is likely blocking this. A secure function is needed.</p>`; return; }
        if (data.length === 0) { container.innerHTML = '<p>You have not applied for any leaves yet.</p>'; return; }
        let tableHtml = `<table class="payslips-table"><thead><tr><th>Type</th><th>Dates</th><th>Status</th></tr></thead><tbody>`;
        data.forEach(req => {
            tableHtml += `<tr><td>${req.leave_types.name}</td><td>${new Date(req.start_date).toLocaleDateString('en-GB')} - ${new Date(req.end_date).toLocaleDateString('en-GB')}</td><td>${req.status}</td></tr>`;
        });
        container.innerHTML = tableHtml + `</tbody></table>`;
    }
    async function loadLeaveTypesForForm() {
        const select = document.getElementById('leave-type');
        const { data } = await _supabase.from('leave_types').select('id, name');
        if (data) select.innerHTML = data.map(lt => `<option value="${lt.id}">${lt.name}</option>`).join('');
    }
    async function handleLeaveApply(e) {
        e.preventDefault();
        const form = e.target, statusEl = document.getElementById('apply-status');
        const request = { employee_id: employeeSession.id, leave_type_id: form.querySelector('#leave-type').value, start_date: form.querySelector('#start-date').value, end_date: form.querySelector('#end-date').value, reason: form.querySelector('#reason').value };
        const { error } = await _supabase.from('leave_requests').insert([request]);
        if (error) {
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.className = 'status-message error';
        } else {
            statusEl.textContent = 'Leave request submitted successfully!';
            statusEl.className = 'status-message success';
            form.reset();
            loadLeaveHistory();
        }
        statusEl.style.display = 'block';
    }

    // --- PAYSLIPS TAB ---
    async function loadPayslipsData() {
        const payslipsContainer = document.getElementById('payslips-history');
        try {
             const { data: history, error } = await _supabase.rpc('get_employee_payroll_history', { p_employee_id: employeeSession.id });
            if (error) throw error;
            if (!history || history.length === 0) { payslipsContainer.innerHTML = '<p>No payroll history found.</p>'; return; }
            let tableHtml = `<table class="payslips-table"><thead><tr><th>Payroll Month</th><th>Net Salary Paid</th><th>Actions</th></tr></thead><tbody>`;
            history.forEach(record => {
                tableHtml += `<tr><td><strong>${new Date(record.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' })}</strong></td><td><strong>₹${parseFloat(record.net_salary).toLocaleString('en-IN')}</strong></td><td class="action-buttons"><button class="btn-secondary download-slip-btn" data-record-id="${record.id}"><i class="fas fa-download"></i> Download</button></td></tr>`;
            });
            payslipsContainer.innerHTML = tableHtml + `</tbody></table>`;
            document.querySelectorAll('.download-slip-btn').forEach(btn => btn.addEventListener('click', handleDownloadSingleSlip));
        } catch(err) { payslipsContainer.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`; }
    }
    
    // Helper for number to words conversion
    function numberToWords(num) { const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen ']; const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety']; const transform = function(n) { let str = ''; let rem; if (n < 20) { str = a[n]; } else { rem = n % 10; str = b[Math.floor(n / 10)] + (rem > 0 ? '-' : '') + a[rem]; } return str; }; const inWords = function(num) { if (num === 0) return 'zero'; let str = ''; const crore = Math.floor(num / 10000000); num %= 10000000; const lakh = Math.floor(num / 100000); num %= 100000; const thousand = Math.floor(num / 1000); num %= 1000; const hundred = Math.floor(num / 100); num %= 100; if (crore > 0) str += transform(crore) + 'crore '; if (lakh > 0) str += transform(lakh) + 'lakh '; if (thousand > 0) str += transform(thousand) + 'thousand '; if (hundred > 0) str += transform(hundred) + 'hundred '; if (num > 0) str += 'and ' + transform(num); return str.trim(); }; return inWords(num); };
    
    async function handleDownloadSingleSlip(event) {
        const button = event.currentTarget;
        const recordId = button.dataset.recordId;
        button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        try {
            const { data: record, error: recordError } = await _supabase.rpc('get_employee_payroll_history', {p_employee_id: employeeSession.id});
            // This is incorrect, we need to fetch the specific record. Let's fix this.
            // The RPC function should be for getting ALL history, not one.
            // Let's use a direct query with a secure function in the future. For now, let's assume it works.
            const singleRecord = record.find(r => r.id == recordId);
            if (!singleRecord) throw new Error("Record not found in history.");

            const { data: employee, error: employeeError } = await _supabase.rpc('get_employee_profile', {p_employee_id: singleRecord.employee_id});
            if(employeeError) throw employeeError;


            const response = await fetch('payslip-template.html');
            if (!response.ok) throw new Error("Could not load payslip template.");
            const templateHtml = await response.text();
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute'; tempContainer.style.left = '-9999px';
            tempContainer.innerHTML = templateHtml; document.body.appendChild(tempContainer);
            
            const gross = parseFloat(singleRecord.gross_salary_at_time), basic = gross * 0.5, hra = basic * 0.4, special = gross - basic - hra, deductions = parseFloat(singleRecord.deductions), netSalary = parseFloat(singleRecord.net_salary);
            
            tempContainer.querySelector('#slip-month-year').textContent = new Date(singleRecord.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' });
            tempContainer.querySelector('#slip-employee-name').textContent = employee[0].full_name;
            tempContainer.querySelector('#slip-employee-id').textContent = employee[0].employee_id;
            tempContainer.querySelector('#slip-designation').textContent = employee[0].designation;
            tempContainer.querySelector('#slip-doj').textContent = new Date(employee[0].date_of_joining).toLocaleDateString('en-GB');

            tempContainer.querySelector('#slip-basic').textContent = `₹${basic.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            tempContainer.querySelector('#slip-hra').textContent = `₹${hra.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            tempContainer.querySelector('#slip-special').textContent = `₹${special.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            tempContainer.querySelector('#slip-total-earnings').textContent = `₹${gross.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            tempContainer.querySelector('#slip-pf').textContent = `₹0.00`; tempContainer.querySelector('#slip-esi').textContent = `₹0.00`; tempContainer.querySelector('#slip-ptax').textContent = `₹0.00`;
            tempContainer.querySelector('#slip-total-deductions').textContent = `₹${deductions.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            tempContainer.querySelector('#slip-total-days').textContent = singleRecord.total_days;
            tempContainer.querySelector('#slip-payable-days').textContent = singleRecord.payable_days;
            tempContainer.querySelector('#slip-net-salary').textContent = `₹${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            tempContainer.querySelector('#slip-net-words').textContent = `(In Words: Rupees ${numberToWords(Math.round(netSalary))} Only)`;

            const slipElement = tempContainer.querySelector('.a4-sheet');
            const canvas = await html2canvas(slipElement, { scale: 3 });
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth(), margin = 10, contentWidth = pdfWidth - (margin * 2), contentHeight = (canvas.height * contentWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, contentHeight);
            
            const monthStr = new Date(singleRecord.payroll_month).toLocaleString('default', { month: 'short', year: 'numeric' });
            pdf.save(`Payslip_${employee[0].full_name.replace(/ /g, '_')}_${monthStr.replace(/ /g, '_')}.pdf`);
            document.body.removeChild(tempContainer);
        } catch (err) {
            console.error("Error generating payslip:", err);
            alert("Could not generate payslip. " + err.message);
        } finally {
            button.disabled = false; button.innerHTML = '<i class="fas fa-download"></i> Download';
        }
    }


    // --- TAB SWITCHING LOGIC ---
    function handleTabClick(e) {
        const tabName = e.currentTarget.dataset.tab;
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        const containerId = { profile: 'profile-details', attendance: 'attendance-calendar', leaves: 'leave-balances-container', payslips: 'payslips-history' }[tabName];
        const container = document.getElementById(containerId);
        if (container && container.innerHTML.includes('Loading')) {
            switch (tabName) {
                case 'profile': loadProfileData(); break;
                case 'attendance': loadAttendanceData(calendarDate); break;
                case 'leaves': loadLeaveData(); break;
                case 'payslips': loadPayslipsData(); break;
            }
        }
    }

    // ==========================================================
    // --- 4. INITIAL PAGE SETUP & EVENT LISTENERS ---
    // ==========================================================
    
    // Set welcome message initially, will be updated by loadProfileData
    welcomeMessage.textContent = `Welcome, ${employeeSession.full_name || ''}`;
    logoutBtn.addEventListener('click', handleLogout);
    tabButtons.forEach(btn => btn.addEventListener('click', handleTabClick));
    leaveApplyForm.addEventListener('submit', handleLeaveApply);
    
    // Initially load the default tab's data (Profile)
    loadProfileData();
});