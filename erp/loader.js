// erp/loader.js

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
async function handleLogout() {
    // This script runs after config.js and supabase.js are loaded, so they are available
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    
    // Sign out the user
    const { error } = await _supabase.auth.signOut();
    
    if (error) {
        console.error('Error logging out:', error);
        alert('Failed to log out. Please try again.');
    } else {
        // Redirect to the ERP login page on successful logout
        window.location.href = 'index.html';
    }
}

// --- Main execution block that runs on every ERP page ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load the sidebar component. This must finish before we can add the event listener.
    await loadComponent('erp-sidebar', 'sidebar.html');

    // 2. Now that the sidebar is loaded, find the logout button and attach the event listener.
    const logoutBtn = document.getElementById('erp-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});