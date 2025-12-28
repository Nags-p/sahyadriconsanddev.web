// erp/loader.js
async function loadComponent(elementId, filePath) {
    try {
        const element = document.getElementById(elementId);
        if (!element) return;

        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Could not load ${filePath}`);
        
        const html = await response.text();
        element.innerHTML = html;
        
        // The script inside sidebar.html will run automatically when injected
    } catch (error) {
        console.error(`Failed to load component:`, error);
    }
}

// Load the sidebar when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadComponent('erp-sidebar', 'sidebar.html');
});