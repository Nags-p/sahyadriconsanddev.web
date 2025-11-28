// project.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = parseInt(urlParams.get('id'));

    // 2. Find Project in Data
    const project = projectsData.find(p => p.id === projectId);

    // 3. Populate HTML
    if (project) {
        document.title = `${project.title} - Sahyadri Constructions`;

        // Text Content
        setText('project-title', project.title);
        setText('project-subtitle', project.subtitle);
        setText('project-vision', project.vision);
        setText('project-challenge', project.challenge);
        setText('project-solution', project.solution);
        setText('project-results', project.results);

        // Sidebar / Details
        setText('project-client', project.client);
        setText('project-location', project.location);
        setText('project-year', project.year);
        setText('project-type', project.type);
        setText('project-scope', project.scope);

        // Hero pills
        setText('project-type-pill', project.type);
        setText('project-year-pill', project.year);
        setText('project-scope-pill', project.scope);
        setText('project-location-pill', project.location);

        // Services List
        const servicesList = document.getElementById('project-services-list');
        if (servicesList) {
            servicesList.innerHTML = '';
            (project.services || []).forEach(service => {
                const li = document.createElement('li');
                li.textContent = service;
                servicesList.appendChild(li);
            });

            if (!project.services || project.services.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Turnkey design & build services';
                servicesList.appendChild(li);
            }
        }

        // Images
        const gallery = document.getElementById('project-gallery');
        if (gallery) {
            gallery.innerHTML = ''; // Clear loading text
            project.galleryImages.forEach(imgSrc => {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = project.title;
                img.classList.add('reveal'); // Add animation class
                gallery.appendChild(img);
            });
        }
    } else {
        // Handle Not Found
        setText('project-title', 'Project Not Found');
        setText('project-subtitle', 'The project you are looking for does not exist.');
        const content = document.querySelector('.project-info-grid');
        if (content) content.style.display = 'none';
    }
});

// Helper to safely set text
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}