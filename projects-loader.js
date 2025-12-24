// projects-loader.js - Powers the All Projects page

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('all-projects-grid');
    const filtersContainer = document.querySelector('.project-filters');

    if (!grid || !filtersContainer) return;

    grid.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">Loading portfolio...</p>';

    try {
        const { data: projects, error } = await _supabase
            .from('projects')
            .select('id, title, type, scope, gallery_images')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Populate Filters dynamically
        const types = ['All', ...new Set(projects.map(p => p.type).filter(Boolean))];
        filtersContainer.innerHTML = types.map((type, index) => 
            `<button class="filter-btn ${index === 0 ? 'active' : ''}" data-filter="${type.toLowerCase()}">${type}</button>`
        ).join('');

        // Initial Render
        renderAllProjects(projects);

        // Add Filter Event Listeners
        const filterBtns = filtersContainer.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                const filteredProjects = filter === 'all'
                    ? projects
                    : projects.filter(p => p.type && p.type.toLowerCase() === filter);
                renderAllProjects(filteredProjects);
            });
        });

    } catch (err) {
        console.error('Error loading all projects:', err);
        grid.innerHTML = '<p style="text-align:center; color:red; grid-column: 1 / -1;">Could not load portfolio.</p>';
    }
});

function renderAllProjects(projectList) {
    const grid = document.getElementById('all-projects-grid');
    grid.innerHTML = '';

    if (projectList.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">No projects found for this category.</p>';
        return;
    }

    projectList.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-item reveal';
        const thumbnailUrl = (project.gallery_images && project.gallery_images.length > 0) ? project.gallery_images[0] : 'images/project-placeholder.jpg';
        
        card.innerHTML = `
            <img src="${thumbnailUrl}" alt="${project.title}" loading="lazy">
            <div class="project-overlay">
                <h3>${project.title}</h3>
                <p>${project.type || 'Project'} • ${project.scope || 'Details'}</p>
                <a href="project-page.html?id=${project.id}" class="btn btn-primary btn-sm">View Details</a>
            </div>
        `;
        grid.appendChild(card);
    });

    // Re-initialize animations for new elements
    if (typeof initScrollAnimations === 'function') {
        initScrollAnimations();
    }
}