// ===================================================================
// --- 1. CONFIGURATION ---
// ===================================================================
const SCRIPT_URL = config.SCRIPT_URL; 
const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;

// --- SUPABASE CLIENT ---
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DERIVED CONFIG & STATE VARIABLES ---
const IMAGE_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/promotional_images/`;
const WEBSITE_BASE_URL = 'https://nags-p.github.io/sahyadriconsanddev.web/';
const MASTER_TEMPLATE_URL = 'https://raw.githubusercontent.com/Nags-p/sahyadriconsanddev.web/main/email_templates/master-promo.html';
let masterTemplateHtml = '', allClients = [], clientHeaders = [], availableSegments = [];
let selectedProjectFiles = []; // For new uploads
let imagesToDelete = []; // For existing images marked for deletion

// ===================================================================
// --- 2. CORE & HELPER FUNCTIONS ---
// ===================================================================
async function callEmailApi(action, payload, callback, errorElementId = 'campaign-status') {
    setLoading(true);
    const statusElement = document.getElementById(errorElementId);
    if (statusElement) statusElement.style.display = 'none';

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            alert("Session expired. Please log in again.");
            await logout(); return;
        }

        payload.action = action;
        payload.jwt = session.access_token;

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const data = await response.json();
        callback(data);
    } catch (error) {
        setLoading(false);
        const errorMsg = `Email API Error: ${error.message}`;
        showStatusMessage(document.getElementById(errorElementId), errorMsg, false);
        callback({ success: false, message: errorMsg });
    }
}

// ===================================================================
// --- 2. CORE & HELPER FUNCTIONS ---
// ===================================================================

function setLoading(isLoading) {
    document.querySelectorAll('button').forEach(btn => btn.disabled = isLoading);
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.disabled = false;
    const loader = document.getElementById('campaign-loader');
    if (loader) loader.style.display = isLoading ? 'block' : 'none';
}

function showStatusMessage(element, message, isSuccess) {
    if (!element) return;
    element.textContent = message;
    element.className = isSuccess ? 'status-message success' : 'status-message error';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
}

// REPLACE your entire showPage function with this one

function showPage(pageId, dom, params = null) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    const navId = pageId.replace('page-', 'nav-');
    dom.navItems.forEach(n => n.classList.remove('active'));
    const activeNav = document.getElementById(navId);
    if (activeNav) activeNav.classList.add('active');
    
    // Page Specific Data Loading
    if (pageId === 'page-dashboard') loadDashboardData();
    if (pageId === 'page-notes') fetchNotesList();
    if (pageId === 'page-clients') fetchClientData(dom);
    if (pageId === 'page-projects') fetchAdminProjects(dom);
    if (pageId === 'page-analytics') loadAnalyticsPageData(dom, params);
    if (pageId === 'page-blog') fetchBlogPosts(dom);

    // --- CONSOLIDATED TAB LOGIC ---

    // Handle default state for Inquiries page
    if (pageId === 'page-inquiries') {
        const inquiryTabs = document.querySelectorAll('#page-inquiries .tab-btn');
        const defaultTab = inquiryTabs[0]; // "New Inquiries" tab

        inquiryTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#page-inquiries .tab-pane').forEach(p => p.classList.remove('active')); // Reset panes if they exist

        if (defaultTab) {
            defaultTab.classList.add('active');
        }
        fetchInquiries('New'); // Load default content
    }

    // Handle default state for Promotions page
    if (pageId === 'page-promotions') {
        const promotionTabs = document.querySelectorAll('#page-promotions .tab-btn');
        const defaultTab = promotionTabs[0]; // "Compose" tab
        
        promotionTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#page-promotions .tab-pane').forEach(p => p.classList.remove('active'));
        
        if (defaultTab) {
            defaultTab.classList.add('active');
            const defaultPane = document.getElementById(`tab-pane-${defaultTab.dataset.tab}`);
            if (defaultPane) {
                defaultPane.classList.add('active');
            }
        }
    }

    // Handle default state for Careers page
    if (pageId === 'page-careers') {
        const careerTabs = document.querySelectorAll('#page-careers .tab-btn');
        const defaultTab = careerTabs[0]; // "Recent Applications" tab

        careerTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#page-careers .tab-pane').forEach(p => p.classList.remove('active'));

        if (defaultTab) {
            defaultTab.classList.add('active');
            const defaultPane = document.getElementById(`tab-pane-${defaultTab.dataset.tab}`);
            if (defaultPane) {
                defaultPane.classList.add('active');
            }
        }
        fetchCareers(); // Load default content
    }
}

// ===================================================================
// --- DASHBOARD HOME PAGE LOGIC ---
// ===================================================================

async function loadDashboardData() {
    // Set loading states
    document.getElementById('stat-new-inquiries').textContent = '...';
    document.getElementById('stat-new-apps').textContent = '...';
    document.getElementById('stat-total-visits').textContent = '...';
    document.getElementById('recent-inquiries-list').innerHTML = '<li>Loading...</li>';
    document.getElementById('recent-apps-list').innerHTML = '<li>Loading...</li>';

    try {
        // Fetch all data in parallel for speed
        const [
            inquiriesCount,
            appsCount,
            visitsCount,
            recentInquiries,
            recentApps
        ] = await Promise.all([
            _supabase.from('contact_inquiries').select('id', { count: 'exact' }).eq('status', 'New'),
            _supabase.from('job_applications').select('id', { count: 'exact' }).eq('status', 'New'),
            _supabase.from('site_traffic').select('id', { count: 'exact', head: true }),
            _supabase.from('contact_inquiries').select('name, created_at').eq('status', 'New').order('created_at', { ascending: false }).limit(5),
            _supabase.from('job_applications').select('name, position, created_at').eq('status', 'New').order('created_at', { ascending: false }).limit(5)
        ]);

        // Update Stat Cards
        document.getElementById('stat-new-inquiries').textContent = inquiriesCount.count || 0;
        document.getElementById('stat-new-apps').textContent = appsCount.count || 0;
        document.getElementById('stat-total-visits').textContent = visitsCount.count || 0;

        // Update Sidebar Badges
        const inquiryBadge = document.getElementById('sidebar-inquiry-badge');
        const careerBadge = document.getElementById('sidebar-career-badge');

        if (inquiryBadge) {
            inquiryBadge.textContent = inquiriesCount.count || 0;
            inquiryBadge.style.display = (inquiriesCount.count > 0) ? 'inline-block' : 'none';
        }
        if (careerBadge) {
            careerBadge.textContent = appsCount.count || 0;
            careerBadge.style.display = (appsCount.count > 0) ? 'inline-block' : 'none';
        }

        // Update Recent Inquiries List
        const inquiriesList = document.getElementById('recent-inquiries-list');
        inquiriesList.innerHTML = '';
        if (recentInquiries.data.length > 0) {
            recentInquiries.data.forEach(item => {
                const li = document.createElement('li');
                const date = new Date(item.created_at).toLocaleDateString();
                li.innerHTML = `${item.name} <span class="list-item-meta">${date}</span>`;
                inquiriesList.appendChild(li);
            });
        } else {
            inquiriesList.innerHTML = '<li>No new inquiries.</li>';
        }

        // Update Recent Applications List
        const appsList = document.getElementById('recent-apps-list');
        appsList.innerHTML = '';
        if (recentApps.data.length > 0) {
            recentApps.data.forEach(item => {
                const li = document.createElement('li');
                const date = new Date(item.created_at).toLocaleDateString();
                li.innerHTML = `${item.name} <span class="list-item-meta">Applied for ${item.position} on ${date}</span>`;
                appsList.appendChild(li);
            });
        } else {
            appsList.innerHTML = '<li>No new applications.</li>';
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        document.getElementById('recent-inquiries-list').innerHTML = '<li>Error loading data.</li>';
        document.getElementById('recent-apps-list').innerHTML = '<li>Error loading data.</li>';
    }
}

// ===================================================================
// --- NOTES PAGE LOGIC ---
// ===================================================================

// ===================================================================
// --- NOTES MANAGER LOGIC (MULTI-NOTE VERSION) ---
// ===================================================================

// Fetch all notes and render the list
async function fetchNotesList() {
    const listEl = document.getElementById('notes-list');
    listEl.innerHTML = '<li>Loading notes...</li>';
    try {
        const { data, error } = await _supabase
            .from('dashboard_notes')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        listEl.innerHTML = '';
        if (data.length === 0) {
            listEl.innerHTML = '<li>No notes found.</li>';
        } else {
            data.forEach(note => {
                const li = document.createElement('li');
                li.dataset.noteId = note.id;
                const date = new Date(note.created_at).toLocaleDateString();
                li.innerHTML = `
                    ${note.title || 'Untitled Note'}
                    <span class="note-item-date">${date}</span>
                `;
                listEl.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error fetching notes list:", error);
        listEl.innerHTML = '<li>Error loading notes.</li>';
    }
}

// Load a single note's content into the editor
async function loadNoteIntoEditor(noteId) {
    if (!noteId) return;

    // Visually mark the active note
    document.querySelectorAll('#notes-list li').forEach(li => {
        li.classList.toggle('active', li.dataset.noteId == noteId);
    });
    
    try {
        const { data, error } = await _supabase
            .from('dashboard_notes')
            .select('title, content')
            .eq('id', noteId)
            .single();

        if (error) throw error;
        
        document.getElementById('note-id').value = noteId;
        document.getElementById('note-title-input').value = data.title || '';
        document.getElementById('note-content-input').value = data.content || '';
        document.getElementById('btn-delete-note').style.display = 'block';
        document.getElementById('notes-status').style.display = 'none';

    } catch (error) {
        alert('Could not load the selected note.');
    }
}

// Reset the form for a new note
function resetNoteForm() {
    document.getElementById('note-form').reset();
    document.getElementById('note-id').value = '';
    document.getElementById('btn-delete-note').style.display = 'none';
    document.getElementById('notes-status').style.display = 'none';
    document.querySelectorAll('#notes-list li').forEach(li => li.classList.remove('active'));
    document.getElementById('note-title-input').focus();
}

// Save or create a note
async function saveNote(e) {
    e.preventDefault();
    setLoading(true);

    const id = document.getElementById('note-id').value;
    const title = document.getElementById('note-title-input').value;
    const content = document.getElementById('note-content-input').value;
    const statusEl = document.getElementById('notes-status');
    
    const noteData = { title, content };

    try {
        let result;
        if (id) { // Update existing note
            result = await _supabase.from('dashboard_notes').update(noteData).eq('id', id);
        } else { // Create new note
            result = await _supabase.from('dashboard_notes').insert([noteData]).select().single();
            if (result.data) {
                document.getElementById('note-id').value = result.data.id; // Set ID for subsequent saves
                document.getElementById('btn-delete-note').style.display = 'block';
            }
        }

        if (result.error) throw result.error;
        
        showStatusMessage(statusEl, 'Note saved successfully!', true);
        fetchNotesList(); // Refresh the list to show new title or note

    } catch (error) {
        showStatusMessage(statusEl, `Error: ${error.message}`, false);
    }
    setLoading(false);
}

// Delete the currently active note
async function deleteNote() {
    const id = document.getElementById('note-id').value;
    if (!id || !confirm('Are you sure you want to permanently delete this note?')) return;
    
    setLoading(true);
    try {
        const { error } = await _supabase.from('dashboard_notes').delete().eq('id', id);
        if (error) throw error;
        resetNoteForm();
        fetchNotesList();
    } catch (error) {
        alert(`Error deleting note: ${error.message}`);
    }
    setLoading(false);
}

// ===================================================================
// --- 3. CAREERS LOGIC (NEW) ---
// ===================================================================

// In dashboard.js, find and replace the fetchCareers function

async function fetchCareers() {
    setLoading(true);
    const tbody = document.querySelector('#careers-table tbody');
    
    try {
        // Fetch the count of new applications for the badge
        const { count } = await _supabase
            .from('job_applications')
            .select('id', { count: 'exact' })
            .eq('status', 'New');
        
        const countBadge = document.getElementById('new-apps-count');
        countBadge.textContent = count || 0;
        countBadge.style.display = (count > 0) ? 'inline-block' : 'none';

        // Update the sidebar badge
        const sidebarBadge = document.getElementById('sidebar-career-badge');
        if (sidebarBadge) {
            sidebarBadge.textContent = count || 0;
            sidebarBadge.style.display = (count > 0) ? 'inline-block' : 'none';
        }

        // Fetch the full application data
        const { data, error } = await _supabase
            .from('job_applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
        } else if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No job applications yet.</td></tr>';
        } else {
            renderCareersTable(data, tbody);
        }
    } catch (error) {
        console.error("Error fetching careers data:", error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="6">Error fetching data.</td></tr>`;
    }
    setLoading(false);
}

