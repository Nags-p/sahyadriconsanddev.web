// portal/attendance.js

let calendarDate = new Date(); // State for the attendance calendar

async function loadAttendanceData(supabase, employeeSession, date) {
    const attendanceContainer = document.getElementById('attendance-calendar');
    const summaryContainer = document.getElementById('attendance-summary');
    attendanceContainer.innerHTML = '<p class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading calendar...</p>';
    summaryContainer.innerHTML = '<p class="loading-placeholder">Calculating...</p>';
    const year = date.getFullYear(), month = date.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
        const { data, error } = await supabase.rpc('get_employee_attendance', {
            p_employee_id: employeeSession.id,
            p_start_date: startDate,
            p_end_date: endDate
        });
        if (error) throw error;
        
        const stats = { present: 0, absent: 0, leave: 0 };
        (data || []).forEach(record => {
            const statusKey = record.status.toLowerCase();
            if (stats.hasOwnProperty(statusKey)) stats[statusKey]++;
        });

        summaryContainer.innerHTML = `
            <div class="stat-card-mini present"><h4>Present Days</h4><p>${stats.present}</p></div>
            <div class="stat-card-mini leave"><h4>On Leave</h4><p>${stats.leave}</p></div>
            <div class="stat-card-mini absent"><h4>LOP Days</h4><p>${stats.absent}</p></div>
        `;
        
        const attendanceMap = new Map((data || []).map(rec => [rec.attendance_date, rec.status]));
        renderCalendar(supabase, employeeSession, year, month, attendanceMap);
    } catch (err) {
        attendanceContainer.innerHTML = `<p style="color:red;">Error loading attendance: ${err.message}</p>`;
        summaryContainer.innerHTML = `<p style="color:red;">Error loading stats.</p>`;
    }
}

function renderCalendar(supabase, employeeSession, year, month, attendanceMap) {
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
    document.getElementById('prev-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); loadAttendanceData(supabase, employeeSession, calendarDate); });
    document.getElementById('next-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); loadAttendanceData(supabase, employeeSession, calendarDate); });
}