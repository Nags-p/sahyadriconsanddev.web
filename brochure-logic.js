// brochure-logic.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- SUPABASE CONFIG (You can also use a shared config.js file if you have one) ---
    const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJI"UzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const projectGrid = document.getElementById('brochure-project-grid');
    if (!projectGrid) return;

    try {
        // Fetch the 4 most recent, featured projects
        const { data: projects, error } = await _supabase
            .from('projects')
            .select('title, scope, gallery_images')
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(4);

        if (error) throw error;
        
        projectGrid.innerHTML = ''; // Clear any placeholder content

        if (projects.length === 0) {
            projectGrid.innerHTML = '<p>No featured projects available to display.</p>';
            return;
        }

        // Populate the grid with the fetched projects
        projects.forEach(project => {
            const thumbnailUrl = (project.gallery_images && project.gallery_images.length > 0) ? project.gallery_images[0] : '';
            
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `
                <img src="${thumbnailUrl}" alt="${project.title}">
                <h4>${project.title}</h4>
                <p>${project.scope || 'Details'}</p>
            `;
            projectGrid.appendChild(projectItem);
        });

    } catch (err) {
        console.error('Error fetching projects for brochure:', err);
        projectGrid.innerHTML = '<p style="color: red;">Could not load project data.</p>';
    }
});