function renderCareersTable(applicants, tbody) {
    tbody.innerHTML = '';

    applicants.forEach(app => {
        const row = document.createElement('tr');
        
        // --- 1. PROFESSIONAL STATUS COLORS ---
        let statusBg = '#eff6ff'; // Default Blue (New)
        let statusColor = '#2563eb';
        
        switch(app.status) {
            case 'Screening':
                statusBg = '#fff7ed'; statusColor = '#c2410c'; // Orange
                break;
            case 'Interview':
                statusBg = '#f3e8ff'; statusColor = '#7e22ce'; // Purple
                break;
            case 'Shortlisted':
                statusBg = '#fef9c3'; statusColor = '#854d0e'; // Yellow/Gold
                break;
            case 'Hired':
                statusBg = '#dcfce7'; statusColor = '#15803d'; // Green
                break;
            case 'Rejected':
                statusBg = '#fee2e2'; statusColor = '#b91c1c'; // Red
                break;
        }

        const statusBadge = `<span class="status-badge" style="background:${statusBg}; color:${statusColor};">${app.status}</span>`;

        // Resume Button
        const resumeBtn = app.resume_url 
            ? `<a href="${app.resume_url}" target="_blank" class="btn-secondary" style="padding:6px 12px; font-size:0.8rem; display:inline-flex; align-items:center; gap:5px; border-radius:4px; text-decoration:none;"><i class="fas fa-download"></i> Resume</a>`
            : '<span style="color:#94a3b8; font-size:0.85rem; font-style:italic;">No File</span>';

        // --- 2. UPDATED DROPDOWN OPTIONS ---
        row.innerHTML = `
            <td style="white-space: nowrap; color:#64748b; font-size:0.85rem;">
                ${new Date(app.created_at).toLocaleDateString()}
            </td>
            <td>
                <div class="applicant-info">
                    <h4 style="margin:0; font-size:0.95rem; color:#0f172a;">${app.name}</h4>
                    <a href="mailto:${app.email}" style="display:block; font-size:0.85rem; color:#2563eb; text-decoration:none;">${app.email}</a>
                    <span style="font-size:0.8rem; color:#64748b;">${app.phone}</span>
                </div>
            </td>
            <td><strong>${app.position}</strong></td>
            <td>${statusBadge}</td>
            <td>${resumeBtn}</td>
            <td>
                <div class="action-cell">
                    <select class="status-select" onchange="updateCareerStatus(${app.id}, this.value)">
                        <option value="" disabled selected>Change Status</option>
                        <option value="New">New / Incoming</option>
                        <option value="Screening">Screening</option>
                        <option value="Interview">Interview</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Hired">Hired</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <button onclick="deleteApplication(${app.id})" class="btn-delete-icon" title="Delete Application">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Global functions for HTML event handlers (onclick/onchange)
window.updateCareerStatus = async (id, newStatus) => {
    if(!confirm(`Change status to ${newStatus}?`)) return;
    const { error } = await _supabase.from('job_applications').update({ status: newStatus }).eq('id', id);
    if(error) alert(`Error updating status: ${error.message}`);
    else {
        fetchCareers({}); // Refresh table
    }
};

// REPLACE the existing window.deleteApplication function with this one

window.deleteApplication = async (id) => {
    if (!confirm("Permanently delete this application? This will also delete the attached resume.")) {
        return;
    }

    setLoading(true);
    try {
        // Step 1: Fetch the application record to get the resume_url
        const { data: application, error: fetchError } = await _supabase
            .from('job_applications')
            .select('resume_url')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw new Error(`Failed to fetch application details before deleting: ${fetchError.message}`);
        }

        // Step 2: If a resume URL exists, delete the file from Supabase Storage
        if (application && application.resume_url) {
            
            // --- THIS IS THE CRITICAL FIX ---
            // Extract the file path including the subfolder (e.g., "resumes/1766822833260-1.pdf")
            let filePath = '';
            try {
                 // Create a URL object to safely parse the path
                 const url = new URL(application.resume_url);
                 // The path will be something like "/storage/v1/object/public/contact_uploads/resumes/..."
                 // We want the part after "/contact_uploads/"
                 filePath = url.pathname.split('/contact_uploads/')[1];
            } catch (e) {
                console.error("Could not parse file URL:", e);
            }
            // --- END OF FIX ---
            
            if (filePath) {
                const { error: storageError } = await _supabase.storage
                    .from('contact_uploads')
                    .remove([filePath]); // This now correctly sends ["resumes/1766... .pdf"]

                if (storageError) {
                    console.warn(`Could not delete resume from storage: ${storageError.message}`);
                }
            }
        }

        // Step 3: Delete the application record from the database
        const { error: dbError } = await _supabase.from('job_applications').delete().eq('id', id);
        if (dbError) throw dbError;

        // Step 4: Refresh the UI
        fetchCareers();

    } catch (error) {
        alert(`Error deleting application: ${error.message}`);
    } finally {
        setLoading(false);
    }
};

// ===================================================================
// --- JOB POSTING MANAGEMENT ---
// ===================================================================

async function fetchJobPostingsAdmin(dom) {
    const container = document.getElementById('job-postings-list');
    container.innerHTML = '<p>Loading job postings...</p>';
    try {
        // Fetch ALL jobs, including inactive ones for admin view
        const { data, error } = await _supabase
            .from('job_postings')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        renderJobPostingsAdmin(data);
    } catch (error) {
        container.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
}

function renderJobPostingsAdmin(postings) {
    const container = document.getElementById('job-postings-list');
    container.innerHTML = '';
    if (postings.length === 0) {
        container.innerHTML = '<p>No job posts created yet.</p>';
        return;
    }
    
    postings.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.className = 'job-card'; // Reuse existing style
        postDiv.style.opacity = post.is_active ? '1' : '0.5';
        postDiv.innerHTML = `
            <div class="job-info">
                <h3>${post.title} ${post.is_active ? '' : '(Hidden)'}</h3>
                <p class="job-meta">
                    <i class="fas fa-map-marker-alt"></i> ${post.location || 'N/A'} &nbsp;|&nbsp; 
                    <i class="fas fa-clock"></i> ${post.job_type || 'N/A'}
                </p>
            </div>
            <button class="btn-secondary" onclick="openJobPostModal(${post.id})">Edit</button>
        `;
        container.appendChild(postDiv);
    });
}

window.openJobPostModal = async (postId = null) => {
    const dom = window.dashboardDom;
    dom.jobPostForm.reset();
    document.getElementById('job-post-id').value = '';
    
    if (postId) {
        document.getElementById('job-post-modal-title').textContent = 'Edit Job Post';
        const { data, error } = await _supabase.from('job_postings').select('*').eq('id', postId).single();
        if (error) { alert('Error fetching data'); return; }
        
        document.getElementById('job-post-id').value = data.id;
        document.getElementById('jp-title').value = data.title;
        document.getElementById('jp-location').value = data.location;
        document.getElementById('jp-type').value = data.job_type;
        document.getElementById('jp-description').value = data.description;
        document.getElementById('jp-is-active').checked = data.is_active;
        dom.btnDeleteJobPost.style.display = 'block';
    } else {
        document.getElementById('job-post-modal-title').textContent = 'Create New Job Post';
        dom.btnDeleteJobPost.style.display = 'none';
    }
    dom.jobPostModalOverlay.classList.add('active');
};

function closeJobPostModal() {
    window.dashboardDom.jobPostModalOverlay.classList.remove('active');
}

async function saveJobPost(e) {
    e.preventDefault();
    setLoading(true);
    const id = document.getElementById('job-post-id').value;
    const postData = {
        title: document.getElementById('jp-title').value,
        location: document.getElementById('jp-location').value,
        job_type: document.getElementById('jp-type').value,
        description: document.getElementById('jp-description').value,
        is_active: document.getElementById('jp-is-active').checked
    };
    
    const { error } = id
        ? await _supabase.from('job_postings').update(postData).eq('id', id)
        : await _supabase.from('job_postings').insert([postData]);
    
    if (error) {
        alert(`Error saving: ${error.message}`);
    } else {
        closeJobPostModal();
        fetchJobPostingsAdmin(window.dashboardDom);
    }
    setLoading(false);
}

async function deleteJobPost() {
    const id = document.getElementById('job-post-id').value;
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    
    setLoading(true);
    const { error } = await _supabase.from('job_postings').delete().eq('id', id);
    if (error) {
        alert(`Error deleting: ${error.message}`);
    } else {
        closeJobPostModal();
        fetchJobPostingsAdmin(window.dashboardDom);
    }
    setLoading(false);
}


// ===================================================================
// --- 4. BLOG / INSIGHTS MANAGEMENT ---
// ===================================================================

// --- REPLACE THE fetchBlogPosts AND renderBlogTable FUNCTIONS IN dashboard.js ---
// --- REPLACE THESE FUNCTIONS IN dashboard.js ---

async function fetchBlogPosts(dom) {
    setLoading(true);
    
    const tbody = document.getElementById('blog-table-body');
    const statusEl = document.getElementById('blog-status');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Loading articles...</td></tr>';
    }

    try {
        // ERROR FIX: Changed 'updated_at' to 'created_at'
        const { data, error } = await _supabase
            .from('blog_posts')
            .select('title, slug, tag, created_at') 
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderBlogTable(data || [], tbody);
        
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    } catch (err) {
        console.error("Blog Fetch Error:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger-color);">Error loading data: ${err.message}</td></tr>`;
        }
        if (statusEl) {
            showStatusMessage(statusEl, `Error loading blog posts: ${err.message}`, false);
        }
    }
    setLoading(false);
}

