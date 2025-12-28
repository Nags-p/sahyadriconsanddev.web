document.addEventListener('DOMContentLoaded', () => {
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        initializeApp();
    }

    function initializeApp() {
        // --- Get DOM Elements ---
        const totalEmployeesEl = document.getElementById('stat-total-employees');
        const activeProjectsEl = document.getElementById('stat-active-projects');
        const onLeaveEl = document.getElementById('stat-on-leave');
        const dateEl = document.getElementById('dashboard-date');

        // --- Set current date ---
        const today = new Date();
        dateEl.textContent = today.toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const todayISO = today.toISOString().split('T')[0];

        // --- Fetch all data in parallel ---
        async function loadDashboardStats() {
            // Set loading states
            totalEmployeesEl.textContent = '...';
            activeProjectsEl.textContent = '...';
            onLeaveEl.textContent = '...';

            try {
                const [
                    employeeCount,
                    projectCount,
                    leaveCount
                ] = await Promise.all([
                    _supabase.from('employees').select('id', { count: 'exact' }).eq('is_active', true),
                    _supabase.from('erp_projects').select('id', { count: 'exact' }).eq('status', 'Active'),
                    _supabase.from('attendance').select('id', { count: 'exact' }).eq('attendance_date', todayISO).eq('status', 'Leave')
                ]);

                // Update UI with fetched data
                totalEmployeesEl.textContent = employeeCount.count || 0;
                activeProjectsEl.textContent = projectCount.count || 0;
                onLeaveEl.textContent = leaveCount.count || 0;

            } catch (error) {
                console.error("Error loading dashboard stats:", error);
                totalEmployeesEl.textContent = 'Error';
                activeProjectsEl.textContent = 'Error';
                onLeaveEl.textContent = 'Error';
            }
        }

        // --- Initial Load ---
        loadDashboardStats();
    }

    checkAuthAndLoad();
});