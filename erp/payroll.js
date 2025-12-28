document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION ---
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) { window.location.href = 'index.html'; return; }
        initializeApp();
    }
    
    // ==========================================================
    // --- HELPER FUNCTIONS ---
    // ==========================================================
    
    function setDefaultMonth() {
        const monthInput = document.getElementById('payroll-month');
        if (!monthInput) return;
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        monthInput.value = `${year}-${month}`;
    }

    function numberToWords(num) {
        const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
        const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
        const transform = function(n) { let str = ''; let rem; if (n < 20) { str = a[n]; } else { rem = n % 10; str = b[Math.floor(n / 10)] + (rem > 0 ? '-' : '') + a[rem]; } return str; };
        const inWords = function(num) { if (num === 0) return 'zero'; let str = ''; const crore = Math.floor(num / 10000000); num %= 10000000; const lakh = Math.floor(num / 100000); num %= 100000; const thousand = Math.floor(num / 1000); num %= 1000; const hundred = Math.floor(num / 100); num %= 100; if (crore > 0) str += transform(crore) + 'crore '; if (lakh > 0) str += transform(lakh) + 'lakh '; if (thousand > 0) str += transform(thousand) + 'thousand '; if (hundred > 0) str += transform(hundred) + 'hundred '; if (num > 0) str += 'and ' + transform(num); return str.trim(); };
        return inWords(num);
    }

    // ==========================================================
    // --- MAIN APP LOGIC ---
    // ==========================================================
    function initializeApp() {
        const monthInput = document.getElementById('payroll-month');
        const loadBtn = document.getElementById('load-payroll-btn');
        const tableBody = document.getElementById('payroll-table-body');
        const actionsContainer = document.getElementById('payroll-actions');
        const processBtn = document.getElementById('process-payroll-btn');
        const revertBtn = document.getElementById('revert-payroll-btn');
        const slipsBtn = document.getElementById('generate-slips-btn');
        const exportBtn = document.getElementById('export-csv-btn');
        const payrollStatusEl = document.getElementById('payroll-status');
        
        let payrollPreviewData = [];
        let isProcessed = false;
        
        async function loadPayrollData() {
            const monthYear = monthInput.value;
            if (!monthYear) { alert('Please select a month and year.'); return; }

            loadBtn.disabled = true; loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Fetching data...</td></tr>`;
            actionsContainer.style.display = 'none'; payrollStatusEl.style.display = 'none'; isProcessed = false;

            try {
                const [year, month] = monthYear.split('-');
                const startDate = `${year}-${month}-01`;
                const endDate = new Date(year, month, 0).toISOString().split('T')[0];
                const totalDaysInMonth = new Date(year, month, 0).getDate();

                const [
                    { data: employees, error: empError },
                    { data: attendance, error: attError },
                    { data: processedPayroll, error: histError }
                ] = await Promise.all([
                    _supabase.from('employees').select('id, employee_id, full_name, designation, date_of_joining, gross_salary, bank_account_number, bank_account_holder_name, bank_ifsc_code').eq('is_active', true),
                    _supabase.from('attendance').select('employee_id, status').gte('attendance_date', startDate).lte('attendance_date', endDate),
                    _supabase.from('payroll_history').select('*').eq('payroll_month', startDate)
                ]);

                if (empError) throw empError; if (attError) throw attError; if (histError) throw histError;
                isProcessed = processedPayroll.length > 0;
                
                const attendanceByEmployee = attendance.reduce((acc, record) => {
                    if (!acc[record.employee_id]) acc[record.employee_id] = { present: 0 };
                    if (record.status === 'Present') acc[record.employee_id].present++;
                    return acc;
                }, {});
                
                payrollPreviewData = employees.map(employee => {
                    const payableDays = attendanceByEmployee[employee.id]?.present || 0;
                    const grossSalary = employee.gross_salary || 0;
                    const netSalary = (grossSalary > 0 && totalDaysInMonth > 0) ? (grossSalary / totalDaysInMonth) * payableDays : 0;
                    const historyRecord = isProcessed ? processedPayroll.find(p => p.employee_id === employee.id) : null;

                    return {
                        employeeId: employee.id, employeeName: employee.full_name, totalDays: totalDaysInMonth,
                        payableDays: historyRecord ? historyRecord.payable_days : payableDays,
                        grossSalary: historyRecord ? parseFloat(historyRecord.gross_salary_at_time) : grossSalary,
                        deductions: historyRecord ? parseFloat(historyRecord.deductions) : 0,
                        netSalary: historyRecord ? parseFloat(historyRecord.net_salary) : netSalary,
                        status: historyRecord ? historyRecord.status : 'Pending', payrollMonth: startDate,
                        employeeCode: employee.employee_id, designation: employee.designation, dateOfJoining: employee.date_of_joining,
                        accountNumber: employee.bank_account_number, accountHolder: employee.bank_account_holder_name, ifscCode: employee.bank_ifsc_code
                    };
                });
                renderPayrollTable(payrollPreviewData);
            } catch (error) { tableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">Error: ${error.message}</td></tr>`;
            } finally { loadBtn.disabled = false; loadBtn.innerHTML = '<i class="fas fa-cogs"></i> Load Payroll Data'; }
        }

        function renderPayrollTable(data) {
             tableBody.innerHTML = '';
            if (data.length === 0) { tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No active employees found.</td></tr>`; return; }
            data.forEach(p => {
                const tr = document.createElement('tr');
                const isStatusProcessed = p.status === 'Processed';
                const statusBadge = isStatusProcessed ? `<span class="status-badge" style="background-color: #dcfce7; color: #15803d;">Processed</span>` : `<span class="status-badge" style="background-color: #fef9c3; color: #854d0e;">Pending</span>`;
                tr.innerHTML = `<td><strong>${p.employeeName}</strong></td><td>${p.totalDays}</td><td>${p.payableDays}</td><td>₹${p.grossSalary.toLocaleString('en-IN')}</td><td>₹${p.deductions.toLocaleString('en-IN')}</td><td><strong>₹${p.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td><td>${statusBadge}</td>`;
                tableBody.appendChild(tr);
            });
            actionsContainer.style.display = 'flex';
            if (isProcessed) {
                processBtn.style.display = 'none'; revertBtn.style.display = 'inline-flex';
                slipsBtn.disabled = false; exportBtn.disabled = false;
            } else {
                processBtn.style.display = 'inline-flex'; revertBtn.style.display = 'none';
                slipsBtn.disabled = true; exportBtn.disabled = true; processBtn.disabled = false;
            }
        }
        
        async function handleProcessPayroll() {
            if (!confirm(`Process payroll for ${monthInput.value}? This will save the records.`)) return;
            processBtn.disabled = true; processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            const recordsToSave = payrollPreviewData.map(p => ({ employee_id: p.employeeId, payroll_month: p.payrollMonth, total_days: p.totalDays, payable_days: p.payableDays, gross_salary_at_time: p.grossSalary, deductions: p.deductions, net_salary: p.netSalary, status: 'Processed' }));
            const { error } = await _supabase.from('payroll_history').upsert(recordsToSave, { onConflict: 'employee_id, payroll_month' });
            if (error) {
                payrollStatusEl.textContent = `Error: ${error.message}`; payrollStatusEl.className = 'status-message error'; processBtn.disabled = false;
            } else {
                payrollStatusEl.textContent = 'Payroll processed and saved successfully!'; payrollStatusEl.className = 'status-message success'; await loadPayrollData();
            }
            payrollStatusEl.style.display = 'block'; processBtn.innerHTML = '<i class="fas fa-check-circle"></i> Process Payroll';
        }

        async function handleRevertPayroll() {
            if (!confirm(`DANGER: This will permanently delete the processed payroll records for ${monthInput.value}. Are you sure?`)) return;
            revertBtn.disabled = true; revertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reverting...';
            const [year, month] = monthInput.value.split('-');
            const payrollMonth = `${year}-${month}-01`;
            const { error } = await _supabase.from('payroll_history').delete().eq('payroll_month', payrollMonth);
            if (error) {
                payrollStatusEl.textContent = `Error: ${error.message}`; payrollStatusEl.className = 'status-message error'; revertBtn.disabled = false;
            } else {
                payrollStatusEl.textContent = 'Payroll reverted successfully.'; payrollStatusEl.className = 'status-message success'; await loadPayrollData();
            }
            payrollStatusEl.style.display = 'block'; revertBtn.innerHTML = '<i class="fas fa-undo"></i> Revert Process'; revertBtn.disabled = false;
        }

        async function handleGenerateSlips() {
            if (!isProcessed || payrollPreviewData.length === 0) { alert("Please load and process payroll before generating slips."); return; }
            if (!confirm(`This will generate and download ${payrollPreviewData.length} payslip(s). Continue?`)) return;
            slipsBtn.disabled = true; slipsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            const template = document.getElementById('payslip-template');

            for (const employee of payrollPreviewData) {
                document.getElementById('slip-month-year').textContent = new Date(employee.payrollMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
                document.getElementById('slip-employee-name').textContent = employee.employeeName;
                document.getElementById('slip-employee-id').textContent = employee.employeeCode || 'N/A';
                document.getElementById('slip-designation').textContent = employee.designation || 'N/A';
                document.getElementById('slip-doj').textContent = new Date(employee.dateOfJoining).toLocaleDateString('en-GB');
                const grossSalaryFormatted = `₹${employee.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                document.getElementById('slip-gross').textContent = grossSalaryFormatted;
                document.getElementById('slip-total-earnings').textContent = grossSalaryFormatted;
                const deductionsFormatted = `₹${employee.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                document.getElementById('slip-deductions').textContent = deductionsFormatted;
                document.getElementById('slip-total-deductions').textContent = deductionsFormatted;
                document.getElementById('slip-total-days').textContent = employee.totalDays;
                document.getElementById('slip-payable-days').textContent = employee.payableDays;
                const netSalary = employee.netSalary;
                document.getElementById('slip-net-salary').textContent = `₹${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                document.getElementById('slip-net-words').textContent = `(In Words: Rupees ${numberToWords(Math.round(netSalary))} Only)`;

                const canvas = await html2canvas(template, { scale: 3 });
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight();
                const margin = 10; const contentWidth = pdfWidth - (margin * 2); const contentHeight = (canvas.height * contentWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
                const monthStr = new Date(employee.payrollMonth).toLocaleString('default', { month: 'short', year: 'numeric' });
                const fileName = `Payslip_${employee.employeeName.replace(/ /g, '_')}_${monthStr.replace(/ /g, '_')}.pdf`;
                pdf.save(fileName);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            slipsBtn.disabled = false; slipsBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generate Slips';
        }

        // ==========================================================
        // --- THIS FUNCTION WAS MISSING ---
        // ==========================================================
        function handleExport() {
            if (payrollPreviewData.length === 0) {
                alert("No payroll data to export.");
                return;
            }

            const escapeCsvCell = (cell) => {
                const str = String(cell ?? ''); // Handle null/undefined
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            const headers = [ "Beneficiary Account Number", "Beneficiary Name", "IFSC Code", "Amount", "Narration" ];
            const monthYear = new Date(monthInput.value + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });
            const narration = `Salary for ${monthYear}`;
            const rows = payrollPreviewData.map(p => [
                p.accountNumber || '',
                p.accountHolder || p.employeeName,
                p.ifscCode || '',
                p.netSalary.toFixed(2),
                narration
            ].map(escapeCsvCell).join(','));
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const filenameDate = monthInput.value.replace('-', '_');
            link.setAttribute("download", `Payroll_Bank_Sheet_${filenameDate}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // --- Event Listeners ---
        loadBtn.addEventListener('click', loadPayrollData);
        processBtn.addEventListener('click', handleProcessPayroll);
        revertBtn.addEventListener('click', handleRevertPayroll);
        slipsBtn.addEventListener('click', handleGenerateSlips);
        // --- THIS EVENT LISTENER WAS MISSING ---
        exportBtn.addEventListener('click', handleExport);
        
        // --- Initial Load ---
        setDefaultMonth();
    }

    checkAuthAndLoad();
});