function renderBlogTable(posts, tbody) {
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!posts.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No articles found. Click "New Article" to create one.</td></tr>';
        return;
    }

    posts.forEach(post => {
        const tr = document.createElement('tr');
        
        // Format Date
        const dateObj = new Date(post.created_at);
        const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

        tr.innerHTML = `
            <td style="font-weight: 500;">${post.title || '(No Title)'}</td>
            <td><code style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; color: #64748b;">${post.slug}</code></td>
            <td><span style="background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${post.tag || 'General'}</span></td>
            <td style="color: #64748b; font-size: 0.9rem;">${dateStr}</td>
            <td style="text-align:right; white-space: nowrap;">
                
                <!-- View Button -->
                <a href="blog.html?slug=${post.slug}" target="_blank" class="btn-info" style="padding: 6px 10px; margin-right: 4px; text-decoration: none; font-size: 13px; border-radius: 4px; display: inline-flex; align-items: center;" title="View Article">
                    <i class="fas fa-external-link-alt"></i>
                </a>

                <!-- Edit Button -->
                <button class="btn-secondary" style="padding: 6px 10px; margin-right: 4px; font-size: 13px; width: auto;" onclick="loadBlogIntoForm('${post.slug}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>

                <!-- NEW: Delete Button -->
                <button class="btn-danger" style="padding: 6px 10px; font-size: 13px; width: auto;" onclick="deleteBlogPost('${post.slug}')" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// --- Function to Delete a Post from the List ---
window.deleteBlogPost = async (slug) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
        return;
    }

    setLoading(true);
    const statusEl = document.getElementById('blog-status');

    try {
        const { error } = await _supabase
            .from('blog_posts')
            .delete()
            .eq('slug', slug);

        if (error) throw error;

        // 1. Refresh the table
        fetchBlogPosts({});

        // 2. If the deleted post was currently open in the editor, reset the form
        const currentEditorSlug = document.getElementById('blog-id').value;
        if (currentEditorSlug === slug) {
            resetBlogForm();
        }

        if (statusEl) {
            showStatusMessage(statusEl, 'Article deleted successfully.', true);
        }

    } catch (err) {
        console.error(err);
        if (statusEl) {
            showStatusMessage(statusEl, `Error deleting article: ${err.message}`, false);
        } else {
            alert(`Error deleting: ${err.message}`);
        }
    }
    setLoading(false);
};


// Ensure this is accessible globally
window.loadBlogIntoForm = async (slug) => {
    if (!slug) return;
    setLoading(true);
    const statusEl = document.getElementById('blog-status');
    
    // UI Visual Cue
    document.getElementById('blog-title-input').focus();

    try {
        const { data: post, error } = await _supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;
        if (!post) throw new Error('Article not found');

        // Populate Form
        document.getElementById('blog-id').value = post.slug; 
        document.getElementById('blog-title-input').value = post.title || '';
        document.getElementById('blog-slug-input').value = post.slug || '';
        document.getElementById('blog-tag-input').value = post.tag || '';
        document.getElementById('blog-author-input').value = post.author || '';
        document.getElementById('blog-region-input').value = post.region || '';
        document.getElementById('blog-body-input').value = post.body_html || '';

        showStatusMessage(statusEl, `Loaded "${post.title}" for editing.`, true);
        
    } catch (err) {
        showStatusMessage(statusEl, `Error loading article: ${err.message}`, false);
    }
    setLoading(false);
};

async function loadBlogIntoForm(slug) {
    if (!slug) return;
    setLoading(true);
    const statusEl = document.getElementById('blog-status');
    try {
        const { data: post, error } = await _supabase
            .from('blog_posts')
            .select('title, slug, tag, author, region, body_html')
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;
        if (!post) throw new Error('Article not found');

        // store original slug in hidden field so we can update/delete by slug
        document.getElementById('blog-id').value = post.slug || '';
        document.getElementById('blog-title-input').value = post.title || '';
        document.getElementById('blog-slug-input').value = post.slug || '';
        document.getElementById('blog-tag-input').value = post.tag || '';
        document.getElementById('blog-author-input').value = post.author || '';
        document.getElementById('blog-region-input').value = post.region || '';
        document.getElementById('blog-body-input').value = post.body_html || '';

        if (statusEl) {
            statusEl.style.display = 'none';
        }
    } catch (err) {
        if (statusEl) {
            showStatusMessage(statusEl, `Error loading article: ${err.message}`, false);
        }
    }
    setLoading(false);
}

function resetBlogForm() {
    document.getElementById('blog-id').value = '';
    document.getElementById('blog-title-input').value = '';
    document.getElementById('blog-slug-input').value = '';
    document.getElementById('blog-tag-input').value = '';
    document.getElementById('blog-author-input').value = '';
    document.getElementById('blog-region-input').value = '';
    document.getElementById('blog-body-input').value = '';
    const statusEl = document.getElementById('blog-status');
    if (statusEl) statusEl.style.display = 'none';
}

async function saveBlogFromForm(e) {
    e.preventDefault();
    const originalSlug = document.getElementById('blog-id').value; // may be empty for new post
    const title = document.getElementById('blog-title-input').value.trim();
    const slug = document.getElementById('blog-slug-input').value.trim();
    const tag = document.getElementById('blog-tag-input').value.trim();
    const author = document.getElementById('blog-author-input').value.trim();
    const region = document.getElementById('blog-region-input').value.trim();
    const body_html = document.getElementById('blog-body-input').value;
    const statusEl = document.getElementById('blog-status');

    if (!title || !slug) {
        showStatusMessage(statusEl, 'Title and slug are required.', false);
        return;
    }

    const payload = { title, slug, tag, author, region, body_html };

    try {
        setLoading(true);
        let result;
        if (originalSlug) {
            result = await _supabase.from('blog_posts').update(payload).eq('slug', originalSlug);
        } else {
            result = await _supabase.from('blog_posts').insert([payload]);
        }

        if (result.error) throw result.error;

        showStatusMessage(statusEl, 'Article saved successfully.', true);
        fetchBlogPosts({}); // refresh list
    } catch (err) {
        showStatusMessage(statusEl, `Error saving article: ${err.message}`, false);
    }
    setLoading(false);
}

async function deleteCurrentBlog() {
    const originalSlug = document.getElementById('blog-id').value;
    const statusEl = document.getElementById('blog-status');
    if (!originalSlug) {
        showStatusMessage(statusEl, 'No article selected to delete.', false);
        return;
    }

    if (!confirm('Permanently delete this article?')) return;

    try {
        setLoading(true);
        const { error } = await _supabase.from('blog_posts').delete().eq('slug', originalSlug);
        if (error) throw error;

        resetBlogForm();
        fetchBlogPosts({}); // refresh list
        showStatusMessage(statusEl, 'Article deleted.', true);
    } catch (err) {
        showStatusMessage(statusEl, `Error deleting article: ${err.message}`, false);
    }
    setLoading(false);
}

// ===================================================================
// --- 5. PROJECT MANAGEMENT ---
// ===================================================================

async function fetchAdminProjects(dom) {
    setLoading(true);
    dom.projectsListContainer.innerHTML = '<p>Loading projects...</p>';
    try {
        const { data, error } = await _supabase
            .from('projects')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderAdminProjects(data, dom);
    } catch (error) {
        showStatusMessage(dom.projectsStatus, `Error fetching projects: ${error.message}`, false);
    }
    setLoading(false);
}

function renderAdminProjects(projects, dom) {
    dom.projectsListContainer.innerHTML = '';
    if (projects.length === 0) {
        dom.projectsListContainer.innerHTML = '<p>No projects found. Click "New Project" to add one.</p>';
        return;
    }

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-admin-card';
        // NEW: Add style for hidden projects
        if (!project.is_active) {
            card.style.opacity = '0.5';
        }
        const thumbnailUrl = (project.gallery_images && project.gallery_images.length > 0) ? project.gallery_images[0] : '';

        card.innerHTML = `
            <div class="project-admin-card-thumb" style="background-image: url('${thumbnailUrl}')">
                <span class="sort-order-badge">#${project.sort_order || 'N/A'}</span>
                ${project.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
            </div>
            <div class="project-admin-card-details">
                <!-- NEW: Add (Hidden) text -->
                <h4>${project.title} ${!project.is_active ? '(Hidden)' : ''}</h4>
                <p>${project.type || 'N/A'} - ${project.year || 'N/A'}</p>
                <button class="btn-secondary" style="width:100%; margin-top:15px;" onclick="openProjectModal(${project.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;
        dom.projectsListContainer.appendChild(card);
    });
}

