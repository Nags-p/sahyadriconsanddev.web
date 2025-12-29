// portal/portal.js - The Main Orchestrator

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. INITIALIZE SUPABASE CLIENT ---
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    
    // --- 2. AUTHENTICATION & INITIALIZATION ---
    let employeeSession = null;

    async function checkAuthAndInitialize() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }

        const sessionData = sessionStorage.getItem('employeeSession');
        if (!sessionData) {
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
            return;
        }
        
        employeeSession = JSON.parse(sessionData);
        runApp();
    }

    // --- 3. MAIN APP LOGIC ---
    function runApp() {
        const welcomeMessage = document.getElementById('welcome-message');
        const logoutBtn = document.getElementById('logout-btn');
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        function handleLogout() {
            sessionStorage.removeItem('employeeSession');
            _supabase.auth.signOut();
            window.location.href = 'index.html';
        }

        // --- EVENT LISTENERS & INITIALIZATION ---
        
        welcomeMessage.textContent = `Welcome, ${employeeSession.full_name || 'Employee'}`;
        logoutBtn.addEventListener('click', handleLogout);
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                
                // UI updates for tabs
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById(`tab-${tabName}`).classList.add('active');
                
                // This is the orchestrator logic. It calls functions from the other files.
                switch (tabName) {
                    case 'profile':
                        loadProfileData(_supabase, employeeSession);
                        break;
                    case 'attendance':
                        // The attendance.js file manages its own date state
                        loadAttendanceData(_supabase, employeeSession, calendarDate);
                        break;
                    case 'leaves':
                        // We only need to initialize the leave tab once
                        initializeLeaveTab(_supabase, employeeSession);
                        break;
                    case 'payslips':
                        loadPayslipsData(_supabase, employeeSession);
                        break;
                }
            });
        });
        
        // Trigger a click on the default tab to load its content
        document.querySelector('.tab-btn.active').click();
    }
    
    // --- START THE APPLICATION ---
    checkAuthAndInitialize();
});