// erp/loader.js (Secure Version)

// --- Function to load shared HTML components ---
async function loadComponent(elementId, filePath) {
    try {
        const element = document.getElementById(elementId);
        if (!element) return;
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Could not load ${filePath}`);
        const html = await response.text();
        element.innerHTML = html;
    } catch (error) {
        console.error(`Failed to load component:`, error);
    }
}

// --- Function to handle the logout action ---
async function handleLogout(supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
        alert('Failed to log out. Please try again.');
    } else {
        window.location.href = 'index.html';
    }
}

// ==========================================================
// --- NEW, CRITICAL SECURITY CHECK ---
// ==========================================================
async function enforceAdminAccess() {
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();

    // 1. If there's no session, redirect to login.
    if (!session || sessionError) {
        window.location.href = 'index.html';
        return false; // Indicate that access is denied
    }

    // 2. Get the user's role from their metadata.
    const userRole = session.user.app_metadata?.role;

    // 3. Define who is allowed to access the ERP.
    const allowedRoles = ['Super Admin', 'Admin', 'Editor'];

    // 4. If the user's role is NOT in the allowed list, log them out and redirect.
    if (!allowedRoles.includes(userRole)) {
        console.warn(`Access Denied: User with role '${userRole || 'None'}' attempted to access ERP.`);
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
        return false; // Indicate that access is denied
    }

    // 5. If the user has a valid role, allow them to proceed.
    return true; // Indicate that access is granted
}

// --- Main execution block that runs on every ERP page ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Run the security check FIRST.
    const hasAccess = await enforceAdminAccess();

    // 2. If access is denied, stop executing any more code on this page.
    if (!hasAccess) {
        return;
    }
    
    // 3. If access is granted, proceed with loading the page as normal.
    await loadComponent('erp-sidebar', 'sidebar.html');

    const logoutBtn = document.getElementById('erp-logout-btn');
    if (logoutBtn) {
        // We need to create the client again to pass it to the logout function
        const { createClient } = supabase;
        const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        logoutBtn.addEventListener('click', () => handleLogout(_supabase));
    }
});