window.openProjectModal = async (projectId = null) => {
    const dom = window.dashboardDom;
    dom.projectForm.reset();
    dom.projectFormStatus.style.display = 'none';
    document.getElementById('project-id').value = '';
    
    // Reset image management state
    selectedProjectFiles = [];
    imagesToDelete = [];
    document.getElementById('p-image-upload').value = '';
    document.getElementById('p-current-images').innerHTML = '';
    document.getElementById('p-image-previews').innerHTML = '<small>No new images selected.</small>';

    const title = document.getElementById('project-modal-title');
    
    if (projectId) {
        title.textContent = 'Edit Project';
        setLoading(true);
        const { data, error } = await _supabase.from('projects').select('*').eq('id', projectId).single();
        setLoading(false);
        if (error) {
            showStatusMessage(dom.projectFormStatus, `Error fetching project: ${error.message}`, false);
            return;
        }
        
        // Populate form fields
        document.getElementById('project-id').value = data.id;
        document.getElementById('p-title').value = data.title || '';
        document.getElementById('p-subtitle').value = data.subtitle || '';
        document.getElementById('p-sort-order').value = data.sort_order || 99; 
        document.getElementById('p-video-url').value = data.video_url || '';
        document.getElementById('p-type').value = data.type || '';
        document.getElementById('p-scope').value = data.scope || '';
        document.getElementById('p-client').value = data.client || '';
        document.getElementById('p-location').value = data.location || '';
        document.getElementById('p-year').value = data.year || '';
        document.getElementById('p-vision').value = data.vision || '';
        document.getElementById('p-challenge').value = data.challenge || '';
        document.getElementById('p-solution').value = data.solution || '';
        document.getElementById('p-results').value = data.results || '';
        document.getElementById('p-services').value = (data.services || []).join(', ');
        document.getElementById('p-is-featured').checked = data.is_featured;
        document.getElementById('p-is-active').checked = data.is_active; // ADD THIS LINE
        
        // RENDER CURRENT IMAGES with "Make Primary" buttons
        const currentImagesContainer = document.getElementById('p-current-images');
        const validImages = (data.gallery_images || []).filter(Boolean);
        
        if (validImages.length > 0) {
            validImages.forEach((imgUrl, index) => {
                const imgItem = document.createElement('div');
                imgItem.className = 'img-preview-item';
                imgItem.style.backgroundImage = `url('${imgUrl}')`;
                
                // Add star icon. Make the first one primary by default.
                const primaryClass = index === 0 ? 'is-primary' : '';
                imgItem.innerHTML = `
                    <button type="button" class="make-primary-btn ${primaryClass}" data-url="${imgUrl}" title="Make Primary"><i class="fas fa-star"></i></button>
                    <button type="button" class="remove-img-btn" data-url="${imgUrl}" title="Delete Image">&times;</button>
                `;
                currentImagesContainer.appendChild(imgItem);
            });
        } else {
             currentImagesContainer.innerHTML = '<small>No images uploaded yet.</small>';
        }

        dom.btnDeleteProject.style.display = 'block';

    } else {
        title.textContent = 'Create New Project';
        dom.btnDeleteProject.style.display = 'none';
        document.getElementById('p-current-images').innerHTML = '<small>Save project first to upload images.</small>';
    }
    dom.projectModalOverlay.classList.add('active');
};

function closeProjectModal() {
    window.dashboardDom.projectModalOverlay.classList.remove('active');
}

