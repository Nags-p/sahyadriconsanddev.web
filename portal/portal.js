// portal/portal.js - The Main Orchestrator (Logout Fix)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Supabase Client
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    
    // 2. Authentication Check & Initialization
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

    // 3. Main App Logic
    function runApp() {
        const welcomeMessage = document.getElementById('welcome-message');
        const logoutBtn = document.getElementById('logout-btn');
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        // ==========================================================
        // --- THIS IS THE FIX ---
        // All event listeners are now correctly placed inside runApp
        // ==========================================================

        function handleLogout() {
            sessionStorage.removeItem('employeeSession');
            _supabase.auth.signOut();
            window.location.href = 'index.html';
        }

        // --- ATTACH ALL EVENT LISTENERS ONCE ---
        
        welcomeMessage.textContent = `Welcome, ${employeeSession.full_name || 'Employee'}`;
        logoutBtn.addEventListener('click', handleLogout); // Correctly attached here
        
        // Initialize the leave form listeners
        initializeLeaveTab(_supabase, employeeSession);

        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.getElementById(`tab-${tabName}`).classList.add('active');
                
                // Call the correct data loading function for the selected tab
                switch (tabName) {
                    case 'profile':
                        loadProfileData(_supabase, employeeSession);
                        break;
                    case 'attendance':
                        loadAttendanceData(_supabase, employeeSession, calendarDate);
                        break;
                    case 'leaves':
                        loadLeaveData(_supabase, employeeSession);
                        break;
                    case 'payslips':
                        loadPayslipsData(_supabase, employeeSession);
                        break;
                }
            });
        });
        
        // Trigger the first tab to load its content
        document.querySelector('.tab-btn.active').click();
    }
    
    // --- START THE APPLICATION ---
    checkAuthAndInitialize();
});