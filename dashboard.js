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
let masterTemplateHtml = '', allCustomers = [], customerHeaders = [], availableSegments = [];

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
    setTimeout(() => {
        element.style.display = 'none'; 
    }, 5000);
}

function showPage(pageId, dom, params = null) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    // Update Sidebar Active State
    // Convert 'page-something' to 'nav-something'
    const navId = pageId.replace('page-', 'nav-');
    dom.navItems.forEach(n => n.classList.remove('active'));
    const activeNav = document.getElementById(navId);
    if (activeNav) activeNav.classList.add('active');
    
    // Page Specific Data Loading
    if (pageId === 'page-customers') fetchCustomerData(dom);
    if (pageId === 'page-archive') fetchCampaignArchive(dom);
    if (pageId === 'page-inquiries') fetchInquiries(dom, 'New');
    if (pageId === 'page-archived-inquiries') fetchInquiries(dom, 'Archived');
    if (pageId === 'page-image-manager') fetchImages(dom);
    
    // Analytics Specific Logic
    if (pageId === 'page-analytics') {
        loadAnalyticsDropdown(dom, params ? params.campaignId : null);
    }
}

// ===================================================================
// --- 3. ANALYTICS TAB LOGIC ---
// ===================================================================

async function loadAnalyticsDropdown(dom, selectedId = null) {
    // 1. Fetch list of campaigns
    const { data: campaigns, error } = await _supabase
        .from('campaign_archive')
        .select('id, subject, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading campaign list:", error);
        return;
    }

    const select = dom.analyticsSelect;
    // Reset dropdown
    select.innerHTML = '<option value="" disabled selected>Select a campaign...</option>';

    campaigns.forEach(c => {
        const date = new Date(c.created_at).toLocaleDateString();
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${date} - ${c.subject}`;
        select.appendChild(option);
    });

    // 2. Handle Selection
    if (selectedId) {
        select.value = selectedId;
        fetchCampaignAnalytics(dom, selectedId);
    } else {
        dom.analyticsContent.style.display = 'none';
    }

    // 3. Attach Listener
    select.onchange = (e) => {
        const newId = e.target.value;
        history.pushState(null, null, `#analytics-${newId}`);
        fetchCampaignAnalytics(dom, newId);
    };
}

async function fetchCampaignAnalytics(dom, campaignId) {
    setLoading(true);
    
    // Reset stats view
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
// --- 4. DATA HANDLING (OTHER PAGES) ---
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
    const tHead = dom.archiveTableHead;
    tBody.innerHTML = '';
    tHead.innerHTML = '<tr><th>Date</th><th>Subject</th><th>Sent</th><th>Opens</th><th>Clicks</th><th>Actions</th></tr>';

    if (campaigns.length === 0) {
        tBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No campaigns have been sent yet.</td></tr>`;
        return;
    }
    
    const campaignIds = campaigns.map(c => c.id);
    const { data: allOpens, error: opensError } = await _supabase.from('email_opens').select('campaign_id, recipient_email').in('campaign_id', campaignIds);
    const { data: allClicks, error: clicksError } = await _supabase.from('email_clicks').select('campaign_id, recipient_email').in('campaign_id', campaignIds);
    
    if (opensError || clicksError) {
        showStatusMessage(dom.customerStatus, 'Error fetching tracking data.', false);
    }
    
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
            } else if (newName === oldName) {
                showStatusMessage(dom.imageManagerStatus, "New name is the same as the old name. No change made.", true);
            }
        });

        card.querySelector('.btn-copy-url').addEventListener('click', () => {
            navigator.clipboard.writeText(publicUrl)
                .then(() => showStatusMessage(dom.imageManagerStatus, `URL for "${image.name}" copied to clipboard!`, true))
                .catch(err => showStatusMessage(dom.imageManagerStatus, `Failed to copy URL: ${err.message}`, false));
        });
    });
}

async function fetchInquiries(dom, status) {
    setLoading(true);
    const containerId = status === 'New' ? 'inquiries-container' : 'archived-inquiries-container';
    const container = document.getElementById(containerId);
    container.innerHTML = `<p style="text-align: center;">Loading...</p>`;
    try {
        const { data, error } = await _supabase.from('contact_inquiries').select('*').eq('status', status).order('created_at', { ascending: false });
        if (error) throw error;
        renderInquiries(data, dom, status);
    } catch (error) {
        container.innerHTML = `<p style="color: var(--danger-color); text-align: center;">Error: ${error.message}</p>`;
    }
    setLoading(false);
}

function renderInquiries(inquiries, dom, status) {
    const containerId = status === 'New' ? 'inquiries-container' : 'archived-inquiries-container';
    const container = document.getElementById(containerId);
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
            <p><strong><i class="fas fa-building"></i> Project Type:</strong> ${inquiry.project_type || 'N/A'}</p>
            <p><strong><i class="fas fa-money-bill-wave"></i> Budget:</strong> ${inquiry.budget_range || 'Not specified'}</p>
            <p><strong><i class="fas fa-calendar-alt"></i> Start Date:</strong> ${inquiry.start_date || 'Not specified'}</p>
            <p><strong><i class="fas fa-paperclip"></i> Attachment:</strong> ${fileLink}</p>
            <p class="inquiry-message"><strong><i class="fas fa-comment"></i> Message:</strong><br>${inquiry.message}</p>
        `;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'inquiry-actions';

        if (status === 'New') {
            const addBtn = document.createElement('button');
            addBtn.innerHTML = '<i class="fas fa-user-plus"></i> Add to Customers';
            addBtn.className = 'btn-primary';
            addBtn.addEventListener('click', async () => {
                if (confirm(`Add ${inquiry.name} to customers? This will move it to the archived list.`)) {
                    setLoading(true);
                    const { data: existing, error: checkError } = await _supabase.from('customers').select('id').eq('email', inquiry.email).single();
                    if (checkError && checkError.code !== 'PGRST116') {
                         showStatusMessage(dom.inquiriesStatus, `Error checking existing customer: ${checkError.message}`, false);
                         setLoading(false); return;
                    }
                    if (existing) {
                        showStatusMessage(dom.inquiriesStatus, `Customer with email ${inquiry.email} already exists.`, false);
                        setLoading(false); return;
                    }
                    const { error: insertError } = await _supabase.from('customers').insert([{ name: inquiry.name, email: inquiry.email, phone: inquiry.phone, city: inquiry.location, segment: 'New Lead' }]);
                    if (insertError) {
                         showStatusMessage(dom.inquiriesStatus, `Error adding customer: ${insertError.message}`, false);
                         setLoading(false); return;
                    }
                    const { error: updateError } = await _supabase.from('contact_inquiries').update({ status: 'Archived' }).eq('id', inquiry.id);
                    showStatusMessage(dom.inquiriesStatus, updateError ? `Customer added, but failed to archive: ${updateError.message}` : `Customer '${inquiry.name}' added and archived.`, !updateError);
                    fetchInquiries(dom, 'New');
                    setLoading(false);
                }
            });
            actionsDiv.appendChild(addBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Forever';
        deleteBtn.className = 'btn-danger';
        deleteBtn.addEventListener('click', async () => {
             if (confirm(`PERMANENTLY DELETE this inquiry from ${inquiry.name}?`)) {
                setLoading(true);
                const { error } = await _supabase.from('contact_inquiries').delete().eq('id', inquiry.id);
                showStatusMessage(dom.inquiriesStatus, error ? `Error: ${error.message}` : 'Inquiry deleted.', !error);
                if (!error) fetchInquiries(dom, status);
                setLoading(false);
             }
        });

        actionsDiv.appendChild(deleteBtn);
        card.appendChild(actionsDiv);
        container.appendChild(card);
    });
}

async function fetchCustomerData(dom) {
    setLoading(true);
    dom.customerTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>`;
    try {
        const { data, error } = await _supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allCustomers = data;
        customerHeaders = data.length > 0 ? Object.keys(data[0]).filter(h => h !== 'id' && h !== 'created_at') : ['name', 'email', 'phone', 'city', 'segment'];
        renderCustomerTable(allCustomers, dom);
    } catch(error) {
        showStatusMessage(dom.customerStatus, `Error: ${error.message}`, false);
    }
    setLoading(false);
}

function renderCustomerTable(customers, dom) {
    const tBody = dom.customerTableBody;
    const tHead = dom.customerTableHead;
    tBody.innerHTML = '';
    tHead.innerHTML = '';

    if (customers.length === 0) {
        tBody.innerHTML = `<tr><td colspan="${(customerHeaders.length || 5) + 1}" style="text-align: center;">No customers found.</td></tr>`;
        return;
    }

    const headerRow = document.createElement('tr');
    customerHeaders.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.charAt(0).toUpperCase() + header.slice(1);
        headerRow.appendChild(th);
    });
    const actionsTh = document.createElement('th');
    actionsTh.textContent = 'Actions';
    headerRow.appendChild(actionsTh);
    tHead.appendChild(headerRow);

    customers.forEach(customer => {
        const row = document.createElement('tr');
        customerHeaders.forEach(header => {
            const td = document.createElement('td');
            td.textContent = customer[header] || '';
            row.appendChild(td);
        });
        
        const actionsTd = document.createElement('td');
        actionsTd.className = 'action-buttons';
        
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.className = 'btn-info btn-icon';
        editBtn.title = 'Edit Customer';
        editBtn.addEventListener('click', () => openEditCustomerModal(customer, dom));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.className = 'btn-danger btn-icon';
        deleteBtn.title = 'Delete Customer';
        deleteBtn.addEventListener('click', () => deleteCustomerPrompt(customer.id, customer.name || customer.email, dom));

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);
        tBody.appendChild(row);
    });
}

// ===================================================================
// --- 5. MODAL & FORM HANDLING ---
// ===================================================================
function openEditCustomerModal(customer, dom) {
    dom.editCustomerRowId.value = customer.id;
    dom.editCustomerFields.innerHTML = '';
    dom.editCustomerStatus.style.display = 'none';
    
    customerHeaders.forEach(header => {
        const label = document.createElement('label');
        label.textContent = header.charAt(0).toUpperCase() + header.slice(1);
        dom.editCustomerFields.appendChild(label);
        
        if (header === 'segment') {
            const select = document.createElement('select'); 
            select.name = header;
            const blankOpt = document.createElement('option'); 
            blankOpt.value = ''; 
            blankOpt.textContent = 'No Segment'; 
            select.appendChild(blankOpt);
            availableSegments.forEach(s => { 
                const opt = document.createElement('option'); 
                opt.value = s; 
                opt.textContent = s; 
                select.appendChild(opt); 
            });
            select.value = customer[header] || '';
            dom.editCustomerFields.appendChild(select);
        } else {
            const input = document.createElement('input'); 
            input.type = (header === 'phone' || header === 'city') ? 'text' : (header === 'email' ? 'email' : 'text');
            input.name = header; 
            input.value = customer[header] || '';
            dom.editCustomerFields.appendChild(input);
        }
    });
    dom.editCustomerModalOverlay.classList.add('active');
}

function closeEditCustomerModal(dom) { 
    dom.editCustomerModalOverlay.classList.remove('active'); 
}

async function deleteCustomerPrompt(id, customerIdentifier, dom) {
    if (confirm(`Are you sure you want to delete ${customerIdentifier || 'this customer'}?`)) {
        setLoading(true);
        const { error } = await _supabase.from('customers').delete().eq('id', id);
        if (error) {
            showStatusMessage(dom.customerStatus, `Error: ${error.message}`, false);
        } else {
            showStatusMessage(dom.customerStatus, "Customer deleted.", true);
            fetchCustomerData(dom);
        }
        setLoading(false);
    }
}

function openRecipientsModal(recipients, subject, dom) {
    dom.recipientsModalTitle.textContent = `Recipients for "${subject}"`;
    dom.recipientsList.innerHTML = '';
    
    if (recipients.length > 0) {
        recipients.forEach(email => { 
            const li = document.createElement('li'); 
            li.textContent = email; 
            dom.recipientsList.appendChild(li); 
        });
    } else {
        dom.recipientsList.innerHTML = '<li>No recipients were recorded for this campaign.</li>';
    }
    
    dom.recipientsModalOverlay.classList.add('active');
}

function closeRecipientsModal(dom) { 
    dom.recipientsModalOverlay.classList.remove('active'); 
}

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

// ===================================================================
// --- 6. INITIALIZATION & AUTHENTICATION ---
// ===================================================================
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
        customerTableBody: document.querySelector('#customer-table tbody'),
        customerTableHead: document.querySelector('#customer-table thead'),
        customerSearch: document.getElementById('customer-search'),
        customerStatus: document.getElementById('customer-status'),
        archiveTableBody: document.querySelector('#archive-table tbody'),
        archiveTableHead: document.querySelector('#archive-table thead'),
        editCustomerModalOverlay: document.getElementById('edit-customer-modal-overlay'),
        editCustomerForm: document.getElementById('edit-customer-form'),
        editCustomerRowId: document.getElementById('edit-customer-rowid'),
        editCustomerFields: document.getElementById('edit-customer-fields'),
        editModalClose: document.getElementById('edit-modal-close'),
        editModalCancel: document.getElementById('edit-modal-cancel'),
        editCustomerStatus: document.getElementById('edit-customer-status'),
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
        // New Analytics DOM Elements
        analyticsPage: document.getElementById('page-analytics'),
        analyticsSelect: document.getElementById('analytics-campaign-select'),
        analyticsContent: document.getElementById('analytics-dashboard-content'),
        analyticsOpensList: document.getElementById('analytics-opens-list'),
        analyticsClicksList: document.getElementById('analytics-clicks-list')
    };

    function handleHashChange() {
        const hash = window.location.hash.substring(1);
        
        if (hash.startsWith('analytics')) {
            const parts = hash.split('-');
            const campaignId = parts.length > 1 ? parts[1] : null;
            showPage('page-analytics', dom, { campaignId });
        } else {
            // FIXED: Do not replace hyphens with underscores
            const pageId = `page-${hash || 'inquiries'}`; 
            if (document.getElementById(pageId)) {
                showPage(pageId, dom);
            } else {
                showPage('page-inquiries', dom);
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

    async function initializeDashboard() {
        setLoading(true);
        dom.loginOverlay.style.display = 'none';
        dom.dashboardLayout.style.display = 'flex';
        try {
            dom.campaignLoader.textContent = 'Fetching dashboard data...';
            const [segmentsRes, imagesRes, templateRes] = await Promise.all([
                _supabase.from('customers').select('segment'),
                _supabase.storage.from('promotional_images').list('', { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } }),
                fetch(MASTER_TEMPLATE_URL).then(res => res.text())
            ]);
            if (segmentsRes.error) throw segmentsRes.error;
            if (imagesRes.error) throw imagesRes.error;
            availableSegments = [...new Set(segmentsRes.data.map(item => item.segment))].filter(Boolean);
            masterTemplateHtml = templateRes;
            populateCheckboxes(availableSegments);
            populateImages(imagesRes.data);
            handleHashChange();
        } catch(error) {
            alert(`Critical Error: Could not fetch dashboard data. ${error.message}`);
        }
        setLoading(false);
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
    
    dom.navItems.forEach(item => item.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page.replace('page-','');
        window.location.hash = page.replace(/_/g, '-');
    }));
    
    window.addEventListener('hashchange', handleHashChange);
    
    dom.customerSearch.addEventListener('keyup', () => {
        const searchTerm = dom.customerSearch.value.toLowerCase();
        const filteredCustomers = allCustomers.filter(customer =>
            Object.values(customer).some(val => String(val).toLowerCase().includes(searchTerm))
        );
        renderCustomerTable(filteredCustomers, dom);
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
        const segText = segs.includes('All') ? "All Customers" : `${segs.length} segment(s)`;
        if (!confirm(`Send campaign to ${segText}?`)) return;

        setLoading(true);
        showStatusMessage(dom.campaignStatus, "Preparing campaign...", true);
        
        const campaignData = getCampaignData();

        try {
            const { data: campaignRecord, error: insertError } = await _supabase.from('campaign_archive').insert({ subject: campaignData.subject, segments: segs.join(', ') }).select().single();
            if (insertError) throw insertError;
            
            campaignData.campaignId = campaignRecord.id;
            showStatusMessage(dom.campaignStatus, "Sending emails...", true);

            callEmailApi('runCampaign', { campaignData: campaignData, segments: segs }, async (r) => {
                if (r.success) {
                    const emailCount = (r.message.match(/\d+/) || [0])[0];
                    const { error: updateError } = await _supabase.from('campaign_archive').update({ emails_sent: parseInt(emailCount, 10) }).eq('id', campaignRecord.id);
                    if (updateError) {
                        showStatusMessage(dom.campaignStatus, `Emails sent, but failed to update archive: ${updateError.message}`, false);
                    } else {
                        showStatusMessage(dom.campaignStatus, r.message, r.success);
                    }
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

    dom.editModalClose.addEventListener('click', () => closeEditCustomerModal(dom));
    dom.editModalCancel.addEventListener('click', () => closeEditCustomerModal(dom));
    dom.recipientsModalClose.addEventListener('click', () => closeRecipientsModal(dom));

    
    dom.editCustomerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        setLoading(true);
        const id = dom.editCustomerRowId.value;
        const updatedCustomerData = {};
        dom.editCustomerFields.querySelectorAll('input, select').forEach(input => { updatedCustomerData[input.name] = input.value; });
        const { error } = await _supabase.from('customers').update(updatedCustomerData).eq('id', id);
        if (error) {
            showStatusMessage(dom.editCustomerStatus, `Error: ${error.message}`, false);
        } else {
            showStatusMessage(dom.editCustomerStatus, "Customer updated successfully.", true);
            fetchCustomerData(dom);
            setTimeout(() => closeEditCustomerModal(dom), 1500);
        }
        setLoading(false);
    });

    // --- Image Upload Preview & Handling ---
    dom.imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                dom.imageUploadPreview.style.backgroundImage = `url('${e.target.result}')`;
                dom.imageUploadPreview.classList.add('has-image');
                dom.imageUploadPreview.innerHTML = '';
            };
            reader.readAsDataURL(file);
        } else {
            dom.imageUploadPreview.style.backgroundImage = 'none';
            dom.imageUploadPreview.classList.remove('has-image');
            dom.imageUploadPreview.innerHTML = '<span>No Image Selected</span>';
        }
    });

    dom.imageUploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoading(true);
        showStatusMessage(dom.imageManagerStatus, `Uploading "${file.name}"...`, true);
        
        const validExtensions = ['jpeg', 'jpg', 'png', 'gif'];
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(fileExt)) {
            showStatusMessage(dom.imageManagerStatus, `Invalid file type. Only JPEG, PNG, GIF are allowed.`, false);
            setLoading(false);
            dom.imageUploadInput.value = '';
            dom.imageUploadPreview.style.backgroundImage = 'none';
            dom.imageUploadPreview.classList.remove('has-image');
            dom.imageUploadPreview.innerHTML = '<span>No Image Selected</span>';
            return;
        }

        const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
        try {
            const { error } = await _supabase.storage.from('promotional_images').upload(fileName, file);
            if (error) throw error;
            showStatusMessage(dom.imageManagerStatus, `"${file.name}" uploaded successfully as "${fileName}".`, true);
            fetchImages(dom);
        } catch (error) {
            showStatusMessage(dom.imageManagerStatus, `Upload failed: ${error.message}`, false);
        }
        dom.imageUploadInput.value = '';
        dom.imageUploadPreview.style.backgroundImage = 'none';
        dom.imageUploadPreview.classList.remove('has-image');
        dom.imageUploadPreview.innerHTML = '<span>No Image Selected</span>';
        setLoading(false);
    });

    function populateCheckboxes(segments = []) {
        dom.segmentContainer.innerHTML = '';
        createCheckbox('All', 'All Customers', true);
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
    
    handleUserSession();
});