async function saveProject(e) {
    e.preventDefault();
    setLoading(true);
    const dom = window.dashboardDom;
    const id = document.getElementById('project-id').value;

    try {
        // Step 1: Handle Image Deletions
        if (imagesToDelete.length > 0) {
            const filePaths = imagesToDelete.map(url => {
                try {
                    const path = new URL(url).pathname.split('/project-images/')[1];
                    return path;
                } catch { return null; }
            }).filter(Boolean);

            if (filePaths.length > 0) {
                await _supabase.storage.from('project-images').remove(filePaths);
            }
            imagesToDelete = [];
        }

        // Step 2: Handle New Image Uploads
        const newImageUrls = [];
        if (selectedProjectFiles.length > 0) {
            for (const file of selectedProjectFiles) {
                const fileName = `projects/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const { error: uploadError } = await _supabase.storage.from('project-images').upload(fileName, file);
                if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                
                const { data } = _supabase.storage.from('project-images').getPublicUrl(fileName);
                if (data && data.publicUrl) {
                    newImageUrls.push(data.publicUrl);
                }
            }
            selectedProjectFiles = [];
        }

        // Step 3: GET IMAGE URLs IN THE NEW ORDER and Prepare DB Data
        const currentImageItems = document.querySelectorAll('#p-current-images .img-preview-item');
        const orderedImageUrls = Array.from(currentImageItems).map(item => {
            return item.querySelector('.remove-img-btn')?.dataset.url;
        }).filter(Boolean);

        const finalImageUrls = [...orderedImageUrls, ...newImageUrls];

        const csvToArray = (str) => str ? str.split(',').map(item => item.trim()).filter(Boolean) : [];
        const projectData = {
            title: document.getElementById('p-title').value,
            subtitle: document.getElementById('p-subtitle').value,
            sort_order: parseInt(document.getElementById('p-sort-order').value, 10) || 99, // ADD THIS LINE
            video_url: document.getElementById('p-video-url').value.trim(), // ADD THIS LINE
            gallery_images: finalImageUrls, // Save the newly ordered array
            type: document.getElementById('p-type').value,
            scope: document.getElementById('p-scope').value,
            client: document.getElementById('p-client').value,
            location: document.getElementById('p-location').value,
            year: document.getElementById('p-year').value,
            vision: document.getElementById('p-vision').value,
            challenge: document.getElementById('p-challenge').value,
            solution: document.getElementById('p-solution').value,
            results: document.getElementById('p-results').value,
            services: csvToArray(document.getElementById('p-services').value),
            is_featured: document.getElementById('p-is-featured').checked,
            is_active: document.getElementById('p-is-active').checked // ADD THIS LINE
        };

        // Step 4: Upsert Data in Database
        let result;
        if (id) {
            result = await _supabase.from('projects').update(projectData).eq('id', id);
        } else {
            result = await _supabase.from('projects').insert([projectData]);
        }
        if (result.error) throw result.error;

        showStatusMessage(dom.projectsStatus, 'Project saved successfully!', true);
        closeProjectModal();
        fetchAdminProjects(dom);

    } catch (error) {
        showStatusMessage(dom.projectFormStatus, `Error saving project: ${error.message}`, false);
    } finally {
        setLoading(false);
    }
}

async function deleteProject() {
    const id = document.getElementById('project-id').value;
    const title = document.getElementById('p-title').value;
    if (!id || !confirm(`Are you sure you want to permanently delete the project "${title}"? This will also delete all its images.`)) {
        return;
    }
    setLoading(true);
    const dom = window.dashboardDom;

    try {
        // Step 1: Fetch the project record to get the list of image URLs
        const { data: projectToDelete, error: fetchError } = await _supabase
            .from('projects')
            .select('gallery_images')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw new Error(`Could not retrieve project to delete images: ${fetchError.message}`);
        }

        // Step 2: If images exist, delete them from Supabase Storage
        const images = projectToDelete?.gallery_images?.filter(Boolean) || [];
        if (images.length > 0) {
            // Extract the file path from the full public URL
            // e.g., "projects/12345-image.jpg" from "https://.../project-images/projects/12345-image.jpg"
            const filePaths = images.map(url => {
                try {
                    return new URL(url).pathname.split('/project-images/')[1];
                } catch {
                    return null;
                }
            }).filter(Boolean);

            if (filePaths.length > 0) {
                const { error: storageError } = await _supabase.storage.from('project-images').remove(filePaths);
                if (storageError) {
                    // Log a warning but don't stop the process. It's better to delete the DB record.
                    console.warn('Failed to delete some images from storage:', storageError.message);
                }
            }
        }

        // Step 3: Delete the project record from the database
        const { error: deleteDbError } = await _supabase.from('projects').delete().eq('id', id);
        if (deleteDbError) throw deleteDbError;

        showStatusMessage(dom.projectsStatus, 'Project and its images deleted successfully.', true);
        closeProjectModal();
        fetchAdminProjects(dom);

    } catch (error) {
         showStatusMessage(dom.projectFormStatus, `Error deleting project: ${error.message}`, false);
    } finally {
        setLoading(false);
    }
}

// ===================================================================
// --- ANALYTICS PAGE LOADER ---
// ===================================================================

async function loadAnalyticsPageData(dom, params) {
    // 1. Load the campaign selection dropdown
    loadAnalyticsDropdown(dom, params ? params.campaignId : null);

    // 2. Load the total site visits stat card
    const visitsEl = document.getElementById('analytics-total-visits');
    if (visitsEl) visitsEl.textContent = 'Loading...';

    try {
        const { count, error } = await _supabase
            .from('site_traffic')
            .select('id', { count: 'exact', head: true });

        if (error) throw error;
        
        if (visitsEl) {
            visitsEl.textContent = count || '0';
        }
    } catch (error) {
        console.error("Failed to load site visits count:", error);
        if (visitsEl) visitsEl.textContent = 'Error';
    }
}


// ===================================================================
// --- ANALYTICS TAB LOGIC (This is a helper for the function above) ---
// ===================================================================

async function loadAnalyticsDropdown(dom, selectedId = null) {
    const { data: campaigns, error } = await _supabase
        .from('campaign_archive')
        .select('id, subject, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading campaign list:", error);
        return;
    }

    const select = document.getElementById('analytics-campaign-select'); // Directly get element
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>Select a campaign...</option>';

    campaigns.forEach(c => {
        const date = new Date(c.created_at).toLocaleDateString();
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${date} - ${c.subject}`;
        select.appendChild(option);
    });

    if (selectedId) {
        select.value = selectedId;
        fetchCampaignAnalytics(dom, selectedId);
    } else {
        const analyticsContent = document.getElementById('analytics-dashboard-content');
        if(analyticsContent) analyticsContent.style.display = 'none';
    }

    select.onchange = (e) => {
        const newId = e.target.value;
        history.pushState(null, null, `#analytics-${newId}`);
        fetchCampaignAnalytics(dom, newId);
    };
}


// ===================================================================
// --- 5. ANALYTICS TAB LOGIC ---
// ===================================================================

async function loadAnalyticsDropdown(dom, selectedId = null) {
    const { data: campaigns, error } = await _supabase
        .from('campaign_archive')
        .select('id, subject, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading campaign list:", error);
        return;
    }

    const select = dom.analyticsSelect;
    select.innerHTML = '<option value="" disabled selected>Select a campaign...</option>';

    campaigns.forEach(c => {
        const date = new Date(c.created_at).toLocaleDateString();
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${date} - ${c.subject}`;
        select.appendChild(option);
    });

    if (selectedId) {
        select.value = selectedId;
        fetchCampaignAnalytics(dom, selectedId);
    } else {
        dom.analyticsContent.style.display = 'none';
    }

    select.onchange = (e) => {
        const newId = e.target.value;
        history.pushState(null, null, `#analytics-${newId}`);
        fetchCampaignAnalytics(dom, newId);
    };
}

async function fetchCampaignAnalytics(dom, campaignId) {
    setLoading(true);
    
    document.getElementById('stat-sent').textContent = '-';
    document.getElementById('stat-opens').textContent = '-';
    document.getElementById('stat-clicks').textContent = '-';
    dom.analyticsOpensList.innerHTML = '<li>Loading...</li>';
    dom.analyticsClicksList.innerHTML = '<li>Loading...</li>';
    dom.analyticsContent.style.display = 'block';

    try {
        const { data: campaign, error: campaignError } = await _supabase.from('campaign_archive').select('*').eq('id', campaignId).single();
        if (campaignError) throw campaignError;
        
        const { data: opens, error: opensError } = await _supabase.from('email_opens').select('recipient_email').eq('campaign_id', campaignId);
        if (opensError) throw opensError;

        const { data: clicks, error: clicksError } = await _supabase.from('email_clicks').select('recipient_email').eq('campaign_id', campaignId);
        if (clicksError) throw clicksError;

        document.getElementById('stat-sent').textContent = campaign.emails_sent || 0;
        
        const uniqueOpens = [...new Set(opens.map(o => o.recipient_email))];
        const uniqueClicks = [...new Set(clicks.map(c => c.recipient_email))];
        
        document.getElementById('stat-opens').textContent = uniqueOpens.length;
        document.getElementById('stat-clicks').textContent = uniqueClicks.length;
        
        dom.analyticsOpensList.innerHTML = uniqueOpens.length > 0 ? uniqueOpens.map(e => `<li>${e}</li>`).join('') : '<li>No opens recorded.</li>';
        dom.analyticsClicksList.innerHTML = uniqueClicks.length > 0 ? uniqueClicks.map(e => `<li>${e}</li>`).join('') : '<li>No clicks recorded.</li>';
        
    } catch (error) {
        console.error("Analytics Error:", error);
        dom.analyticsOpensList.innerHTML = '<li>Error loading data.</li>';
    }
    setLoading(false);
}


// ===================================================================
// --- 5. DATA HANDLING (OTHER PAGES) ---
// ===================================================================

async function fetchCampaignArchive(dom) {
    setLoading(true);
    dom.archiveTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>`;
    try {
        const { data, error } = await _supabase.from('campaign_archive').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        renderCampaignArchive(data, dom);
    } catch (error) {
        dom.archiveTableBody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
    }
    setLoading(false);
}

async function renderCampaignArchive(campaigns, dom) {
    const tBody = dom.archiveTableBody;
    tBody.innerHTML = '';

    if (campaigns.length === 0) {
        tBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No campaigns have been sent yet.</td></tr>`;
        return;
    }
    
    const campaignIds = campaigns.map(c => c.id);
    const { data: allOpens } = await _supabase.from('email_opens').select('campaign_id, recipient_email').in('campaign_id', campaignIds);
    const { data: allClicks } = await _supabase.from('email_clicks').select('campaign_id, recipient_email').in('campaign_id', campaignIds);
    
    campaigns.forEach(campaign => {
        const opensCount = allOpens ? [...new Set(allOpens.filter(o => o.campaign_id === campaign.id).map(o => o.recipient_email))].length : 0;
        const clicksCount = allClicks ? [...new Set(allClicks.filter(c => c.campaign_id === campaign.id).map(c => c.recipient_email))].length : 0;
        
        const row = document.createElement('tr');
        const sentDate = new Date(campaign.created_at).toLocaleString();
        
        row.innerHTML = `
            <td>${sentDate}</td>
            <td>${campaign.subject}</td>
            <td>${campaign.emails_sent || 0}</td>
            <td>${opensCount}</td>
            <td>${clicksCount}</td>
        `;
        
        const actionsTd = document.createElement('td');
        actionsTd.className = 'action-buttons';

        const viewAnalyticsBtn = document.createElement('a');
        viewAnalyticsBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Analytics';
        viewAnalyticsBtn.className = 'btn-primary';
        viewAnalyticsBtn.style.flexGrow = '0';
        viewAnalyticsBtn.href = `#analytics-${campaign.id}`;
        actionsTd.appendChild(viewAnalyticsBtn);

        if (campaign.template_html && campaign.template_html !== 'pending') {
            const viewTemplateBtn = document.createElement('a');
            viewTemplateBtn.innerHTML = '<i class="fas fa-code"></i> Template';
            viewTemplateBtn.className = 'btn-info';
            viewTemplateBtn.style.flexGrow = '0';
            viewTemplateBtn.href = "javascript:void(0);";
            viewTemplateBtn.addEventListener('click', () => {
                const pWin = window.open('', '_blank');
                pWin.document.write(campaign.template_html);
                pWin.document.close();
            });
            actionsTd.appendChild(viewTemplateBtn);
        }
        
        if (campaign.recipients && campaign.recipients.length > 0) {
            const viewListBtn = document.createElement('a');
            viewListBtn.innerHTML = '<i class="fas fa-list-ul"></i> Recipients';
            viewListBtn.className = 'btn-secondary';
            viewListBtn.style.flexGrow = '0';
            viewListBtn.href = "javascript:void(0);";
            viewListBtn.addEventListener('click', () => openRecipientsModal(campaign.recipients, campaign.subject, dom));
            actionsTd.appendChild(viewListBtn);
        }
        
        row.appendChild(actionsTd);
        tBody.appendChild(row);
    });
}

async function fetchImages(dom) {
    setLoading(true);
    dom.imageGridContainer.innerHTML = '<p>Loading images...</p>';
    try {
        const { data, error } = await _supabase.storage.from('promotional_images').list('', { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
        if (error) throw error;
        renderImageGrid(data, dom);
    } catch (error) {
        showStatusMessage(dom.imageManagerStatus, `Error fetching images: ${error.message}`, false);
    }
    setLoading(false);
}

function renderImageGrid(images, dom) {
    const container = dom.imageGridContainer;
    container.innerHTML = '';
    if (images.length === 0) {
        container.innerHTML = '<p class="text-medium" style="text-align: center;">No promotional images found. Upload one to get started!</p>';
        return;
    }

    images.forEach(image => {
        const { data: { publicUrl } } = _supabase.storage.from('promotional_images').getPublicUrl(image.name);
        const card = document.createElement('div');
        card.className = 'image-card';
        const lastModified = new Date(image.updated_at || image.created_at).toLocaleDateString();
        const fileSize = image.metadata && image.metadata.size ? (image.metadata.size / 1024).toFixed(1) + ' KB' : 'N/A';

        card.innerHTML = `
            <div class="image-card-preview" style="background-image: url('${publicUrl}')"></div>
            <div class="image-card-details">
                <input type="text" class="image-name-input" value="${image.name}" data-original-name="${image.name}">
                <p>${fileSize} - ${lastModified}</p>
                <div class="image-card-actions">
                    <button class="btn-secondary btn-rename"><i class="fas fa-edit"></i> Rename</button>
                    <button class="btn-info btn-copy-url"><i class="fas fa-copy"></i> Copy URL</button>
                    <button class="btn-danger btn-delete"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
        container.appendChild(card);

        card.querySelector('.btn-delete').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete the image "${image.name}"? This cannot be undone.`)) {
                setLoading(true);
                const { error } = await _supabase.storage.from('promotional_images').remove([image.name]);
                showStatusMessage(dom.imageManagerStatus, error ? `Error: ${error.message}` : `"${image.name}" deleted.`, !error);
                if (!error) fetchImages(dom);
                setLoading(false);
            }
        });

        card.querySelector('.btn-rename').addEventListener('click', async () => {
            const input = card.querySelector('.image-name-input');
            const oldName = input.dataset.originalName;
            const newName = input.value.trim();

            if (newName && newName !== oldName) {
                if (confirm(`Rename "${oldName}" to "${newName}"?`)) {
                    setLoading(true);
                    const { error } = await _supabase.storage.from('promotional_images').move(oldName, newName);
                     showStatusMessage(dom.imageManagerStatus, error ? `Error: ${error.message}` : `Image renamed to "${newName}".`, !error);
                    if (!error) fetchImages(dom);
                    setLoading(false);
                }
            }
        });

        card.querySelector('.btn-copy-url').addEventListener('click', () => {
            navigator.clipboard.writeText(publicUrl)
                .then(() => showStatusMessage(dom.imageManagerStatus, `URL copied!`, true))
                .catch(err => showStatusMessage(dom.imageManagerStatus, `Failed to copy URL`, false));
        });
    });
}

// REPLACE the old fetchInquiries function in dashboard.js

async function fetchInquiries(status = 'New') {
    setLoading(true);
    const container = document.getElementById('inquiries-container');
    container.innerHTML = `<p style="text-align: center;">Loading...</p>`;
    
    try {
        // Fetch the count of new inquiries for the badge
        const { count } = await _supabase
            .from('contact_inquiries')
            .select('id', { count: 'exact' })
            .eq('status', 'New');
        
        // Update the badge
        const countBadge = document.getElementById('new-inquiry-count');
        countBadge.textContent = count || 0;
        countBadge.style.display = (count > 0) ? 'inline-block' : 'none';

        // Update the sidebar badge
        const sidebarBadge = document.getElementById('sidebar-inquiry-badge');
        if (sidebarBadge) {
            sidebarBadge.textContent = count || 0;
            sidebarBadge.style.display = (count > 0) ? 'inline-block' : 'none';
        }

        // Fetch the actual inquiry data for the selected tab
        const { data, error } = await _supabase
            .from('contact_inquiries')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Re-use the existing renderInquiries function
        renderInquiries(data, status); 

    } catch (error) {
        container.innerHTML = `<p style="color: var(--danger-color); text-align: center;">Error: ${error.message}</p>`;
    }
    setLoading(false);
}

// REPLACE the existing renderInquiries function in dashboard.js

