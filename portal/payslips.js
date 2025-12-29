// portal/payslips.js

async function loadPayslipsData(supabase, employeeSession) {
    const payslipsContainer = document.getElementById('payslips-history');
    try {
        const { data: history, error } = await supabase.rpc('get_employee_payroll_history', { p_employee_id: employeeSession.id });
        if (error) throw error;
        if (!history || history.length === 0) { payslipsContainer.innerHTML = '<p>No payroll history found.</p>'; return; }
        let tableHtml = `<table class="payslips-table"><thead><tr><th>Payroll Month</th><th>Net Salary Paid</th><th>Actions</th></tr></thead><tbody>`;
        history.forEach(record => {
            tableHtml += `<tr><td><strong>${new Date(record.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' })}</strong></td><td><strong>₹${parseFloat(record.net_salary).toLocaleString('en-IN')}</strong></td><td class="action-buttons"><button class="btn-secondary download-slip-btn" data-record-id="${record.id}"><i class="fas fa-download"></i> Download</button></td></tr>`;
        });
        payslipsContainer.innerHTML = tableHtml + `</tbody></table>`;
        document.querySelectorAll('.download-slip-btn').forEach(btn => btn.addEventListener('click', (e) => handleDownloadSingleSlip(e, supabase, employeeSession)));
    } catch(err) {
        payslipsContainer.innerHTML = `<p style="color: red;">Error loading payslips: ${err.message}</p>`;
    }
}

async function handleDownloadSingleSlip(event, supabase, employeeSession) {
    const button = event.currentTarget;
    const recordId = button.dataset.recordId;
    button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    try {
        const { data: history, error: historyError } = await supabase.rpc('get_employee_payroll_history', { p_employee_id: employeeSession.id });
        if (historyError) throw historyError;
        
        const singleRecord = history.find(r => r.id == recordId);
        if (!singleRecord) throw new Error("Record not found in history.");

        const { data: employeeData, error: employeeError } = await supabase.rpc('get_employee_profile', {p_employee_id: singleRecord.employee_id});
        if(employeeError || !employeeData || employeeData.length === 0) throw employeeError || new Error("Employee details not found.");
        const employee = employeeData[0];

        const response = await fetch('payslip-template.html');
        if (!response.ok) throw new Error("Could not load payslip template.");
        const templateHtml = await response.text();
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute'; tempContainer.style.left = '-9999px';
        tempContainer.innerHTML = templateHtml; document.body.appendChild(tempContainer);
        
        const gross = parseFloat(singleRecord.gross_salary_at_time), basic = gross * 0.5, hra = basic * 0.4, special = gross - basic - hra, deductions = parseFloat(singleRecord.deductions), netSalary = parseFloat(singleRecord.net_salary);
        
        tempContainer.querySelector('#slip-month-year').textContent = new Date(singleRecord.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' });
        tempContainer.querySelector('#slip-employee-name').textContent = employee.full_name;
        tempContainer.querySelector('#slip-employee-id').textContent = employee.employee_id;
        tempContainer.querySelector('#slip-designation').textContent = employee.designation;
        tempContainer.querySelector('#slip-doj').textContent = new Date(employee.date_of_joining).toLocaleDateString('en-GB');
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
        pdf.save(`Payslip_${employee.full_name.replace(/ /g, '_')}_${monthStr.replace(/ /g, '_')}.pdf`);
        document.body.removeChild(tempContainer);
    } catch (err) {
        console.error("Error generating payslip:", err);
        alert("Could not generate payslip. " + err.message);
    } finally {
        button.disabled = false; button.innerHTML = '<i class="fas fa-download"></i> Download';
    }
}