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
        setText('project-solution', project.solution);
        
        // Sidebar / Details
        setText('project-client', project.client);
        setText('project-location', project.location);
        setText('project-year', project.year);
        setText('project-type', project.type);
        setText('project-scope', project.scope);

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
        if(content) content.style.display = 'none';
    }
});

// Helper to safely set text
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}