function renderInquiries(inquiries, status) {
    const container = document.getElementById('inquiries-container');
    container.innerHTML = '';

    if (inquiries.length === 0) {
        container.innerHTML = `<p class="text-medium" style="text-align: center;">No ${status.toLowerCase()} inquiries found.</p>`;
        return;
    }

    inquiries.forEach(inquiry => {
        const card = document.createElement('div');
        card.className = 'inquiry-card';
        
        let fileLink = 'None';
        if (inquiry.file_url) {
            // ... (file link logic remains the same)
            let publicUrl;
            if (inquiry.file_url.startsWith('http')) {
                publicUrl = inquiry.file_url;
            } else {
                const cleanPath = inquiry.file_url.replace(/^contact_uploads\//, '');
                const { data } = _supabase.storage.from('contact_uploads').getPublicUrl(cleanPath);
                publicUrl = data.publicUrl;
            }
            fileLink = `<a href="${publicUrl}" target="_blank" class="btn-secondary" style="display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-file-alt"></i> View File</a>`;
        }

        card.innerHTML = `
            <h4>${inquiry.name} <span style="font-size: 12px; color: var(--text-light); font-weight: normal;">(${new Date(inquiry.created_at).toLocaleDateString()})</span></h4>
            <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${inquiry.email}</p>
            <p><strong><i class="fas fa-phone-alt"></i> Phone:</strong> ${inquiry.phone || 'N/A'}</p>
            <p><strong><i class="fas fa-map-marker-alt"></i> Location:</strong> ${inquiry.location || 'N/A'}</p>
            <p><strong><i class="fas fa-building"></i> Project:</strong> ${inquiry.project_type || 'N/A'}</p>
            <p><strong><i class="fas fa-paperclip"></i> File:</strong> ${fileLink}</p>
            <p class="inquiry-message"><strong><i class="fas fa-comment"></i> Message:</strong><br>${inquiry.message}</p>
        `;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'inquiry-actions';

        // --- THIS IS THE CORRECTED LOGIC ---
        if (status === 'New') {
            const addBtn = document.createElement('button');
            addBtn.innerHTML = '<i class="fas fa-user-plus"></i> Add to Clients & Archive';
            addBtn.className = 'btn-primary';
            addBtn.addEventListener('click', async () => {
                if (confirm(`Add ${inquiry.name} to clients? This will also archive the inquiry.`)) {
                    setLoading(true);
                    const { data: existing } = await _supabase.from('clients').select('id').eq('email', inquiry.email).single();
                    if (existing) {
                        showStatusMessage(document.getElementById('inquiries-status'), `Client already exists. Archiving inquiry.`, false);
                    } else {
                         await _supabase.from('clients').insert([{ name: inquiry.name, email: inquiry.email, phone: inquiry.phone, city: inquiry.location, segment: 'New Lead' }]);
                    }
                    await _supabase.from('contact_inquiries').update({ status: 'Archived' }).eq('id', inquiry.id);
                    fetchInquiries('New'); // Refresh the 'New' tab
                    setLoading(false);
                }
            });
            actionsDiv.appendChild(addBtn);
        }
        // --- END OF CORRECTION ---

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Forever';
        deleteBtn.className = 'btn-danger';
        // NEW, COMPLETE DELETE LOGIC
deleteBtn.addEventListener('click', async () => {
    if (confirm(`PERMANENTLY DELETE this inquiry? This will also delete any attached files.`)) {
        setLoading(true);
        try {
            // --- FIX STARTS HERE ---

            // Step 1: Check if a file exists and delete it from Storage first
            if (inquiry.file_url) {
                // Extract the file path from the full URL.
                // e.g., "resume_12345.pdf" from "https://.../storage/v1/object/public/contact_uploads/resume_12345.pdf"
                const filePath = inquiry.file_url.split('/contact_uploads/').pop();
                
                if (filePath) {
                    const { error: storageError } = await _supabase.storage
                        .from('contact_uploads')
                        .remove([filePath]);

                    if (storageError) {
                        // Log a warning but don't stop the process. It's better to delete the DB record.
                        console.warn(`Could not delete file from storage: ${storageError.message}`);
                    }
                }
            }

            // Step 2: Delete the inquiry record from the database
            const { error: dbError } = await _supabase
                .from('contact_inquiries')
                .delete()
                .eq('id', inquiry.id);

            if (dbError) throw dbError;

            // Step 3: Refresh the UI
            fetchInquiries(status);
            
            // --- FIX ENDS HERE ---

        } catch (error) {
            alert(`Error deleting inquiry: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }
});

        actionsDiv.appendChild(deleteBtn);
        card.appendChild(actionsDiv);
        container.appendChild(card);
    });
}

async function fetchClientData(dom) {
    setLoading(true);
    dom.clientTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>`;
    try {
        const { data, error } = await _supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allClients = data;
        clientHeaders = data.length > 0 ? Object.keys(data[0]).filter(h => h !== 'id' && h !== 'created_at') : ['name', 'email', 'phone', 'city', 'segment'];
        renderClientTable(allClients, dom);
    } catch(error) {
        showStatusMessage(dom.clientStatus, `Error: ${error.message}`, false);
    }
    setLoading(false);
}

function renderClientTable(clients, dom) {
    const tBody = dom.clientTableBody;
    const tHead = dom.clientTableHead;
    tBody.innerHTML = '';
    tHead.innerHTML = '';

    if (clients.length === 0) {
        tBody.innerHTML = `<tr><td colspan="${(clientHeaders.length || 5) + 1}" style="text-align: center;">No clients found.</td></tr>`;
        return;
    }

    const headerRow = document.createElement('tr');
    clientHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.charAt(0).toUpperCase() + header.slice(1);
        headerRow.appendChild(th);
    });
    const actionsTh = document.createElement('th');
    actionsTh.textContent = 'Actions';
    headerRow.appendChild(actionsTh);
    tHead.appendChild(headerRow);

    clients.forEach(client => {
        const row = document.createElement('tr');
        clientHeaders.forEach(header => {
            const td = document.createElement('td');
            td.textContent = client[header] || '';
            row.appendChild(td);
        });
        
        const actionsTd = document.createElement('td');
        actionsTd.className = 'action-buttons';
        
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.className = 'btn-info btn-icon';
        editBtn.title = 'Edit Client';
        editBtn.addEventListener('click', () => openEditClientModal(client, dom));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.className = 'btn-danger btn-icon';
        deleteBtn.title = 'Delete Client';
        deleteBtn.addEventListener('click', () => deleteClientPrompt(client.id, client.name || client.email, dom));

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);
        tBody.appendChild(row);
    });
}

// ===================================================================
// --- 6. INITIALIZATION & AUTHENTICATION ---
// ===================================================================
function openEditClientModal(client, dom) {
    dom.editClientRowId.value = client.id;
    dom.editClientFields.innerHTML = '';
    dom.editClientStatus.style.display = 'none';
    
    clientHeaders.forEach(header => {
        const label = document.createElement('label');
        label.textContent = header.charAt(0).toUpperCase() + header.slice(1);
        dom.editClientFields.appendChild(label);
        
        if (header === 'segment') {
            const select = document.createElement('select'); 
            select.name = header;
            const blankOpt = document.createElement('option'); 
            blankOpt.value = ''; blankOpt.textContent = 'No Segment'; select.appendChild(blankOpt);
            availableSegments.forEach(s => { 
                const opt = document.createElement('option'); opt.value = s; opt.textContent = s; select.appendChild(opt); 
            });
            select.value = client[header] || '';
            dom.editClientFields.appendChild(select);
        } else {
            const input = document.createElement('input'); 
            input.type = (header === 'email') ? 'email' : 'text';
            input.name = header; 
            input.value = client[header] || '';
            dom.editClientFields.appendChild(input);
        }
    });
    dom.editClientModalOverlay.classList.add('active');
}

function closeEditClientModal(dom) { 
    dom.editClientModalOverlay.classList.remove('active'); 
}

async function deleteClientPrompt(id, clientIdentifier, dom) {
    if (confirm(`Are you sure you want to delete ${clientIdentifier || 'this client'}?`)) {
        setLoading(true);
        await _supabase.from('clients').delete().eq('id', id);
        fetchClientData(dom);
        setLoading(false);
    }
}


function openRecipientsModal(recipients, subject, dom) {
    dom.recipientsModalTitle.textContent = `Recipients for "${subject}"`;
    dom.recipientsList.innerHTML = '';
    if (recipients.length > 0) {
        recipients.forEach(email => { 
            const li = document.createElement('li'); li.textContent = email; dom.recipientsList.appendChild(li); 
        });
    } else {
        dom.recipientsList.innerHTML = '<li>No recipients were recorded for this campaign.</li>';
    }
    dom.recipientsModalOverlay.classList.add('active');
}

function closeRecipientsModal(dom) { dom.recipientsModalOverlay.classList.remove('active'); }

function getSelectedSegments(dom) {
    if (dom.segmentContainer.querySelector('input[value="All"]').checked) return ['All'];
    return Array.from(dom.segmentContainer.querySelectorAll('input:not([value="All"]):checked')).map(cb => cb.value);
}

function getCampaignData() {
    return {
        subject: document.getElementById('c-subject').value,
        headline: document.getElementById('c-headline').value,
        image_filename: document.getElementById('c-image-list').value,
        body_text: document.getElementById('c-body').value,
        cta_text: document.getElementById('c-cta-text').value,
        cta_path: document.getElementById('c-cta-path').value
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const dom = {
        loginOverlay: document.getElementById('login-overlay'),
        loginForm: document.getElementById('login-form'),
        loginStatus: document.getElementById('login-status'),
        dashboardLayout: document.getElementById('dashboard-layout'),
        navItems: document.querySelectorAll('.sidebar-nav li'),
        campaignLoader: document.getElementById('campaign-loader'),
        logoutBtn: document.getElementById('logout-btn'),
        userEmailDisplay: document.getElementById('user-email-display'),
        userRoleDisplay: document.getElementById('user-role-display'),
        campaignForm: document.getElementById('campaign-form'),
        campaignStatus: document.getElementById('campaign-status'),
        segmentContainer: document.getElementById('segment-container'),
        clientTableBody: document.querySelector('#client-table tbody'),
        clientTableHead: document.querySelector('#client-table thead'),
        clientSearch: document.getElementById('client-search'),
        clientStatus: document.getElementById('client-status'),
        archiveTableBody: document.querySelector('#archive-table tbody'),
        archiveTableHead: document.querySelector('#archive-table thead'),
        editclientModalOverlay: document.getElementById('edit-client-modal-overlay'),
        editclientForm: document.getElementById('edit-client-form'),
        editclientRowId: document.getElementById('edit-client-rowid'),
        editclientFields: document.getElementById('edit-client-fields'),
        editModalClose: document.getElementById('edit-modal-close'),
        editModalCancel: document.getElementById('edit-modal-cancel'),
        editclientStatus: document.getElementById('edit-client-status'),
        clientTableBody: document.querySelector('#client-table tbody'),
        clientTableHead: document.querySelector('#client-table thead'),
        clientSearch: document.getElementById('client-search'),
        clientStatus: document.getElementById('client-status'),
        editClientModalOverlay: document.getElementById('edit-client-modal-overlay'),
        editClientForm: document.getElementById('edit-client-form'),
        editClientRowId: document.getElementById('edit-client-rowid'),
        editClientFields: document.getElementById('edit-client-fields'),
        editModalClose: document.getElementById('edit-modal-close'),
        editModalCancel: document.getElementById('edit-modal-cancel'),
        editClientStatus: document.getElementById('edit-client-status'),
        recipientsModalOverlay: document.getElementById('recipients-modal-overlay'),
        recipientsModalTitle: document.getElementById('recipients-modal-title'),
        recipientsModalClose: document.getElementById('recipients-modal-close'),
        recipientsList: document.getElementById('recipients-list'),
        inquiriesContainer: document.getElementById('inquiries-container'),
        inquiriesStatus: document.getElementById('inquiries-status'),
        imageGridContainer: document.getElementById('image-grid-container'),
        imageUploadInput: document.getElementById('image-upload-input'),
        imageUploadPreview: document.getElementById('image-upload-preview'),
        imageManagerStatus: document.getElementById('image-manager-status'),
        analyticsPage: document.getElementById('page-analytics'),
        analyticsSelect: document.getElementById('analytics-campaign-select'),
        analyticsContent: document.getElementById('analytics-dashboard-content'),
        analyticsOpensList: document.getElementById('analytics-opens-list'),
        analyticsClicksList: document.getElementById('analytics-clicks-list'),
        blogForm: document.getElementById('blog-form'),
        blogNewBtn: document.getElementById('blog-new-btn'),
        blogDeleteBtn: document.getElementById('blog-delete-btn'),
        btnNewProject: document.getElementById('btn-new-project'),
        projectModalOverlay: document.getElementById('project-modal-overlay'),
        projectModalClose: document.getElementById('project-modal-close'),
        projectForm: document.getElementById('project-form'),
        projectFormStatus: document.getElementById('project-form-status'),
        btnDeleteProject: document.getElementById('btn-delete-project'),
        projectsListContainer: document.getElementById('projects-list-container'),
        projectsStatus: document.getElementById('projects-status'),

        //... inside the dom object in DOMContentLoaded
        jobPostModalOverlay: document.getElementById('job-post-modal-overlay'),
        jobPostModalClose: document.getElementById('job-post-modal-close'),
        jobPostForm: document.getElementById('job-post-form'),
        btnNewJobPost: document.getElementById('btn-new-job-post'),
        btnDeleteJobPost: document.getElementById('btn-delete-job-post'),

    };

    window.dashboardDom = dom; // <<<<<<<< ADD THIS LINE

    async function initializeDashboard() {
        setLoading(true);
        dom.loginOverlay.style.display = 'none';
        dom.dashboardLayout.style.display = 'flex';
        try {
            dom.campaignLoader.textContent = 'Fetching dashboard data...';
            const [segmentsRes, imagesRes, templateRes] = await Promise.all([
                _supabase.from('clients').select('segment'),
                _supabase.storage.from('promotional_images').list('', { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
                fetch(MASTER_TEMPLATE_URL).then(res => res.text())
            ]);
            availableSegments = [...new Set(segmentsRes.data.map(item => item.segment))].filter(Boolean);
            masterTemplateHtml = templateRes;
            populateCheckboxes(availableSegments);
            populateImages(imagesRes.data);
            
            // CORRECTED: The call to fetchSiteTraffic was removed from here.
            
            handleHashChange();
        } catch(error) {
            alert(`Critical Error: Could not fetch dashboard data. ${error.message}`);
        }
        setLoading(false);
    }


    function handleHashChange() {
        const hash = window.location.hash.substring(1);
        
        if (hash.startsWith('analytics')) {
            const parts = hash.split('-');
            const campaignId = parts.length > 1 ? parts[1] : null;
            showPage('page-analytics', dom, { campaignId });
        } else {
            const pageId = `page-${hash || 'dashboard'}`; 
            if (document.getElementById(pageId)) {
                showPage(pageId, dom);
            } else {
                showPage('page-dashboard', dom);
            }
        }
    }

    async function handleUserSession() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            const userRole = (session.user.app_metadata && session.user.app_metadata.role) || 'Viewer';
            document.body.className = `is-${userRole.toLowerCase().replace(' ', '-')}`;
            dom.userEmailDisplay.textContent = session.user.user_metadata.display_name || session.user.email;
            dom.userRoleDisplay.textContent = userRole;
            initializeDashboard();
        } else {
            dom.loginOverlay.style.display = 'flex';
            dom.dashboardLayout.style.display = 'none';
        }
    }

    
    
    async function logout() {
        setLoading(true);
        await _supabase.auth.signOut();
        window.location.reload();
    }
    
    dom.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        setLoading(true);
        dom.campaignLoader.textContent = 'Logging in...';
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
            showStatusMessage(dom.loginStatus, error.message, false);
        } else {
            handleUserSession();
        }
    });

    dom.logoutBtn.addEventListener('click', logout);
    
    // Blog events
    if (dom.blogForm) {
        dom.blogForm.addEventListener('submit', saveBlogFromForm);
    }
    if (dom.blogNewBtn) {
        dom.blogNewBtn.addEventListener('click', resetBlogForm);
    }
    if (dom.blogDeleteBtn) {
        dom.blogDeleteBtn.addEventListener('click', deleteCurrentBlog);
    }

    // =========================================================
    // --- PASTE THE NEW EVENT LISTENERS HERE ---
    // =========================================================
    if (dom.btnNewProject) {
        dom.btnNewProject.addEventListener('click', () => openProjectModal());
    }
    if (dom.projectModalClose) {
        dom.projectModalClose.addEventListener('click', closeProjectModal);
    }
    if (dom.projectForm) {
        dom.projectForm.addEventListener('submit', saveProject);
    }
    if (dom.btnDeleteProject) {
        dom.btnDeleteProject.addEventListener('click', deleteProject);
    }

    // Inside DOMContentLoaded
    if(dom.btnNewJobPost) {
        dom.btnNewJobPost.addEventListener('click', () => openJobPostModal());
        dom.jobPostModalClose.addEventListener('click', closeJobPostModal);
        dom.jobPostForm.addEventListener('submit', saveJobPost);
        dom.btnDeleteJobPost.addEventListener('click', deleteJobPost);
    }
// ...
    

    // --- ADD THIS NEW CODE ---
// Handle new file selection
const imageUploadInput = document.getElementById('p-image-upload');
imageUploadInput.addEventListener('change', (e) => {
    selectedProjectFiles = Array.from(e.target.files);
    const previewContainer = document.getElementById('p-image-previews');
    previewContainer.innerHTML = '';
    if (selectedProjectFiles.length > 0) {
        selectedProjectFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imgItem = document.createElement('div');
                imgItem.className = 'img-preview-item';
                imgItem.style.backgroundImage = `url(${event.target.result})`;
                previewContainer.appendChild(imgItem);
            };
            reader.readAsDataURL(file);
        });
    } else {
        previewContainer.innerHTML = '<small>No new images selected.</small>';
    }
});

// =========================================================
    // --- AND PASTE THE NEW, COMBINED LISTENER HERE ---
    // =========================================================
    // Handle "Make Primary" image selection AND deletion (Event Delegation)
    const currentImagesContainer = document.getElementById('p-current-images');
    currentImagesContainer.addEventListener('click', (e) => {
        // Handle clicking the star icon
        const starBtn = e.target.closest('.make-primary-btn');
        if (starBtn) {
            // Remove 'is-primary' from all other stars in this modal
            currentImagesContainer.querySelectorAll('.make-primary-btn').forEach(btn => btn.classList.remove('is-primary'));
            
            // Add 'is-primary' to the clicked star
            starBtn.classList.add('is-primary');
            
            // Move the parent image item to the front of the grid for visual feedback
            const imageItem = starBtn.closest('.img-preview-item');
            currentImagesContainer.prepend(imageItem);
        }

        // Handle clicking the 'x' remove icon
        const removeBtn = e.target.closest('.remove-img-btn');
        if (removeBtn) {
            const urlToDelete = removeBtn.dataset.url;
            imagesToDelete.push(urlToDelete);
            removeBtn.parentElement.style.display = 'none'; // Hide the item instead of just dimming
        }
    });
    // =========================================================

    




    // =========================================================

    dom.navItems.forEach(item => item.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page.replace('page-','');
        window.location.hash = page.replace(/_/g, '-');
    }));
    
    window.addEventListener('hashchange', handleHashChange);
    
    dom.clientSearch.addEventListener('keyup', () => {
        const searchTerm = dom.clientSearch.value.toLowerCase();
        const filteredclients = allClients.filter(client =>
            Object.values(client).some(val => String(val).toLowerCase().includes(searchTerm))
        );
        renderClientTable(filteredclients, dom);
    });
    
    document.getElementById('btn-preview').addEventListener('click', () => {
        const campaignForm = document.getElementById('campaign-form');
        if (!campaignForm.checkValidity()) { campaignForm.reportValidity(); return; }
        const cData = getCampaignData();
        const composedHtml = masterTemplateHtml.replace(/{{headline}}/g, cData.headline).replace(/{{image_url}}/g, IMAGE_BASE_URL + cData.image_filename).replace(/{{body_text}}/g, cData.body_text.replace(/\n/g, '<br>')).replace(/{{cta_text}}/g, cData.cta_text).replace(/{{cta_link}}/g, WEBSITE_BASE_URL + cData.cta_path).replace(/{{unsubscribe_link_text}}/g, 'Preview Mode');
        const pWin = window.open('', '_blank');
        pWin.document.write(composedHtml);
        pWin.document.close();
    });

    document.getElementById('btn-send-test').addEventListener('click', () => {
        const campaignForm = document.getElementById('campaign-form');
        if (!campaignForm.checkValidity()) { campaignForm.reportValidity(); return; }
        callEmailApi('sendTest', { campaignData: getCampaignData() }, r => {
            showStatusMessage(dom.campaignStatus, r.message, r.success);
            setLoading(false);
        });
    });

    dom.campaignForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const segs = getSelectedSegments(dom);
        if (segs.length === 0) { alert('Please select at least one segment.'); return; }
        if (!confirm(`Send campaign to ${segs.includes('All') ? "All clients" : segs.length + " segment(s)"}?`)) return;

        setLoading(true);
        showStatusMessage(dom.campaignStatus, "Preparing campaign...", true);
        
        const campaignData = getCampaignData();

        try {
            const { data: campaignRecord, error: insertError } = await _supabase.from('campaign_archive').insert({ subject: campaignData.subject }).select().single();
            if (insertError) throw insertError;
            
            campaignData.campaignId = campaignRecord.id;
            showStatusMessage(dom.campaignStatus, "Sending emails...", true);

            callEmailApi('runCampaign', { campaignData: campaignData, segments: segs }, async (r) => {
                if (r.success) {
                    const emailCount = (r.message.match(/\d+/) || [0])[0];
                    await _supabase.from('campaign_archive').update({ emails_sent: parseInt(emailCount, 10) }).eq('id', campaignRecord.id);
                    showStatusMessage(dom.campaignStatus, r.message, r.success);
                } else {
                    showStatusMessage(dom.campaignStatus, r.message, r.success);
                }
                setLoading(false);
            });

        } catch (error) {
            showStatusMessage(dom.campaignStatus, `Error creating campaign: ${error.message}`, false);
            setLoading(false);
        }
    });

    dom.editModalClose.addEventListener('click', () => closeEditClientModal(dom));
    dom.editModalCancel.addEventListener('click', () => closeEditClientModal(dom));
    dom.recipientsModalClose.addEventListener('click', () => closeRecipientsModal(dom));

    dom.editClientForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        setLoading(true);
        const id = dom.editClientRowId.value;
        const updatedClientData = {}; // This is the correctly spelled variable
        
        dom.editClientFields.querySelectorAll('input, select').forEach(input => {
            updatedClientData[input.name] = input.value; 
        });
        
        const { error } = await _supabase.from('clients').update(updatedClientData).eq('id', id);
        
        if (error) {
            showStatusMessage(dom.editClientStatus, `Error: ${error.message}`, false);
        } else {
            showStatusMessage(dom.editClientStatus, "Client updated successfully.", true);
            fetchClientData(dom);
            setTimeout(() => closeEditClientModal(dom), 1500);
        }
        setLoading(false);
    });

    dom.imageUploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoading(true);
        showStatusMessage(dom.imageManagerStatus, `Uploading "${file.name}"...`, true);
        
        const validExtensions = ['jpeg', 'jpg', 'png', 'gif'];
        if (!validExtensions.includes(file.name.split('.').pop().toLowerCase())) {
            showStatusMessage(dom.imageManagerStatus, `Invalid file type. Only JPEG, PNG, GIF are allowed.`, false);
            setLoading(false);
            return;
        }

        const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
        try {
            await _supabase.storage.from('promotional_images').upload(fileName, file);
            showStatusMessage(dom.imageManagerStatus, `"${file.name}" uploaded successfully as "${fileName}".`, true);
            fetchImages(dom);
        } catch (error) {
            showStatusMessage(dom.imageManagerStatus, `Upload failed: ${error.message}`, false);
        }
        dom.imageUploadInput.value = '';
        setLoading(false);
    });

    function populateCheckboxes(segments = []) {
        dom.segmentContainer.innerHTML = '';
        createCheckbox('All', 'All clients', true);
        segments.forEach(segment => createCheckbox(segment, segment));
        dom.segmentContainer.addEventListener('change', (e) => handleSegmentChange(e, dom));
    }

    function createCheckbox(value, text, checked = false) {
        const label = document.createElement('label'); label.className = 'checkbox-item';
        const input = document.createElement('input'); input.type = 'checkbox'; input.value = value; input.checked = checked;
        const span = document.createElement('span'); span.className = 'checkmark';
        label.appendChild(input); label.appendChild(document.createTextNode(` ${text}`)); label.appendChild(span);
        dom.segmentContainer.appendChild(label);
    }
    
    function populateImages(images = []) {
        const list = document.getElementById('c-image-list'); 
        if (!list) return;
        list.innerHTML = '';
        if (images.length === 0) {
            list.innerHTML = '<option value="" disabled selected>No images found. Upload one.</option>';
        } else {
            images.forEach(img => { const opt = document.createElement('option'); opt.value = img.name; opt.textContent = img.name; list.appendChild(opt); });
            list.selectedIndex = 0;
        }
    }
    
    function handleSegmentChange(e, dom) {
        const allCheckbox = dom.segmentContainer.querySelector('input[value="All"]');
        const otherCheckboxes = Array.from(dom.segmentContainer.querySelectorAll('input:not([value="All"])'));
        if (e.target.value === 'All') {
            otherCheckboxes.forEach(cb => cb.checked = e.target.checked);
        } else {
            allCheckbox.checked = otherCheckboxes.length > 0 && otherCheckboxes.every(cb => cb.checked);
        }
    }
    

    // Add this function at the bottom of dashboard.js
    // 1. ONLY fetch the Total Count on load (Fast)
