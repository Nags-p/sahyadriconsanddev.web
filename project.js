// project.js
// Add this helper function at the top of project.js
function getVideoEmbedUrl(url) {
    if (!url) return null;
    let videoId;
    
    // YouTube
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
        videoId = youtubeMatch[1];
        return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    
    // Vimeo
    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[3]) {
        videoId = vimeoMatch[3];
        return `https://player.vimeo.com/video/${videoId}`;
    }
    
    return null; // Return null if it's not a recognized YouTube or Vimeo URL
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = parseInt(urlParams.get('id'));

    if (isNaN(projectId)) {
        displayProjectError('Invalid Project ID.');
        return;
    }

    try {
        // 2. Initialize Supabase Client
        // Note: Assumes main.js has already initialized the global _supabase client
        if (typeof _supabase === 'undefined') {
            console.error('Supabase client not found. Make sure main.js is loaded.');
            displayProjectError('Configuration error.');
            return;
        }

        // 3. Find Project in Supabase
        const { data: project, error } = await _supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('is_active', true)
            .single();

        if (error || !project) {
            throw new Error(error ? error.message : 'Project not found.');
        }

        
    // --- ADD THIS NEW VIDEO LOGIC ---
    const videoContainer = document.getElementById('project-video-container');
    const videoIframe = document.getElementById('project-video-iframe');
    
    if (project.video_url && videoContainer && videoIframe) {
        const embedUrl = getVideoEmbedUrl(project.video_url);
        if (embedUrl) {
            videoIframe.src = embedUrl;
            videoContainer.style.display = 'block'; // Show the video player
        }
    }

        // 4. Populate HTML if project is found
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
        setText('project-scope', project.scope);

        
        setText('project-type-pill', project.type);

        // Services List
        const servicesList = document.getElementById('project-services-list');
        if (servicesList) {
            servicesList.innerHTML = '';
            (project.services || []).forEach(service => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-check-circle" style="color:var(--brand-blue); margin-right:8px;"></i> ${service}`;
                servicesList.appendChild(li);
            });
        }

        // Images Logic
        const gallery = document.getElementById('project-gallery');
        if (gallery) {
            gallery.innerHTML = ''; // Clear loading text
            (project.gallery_images || []).forEach((imgSrc, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'reveal';
                imgContainer.innerHTML = `<img src="${imgSrc}" alt="${project.title} - Image ${index + 1}" loading="lazy">`;
                gallery.appendChild(imgContainer);
            });
            // Re-run animation observer for newly added elements
            if (typeof initScrollAnimations === 'function') {
                initScrollAnimations();
            }
        }
    } catch (err) {
        console.error("Error loading project:", err);
        displayProjectError(err.message);
    }
});

// Helper to safely set text content
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
}

// Helper to display error state
function displayProjectError(message) {
    setText('project-title', 'Project Not Found');
    setText('project-subtitle', message);
    const content = document.querySelector('.project-info-grid');
    if (content) content.style.display = 'none';
    const gallery = document.getElementById('project-gallery');
    if (gallery) gallery.style.display = 'none';
}