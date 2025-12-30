// Replace the entire loadPayrollData function in erp/payroll.js

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

        // 1. Fetch all necessary data in parallel
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
        
        // 2. Process attendance into counts per employee
        const attendanceByEmployee = attendance.reduce((acc, record) => {
            if (!acc[record.employee_id]) acc[record.employee_id] = { present: 0, leave: 0 };
            if (record.status === 'Present') acc[record.employee_id].present++;
            if (record.status === 'Leave') acc[record.employee_id].leave++; // Also count leave days
            return acc;
        }, {});
        
        // 3. Generate the payroll preview for each employee
        payrollPreviewData = [];
        for (const employee of employees) {
            
            // 4. --- NEW: Fetch remaining leave balance for THIS employee ---
            const { data: balances, error: balanceError } = await _supabase.rpc('get_employee_leave_balances', {
                p_employee_id: employee.id
            });
            if (balanceError) throw balanceError;

            // Sum up all remaining balances across all leave types
            const totalRemainingLeaveBalance = balances.reduce((sum, b) => sum + b.remaining_balance, 0);
            
            // Get attendance counts for this employee
            const presentDays = attendanceByEmployee[employee.id]?.present || 0;
            const leaveDays = attendanceByEmployee[employee.id]?.leave || 0;

            // 5. --- NEW: Intelligent Payable Days Calculation ---
            // Paid leave days are the MINIMUM of leave days taken and leave balance available.
            const paidLeaveDays = Math.min(leaveDays, totalRemainingLeaveBalance);
            const unpaidLeaveDays = leaveDays - paidLeaveDays; // Any leaves taken beyond the balance are unpaid.
            
            // Final payable days are present days + paid leave days.
            const payableDays = presentDays + paidLeaveDays;

            // 6. Calculate salary based on the new payable days
            const grossSalary = employee.gross_salary || 0;
            const netSalary = (grossSalary > 0 && totalDaysInMonth > 0) ? (grossSalary / totalDaysInMonth) * payableDays : 0;
            
            // Check if this month's payroll was already processed
            const historyRecord = isProcessed ? processedPayroll.find(p => p.employee_id === employee.id) : null;

            payrollPreviewData.push({
                employeeId: employee.id, employeeName: employee.full_name, totalDays: totalDaysInMonth,
                payableDays: historyRecord ? historyRecord.payable_days : payableDays,
                grossSalary: historyRecord ? parseFloat(historyRecord.gross_salary_at_time) : grossSalary,
                deductions: historyRecord ? parseFloat(historyRecord.deductions) : 0,
                netSalary: historyRecord ? parseFloat(historyRecord.net_salary) : netSalary,
                status: historyRecord ? historyRecord.status : 'Pending', payrollMonth: startDate,
                employeeCode: employee.employee_id, designation: employee.designation, dateOfJoining: employee.date_of_joining,
                accountNumber: employee.bank_account_number, accountHolder: employee.bank_account_holder_name, ifscCode: employee.bank_ifsc_code
            });
        }
        
        // 7. Render the final table
        renderPayrollTable(payrollPreviewData);

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">Error: ${error.message}</td></tr>`;
    } finally {
        loadBtn.disabled = false; loadBtn.innerHTML = '<i class="fas fa-cogs"></i> Load Payroll Data';
    }
}