// ===================================================================
// --- ANALYTICS PAGE LOADER ---
// ===================================================================
async function loadAnalyticsPageData(dom, params) {
    // 1. Load the campaign selection dropdown
    loadAnalyticsDropdown(dom, params ? params.campaignId : null);

    // 2. Load the total site visits stat card
    const visitsEl = document.getElementById('analytics-total-visits');
    if (visitsEl) visitsEl.textContent = 'Loading...';

    try {
        const { count, error } = await _supabase
            .from('site_traffic')
            .select('id', { count: 'exact', head: true });

        if (error) throw error;
        
        if (visitsEl) {
            visitsEl.textContent = count || '0';
        }
    } catch (error) {
        console.error("Failed to load site visits count:", error);
        if (visitsEl) visitsEl.textContent = 'Error';
    }
}

// 2. Toggle visibility AND fetch data on click
window.toggleTrafficLog = async () => {
    const container = document.getElementById('traffic-log-container');
    const btnIcon = document.getElementById('traffic-btn-icon');
    
    // Toggle Display
    if (container.style.display === 'none') {
        container.style.display = 'block';
        btnIcon.innerHTML = '&#9662;'; // Down arrow
        
        // Fetch data ONLY if we haven't already populated the table
        // (Optimization: check if table has data rows to avoid spamming API)
        const tbody = document.querySelector('#traffic-table tbody');
        if(tbody.innerHTML.includes('Loading data') || tbody.children.length <= 1) {
            await fetchTrafficTableData();
        }
    } else {
        container.style.display = 'none';
        btnIcon.innerHTML = '&#9656;'; // Right arrow
    }
};

