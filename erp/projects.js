document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION ---
    const { createClient } = supabase;
    const _supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    let allProjects = []; // Cache for projects

    async function checkAuthAndLoad() {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        initializeApp();
    }

    function initializeApp() {
        const projectsTableBody = document.getElementById('projects-table-body');
        const addProjectBtn = document.getElementById('add-project-btn');
        const projectModal = document.getElementById('project-modal');
        const closeModalBtn = document.getElementById('project-modal-close-btn');
        const projectForm = document.getElementById('project-form');
        const formStatus = document.getElementById('project-form-status');
        const modalTitle = document.querySelector('#project-modal h3');

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString.replace(/-/g, '/'));
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        }

        async function loadProjects() {
            projectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading...</td></tr>`;
            const { data, error } = await _supabase.from('erp_projects').select('*').order('created_at', { ascending: false });
            if (error) {
                projectsTableBody.innerHTML = `<tr><td colspan="7" style="color: red;">Error: ${error.message}</td></tr>`;
                return;
            }
            allProjects = data;
            renderProjectsTable(allProjects);
        }

        function renderProjectsTable(projects) {
            projectsTableBody.innerHTML = '';
            if (projects.length === 0) {
                projectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No projects found.</td></tr>`;
                return;
            }
            projects.forEach(p => {
                const tr = document.createElement('tr');
                
                let statusColor = '#64748b';
                if (p.status === 'Active') statusColor = '#15803d';
                if (p.status === 'On Hold') statusColor = '#a16207';
                if (p.status === 'Completed') statusColor = '#1d4ed8';

                tr.innerHTML = `
                    <td><strong>${p.project_code || 'N/A'}</strong></td>
                    <td>${p.project_name}</td>
                    <td>${p.site_location || 'N/A'}</td>
                    <td>${formatDate(p.start_date)}</td>
                    <td>${formatDate(p.end_date)}</td>
                    <td><span class="status-badge" style="background-color: ${statusColor}20; color: ${statusColor};">${p.status}</span></td>
                    <td class="action-buttons">
                        <button class="btn-secondary btn-icon edit-btn" data-id="${p.id}" title="Edit Project"><i class="fas fa-edit"></i></button>
                    </td>
                `;
                projectsTableBody.appendChild(tr);
            });
        }

        function openModal(project = null) {
            projectForm.reset();
            formStatus.style.display = 'none';
            
            if (project) {
                // EDIT MODE
                modalTitle.textContent = "Edit Project";
                document.getElementById('project_name').value = project.project_name || '';
                document.getElementById('project_code').value = project.project_code || '';
                document.getElementById('site_location').value = project.site_location || '';
                document.getElementById('start_date').value = project.start_date || '';
                document.getElementById('end_date').value = project.end_date || '';
                document.getElementById('status').value = project.status || 'Planning';
                projectForm.dataset.projectId = project.id;
            } else {
                // ADD MODE
                modalTitle.textContent = "Add New Project";
                delete projectForm.dataset.projectId;
            }
            projectModal.classList.add('active');
        }

        function closeModal() {
            projectModal.classList.remove('active');
        }

        async function handleFormSubmit(e) {
            e.preventDefault();
            const projectId = projectForm.dataset.projectId;
            
            const projectData = {
                project_name: document.getElementById('project_name').value,
                project_code: document.getElementById('project_code').value,
                site_location: document.getElementById('site_location').value,
                start_date: document.getElementById('start_date').value || null,
                end_date: document.getElementById('end_date').value || null,
                status: document.getElementById('status').value,
            };

            let error;

            try {
                if (projectId) {
                    const { error: updateError } = await _supabase.from('erp_projects').update(projectData).eq('id', projectId);
                    error = updateError;
                } else {
                    const { error: insertError } = await _supabase.from('erp_projects').insert([projectData]);
                    error = insertError;
                }

                if (error) throw error;
                
                closeModal();
                loadProjects();

            } catch (err) {
                console.error("Form Submit Error:", err);
                formStatus.textContent = `Error: ${err.message}`;
                formStatus.style.display = 'block';
            }
        }

        projectsTableBody.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-btn');
            if (editButton) {
                const projectId = editButton.dataset.id;
                const projectToEdit = allProjects.find(p => p.id == projectId);
                openModal(projectToEdit);
            }
        });

        addProjectBtn.addEventListener('click', () => openModal());
        closeModalBtn.addEventListener('click', closeModal);
        projectModal.addEventListener('click', (e) => {
            if (e.target === projectModal) closeModal();
        });
        projectForm.addEventListener('submit', handleFormSubmit);
        loadProjects();
    }

    checkAuthAndLoad();
});