// 3. Helper function to actually get the list data
async function fetchTrafficTableData() {
    const tbody = document.querySelector('#traffic-table tbody');
    
    const { data: trafficLogs, error } = await _supabase
        .from('site_traffic')
        .select('created_at, ip_address, page, referrer')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; padding:15px;">Error loading logs.</td></tr>`;
        return;
    }

    tbody.innerHTML = ''; // Clear "Loading..."

    trafficLogs.forEach(log => {
        const row = document.createElement('tr');
        
        const dateStr = new Date(log.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let ref = log.referrer;
        if(!ref || ref.includes(window.location.hostname) || ref === 'Direct') {
            ref = '<span style="color:#999">Direct / Internal</span>';
        }

        row.innerHTML = `
            <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${dateStr}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #eee; font-family: monospace;">${log.ip_address || '-'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #eee; color: #2563eb;">${log.page}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${ref}</td>
        `;
        tbody.appendChild(row);
    });
}
    const notesList = document.getElementById('notes-list');
if (notesList) {
    notesList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.noteId) {
            loadNoteIntoEditor(li.dataset.noteId);
        }
    });
}

const noteForm = document.getElementById('note-form');
if (noteForm) {
    noteForm.addEventListener('submit', saveNote);
}

const btnNewNote = document.getElementById('btn-new-note');
if (btnNewNote) {
    btnNewNote.addEventListener('click', resetNoteForm);
}

const btnDeleteNote = document.getElementById('btn-delete-note');
if (btnDeleteNote) {
    btnDeleteNote.addEventListener('click', deleteNote);
}


// Inside DOMContentLoaded at the bottom of dashboard.js

    // ... after all other event listeners

    // --- ADD THIS NEW CODE for Inquiry Tabs ---
    const inquiryTabs = document.querySelectorAll('.tab-btn');
    if (inquiryTabs.length > 0) {
        inquiryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active button state
                inquiryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Fetch data for the selected status
                const status = tab.dataset.status;
                fetchInquiries(status);
            });
        });
    }


    const careerTabs = document.querySelectorAll('#page-careers .tab-btn');
    careerTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active button state
            careerTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetTabPaneId = `tab-pane-${tab.dataset.tab}`;
            
            // Hide all panes and show the target one
            document.querySelectorAll('#page-careers .tab-pane').forEach(pane => {
                pane.classList.toggle('active', pane.id === targetTabPaneId);
            });

            // Load data for the active tab if needed
            if (tab.dataset.tab === 'postings') {
                fetchJobPostingsAdmin();
            } else {
                fetchCareers();
            }
        });
    });


    // --- ADD THIS NEW CODE for Promotion Tabs ---
    const promotionTabs = document.querySelectorAll('#page-promotions .tab-btn');
    promotionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active button state
            promotionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetTabPaneId = `tab-pane-${tab.dataset.tab}`;
            
            // Hide all panes and show the target one
            document.querySelectorAll('#page-promotions .tab-pane').forEach(pane => {
                pane.classList.toggle('active', pane.id === targetTabPaneId);
            });

            // Load data for the active tab
            if (tab.dataset.tab === 'images') {
                fetchImages(window.dashboardDom);
            } else if (tab.dataset.tab === 'history') {
                fetchCampaignArchive(window.dashboardDom);
            }
        });
    });


    
    handleUserSession();
});
