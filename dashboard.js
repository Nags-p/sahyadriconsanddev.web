// ===================================================================
// --- 1. CONFIGURATION ---
// ===================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhyRr1lI3wFCiSDax3C6IIz8-XkmRxaBGVecUIIuhkmasK4hf8ra4QuJd5eyIxc54gcg/exec'; 
const SUPABASE_URL = 'https://qrnmnulzajmxrsrzgmlp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybm1udWx6YWpteHJzcnpnbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTEsImV4cCI6MjA3ODk3NDQ1MX0.BLlRbin09uEFtwsJNTAr8h-JSy1QofEKbW-F2ns-yio';

// --- SUPABASE CLIENT ---
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- STATE VARIABLES ---
let masterTemplateHtml = '', allCustomers = [], customerHeaders = [], availableSegments = [];

// ===================================================================
// --- 2. CORE FUNCTIONS ---
// ===================================================================
async function callApi(action, payload, callback, errorElementId = 'campaign-status') {
    setLoading(true);
    const statusElement = document.getElementById(errorElementId);
    if (statusElement) statusElement.style.display = 'none';
    
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        payload.jwt = session.access_token;
    } else {
        alert("Your session has expired. Please log in again.");
        logout();
        return;
    }

    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    window[callbackName] = function(data) {
        setLoading(false);
        if (data.message && (data.message.includes("Invalid JWT") || data.message.includes("Expired JWT"))) {
            alert("Your session is invalid or has expired. Please log in again.");
            logout();
        } else {
            callback(data);
        }
        if (document.getElementById(callbackName)) {
            document.body.removeChild(document.getElementById(callbackName));
        }
        delete window[callbackName];
    };
    
    const scriptTag = document.createElement('script');
    scriptTag.id = callbackName;
    scriptTag.src = `${SCRIPT_URL}?action=${action}&payload=${encodeURIComponent(JSON.stringify(payload))}&callback=${callbackName}`;
    scriptTag.onerror = () => {
        setLoading(false);
        const errorStatusElement = document.getElementById(errorElementId);
        if (errorStatusElement) {
            showStatusMessage(errorStatusElement, "Network Error: Failed to contact the API.", false);
        } else {
            alert("Network Error: Failed to contact the API.");
        }
        if (window[callbackName]) {
             if (document.getElementById(callbackName)) {
                document.body.removeChild(document.getElementById(callbackName));
            }
            delete window[callbackName];
        }
        callback({success: false, message: "Network Error"});
    };
    document.body.appendChild(scriptTag);
}

function setLoading(isLoading) {
    document.querySelectorAll('button').forEach(btn => btn.disabled = isLoading);
    const loader = document.getElementById('campaign-loader');
    if (loader) loader.style.display = isLoading ? 'block' : 'none';
}

function showStatusMessage(element, message, isSuccess) {
    if (!element) return;
    element.textContent = message;
    element.className = isSuccess ? 'status-message success' : 'status-message error';
    element.style.display = 'block';
}

function showPage(pageId, dom) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    dom.navItems.forEach(n => n.classList.remove('active'));
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
    if (activeNavItem) activeNavItem.classList.add('active');
    
    if (pageId === 'page-customers') fetchCustomerData(dom);
    if (pageId === 'page-archive') fetchCampaignArchive(dom);
    if (pageId === 'page-inquiries') fetchInquiries(dom, 'New');
    if (pageId === 'page-archived-inquiries') fetchInquiries(dom, 'Archived');
}

// ===================================================================
// --- 3. DATA HANDLING & RENDERING FUNCTIONS ---
// ===================================================================
function fetchInquiries(dom, status) {
    const containerId = status === 'New' ? 'inquiries-container' : 'archived-inquiries-container';
    const statusId = 'inquiries-status';
    const container = document.getElementById(containerId);
    
    if (!container) return;
    dom.campaignLoader.textContent = `Fetching ${status} inquiries...`;
    container.innerHTML = `<p>Loading...</p>`;
    
    callApi('getInquiries', { status: status }, response => {
        if (response.success) {
            renderInquiries(response.inquiries, dom, status);
        } else {
            container.innerHTML = `<p style="color: red;">Error: ${response.message}</p>`;
        }
    }, statusId);
}

function renderInquiries(inquiries, dom, status) {
    const containerId = status === 'New' ? 'inquiries-container' : 'archived-inquiries-container';
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (inquiries.length === 0) {
        container.innerHTML = `<p>No ${status.toLowerCase()} inquiries found.</p>`;
        return;
    }

    inquiries.forEach(inquiry => {
        const card = document.createElement('div');
        card.className = 'inquiry-card';

        const fileLink = inquiry.file_url 
            ? `<a href="${inquiry.file_url}" target="_blank" class="btn-secondary" style="display: inline-block; text-decoration: none; padding: 5px 10px; font-size: 14px; border-radius: 5px;">View File</a>` 
            : 'None';

        card.innerHTML = `
            <h4>${inquiry.name} <span style="font-size: 12px; color: #777; font-weight: normal;">(${new Date(inquiry.created_at).toLocaleDateString()})</span></h4>
            <p><strong>Email:</strong> ${inquiry.email}</p>
            <p><strong>Phone:</strong> ${inquiry.phone}</p>
            <p><strong>Location:</strong> ${inquiry.location}</p>
            <p><strong>Project Type:</strong> ${inquiry.project_type}</p>
            <p><strong>Budget:</strong> ${inquiry.budget_range || 'Not specified'}</p>
            <p><strong>Start Date:</strong> ${inquiry.start_date || 'Not specified'}</p>
            <p><strong>Attachment:</strong> ${fileLink}</p>
            <p class="inquiry-message"><strong>Message:</strong><br>${inquiry.message}</p>
        `;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'inquiry-actions';

        if (status === 'New') {
            const addBtn = document.createElement('button');
            addBtn.textContent = 'Add to Customers';
            addBtn.className = 'btn-primary';
            addBtn.addEventListener('click', () => {
                if (confirm(`Add ${inquiry.name} to customers? This will move it to the archived list.`)) {
                    callApi('addCustomerFromInquiry', { inquiryData: inquiry }, response => {
                        showStatusMessage(dom.inquiriesStatus, response.message, response.success);
                        if (response.success) fetchInquiries(dom, 'New');
                    }, 'inquiries-status');
                }
            });
            actionsDiv.appendChild(addBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Forever';
        deleteBtn.className = 'btn-danger';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`PERMANENTLY DELETE this inquiry from ${inquiry.name}? This cannot be undone.`)) {
                callApi('deleteInquiry', { inquiryId: inquiry.id }, response => {
                    showStatusMessage(dom.inquiriesStatus, response.message, response.success);
                    if (response.success) fetchInquiries(dom, status); 
                }, 'inquiries-status');
            }
        });

        actionsDiv.appendChild(deleteBtn);
        card.appendChild(actionsDiv);
        container.appendChild(card);
    });
}

function fetchCustomerData(dom) {
    dom.campaignLoader.textContent = 'Fetching customer list...';
    dom.customerTableBody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
    callApi('getCustomers', {}, response => {
        if (response.success) {
            allCustomers = response.customers;
            customerHeaders = response.headers.filter(h => h !== 'id' && h !== 'created_at');
            renderCustomerTable(allCustomers, dom);
        } else {
            showStatusMessage(dom.customerStatus, `Error: ${response.message}`, false);
        }
    }, 'customer-status');
}

function renderCustomerTable(customers, dom) {
    const tBody = dom.customerTableBody;
    const tHead = dom.customerTableHead;
    tBody.innerHTML = '';
    tHead.innerHTML = '';

    if (customers.length === 0) {
        tBody.innerHTML = `<tr><td colspan="${(customerHeaders.length || 5) + 1}">No customers match your search.</td></tr>`;
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
        editBtn.innerHTML = '&#9998;';
        editBtn.className = 'btn-info btn-icon';
        editBtn.title = 'Edit Customer';
        editBtn.addEventListener('click', () => openEditCustomerModal(customer, dom));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&#128465;';
        deleteBtn.className = 'btn-danger btn-icon';
        deleteBtn.title = 'Delete Customer';
        deleteBtn.addEventListener('click', () => deleteCustomerPrompt(customer.id, customer.name || customer.email, dom));

        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(deleteBtn);
        row.appendChild(actionsTd);
        tBody.appendChild(row);
    });
}

function fetchCampaignArchive(dom) {
    dom.campaignLoader.textContent = 'Fetching campaign history...';
    dom.archiveTableBody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;
    callApi('getCampaignArchive', {}, response => {
        if (response.success) {
            renderCampaignArchive(response.campaigns, dom);
        } else {
            dom.archiveTableBody.innerHTML = `<tr><td colspan="4">Error: ${response.message}</td></tr>`;
        }
    }, 'customer-status');
}

function renderCampaignArchive(campaigns, dom) {
    const tBody = dom.archiveTableBody;
    const tHead = dom.archiveTableHead;
    tBody.innerHTML = '';
    tHead.innerHTML = '<tr><th>Date</th><th>Subject</th><th>Recipients Sent</th><th>Actions</th></tr>';

    if (campaigns.length === 0) {
        tBody.innerHTML = `<tr><td colspan="4">No campaigns have been sent yet.</td></tr>`;
        return;
    }

    campaigns.forEach(campaign => {
        const row = document.createElement('tr');
        const sentDate = new Date(campaign.created_at).toLocaleString();
        
        row.innerHTML = `<td>${sentDate}</td><td>${campaign.subject}</td><td>${campaign.emails_sent}</td>`;
        
        const actionsTd = document.createElement('td');
        actionsTd.className = 'action-buttons';

        if (campaign.template_html) {
            const viewTemplateBtn = document.createElement('button');
            viewTemplateBtn.textContent = 'View Template';
            viewTemplateBtn.className = 'btn-info';
            viewTemplateBtn.style.flexGrow = '0';
            viewTemplateBtn.addEventListener('click', () => {
                const pWin = window.open('', '_blank');
                pWin.document.write(campaign.template_html);
                pWin.document.close();
            });
            actionsTd.appendChild(viewTemplateBtn);
        }
        
        if (campaign.recipients && campaign.recipients.length > 0) {
            const viewListBtn = document.createElement('button');
            viewListBtn.textContent = 'View List';
            viewListBtn.className = 'btn-secondary';
            viewListBtn.style.flexGrow = '0';
            viewListBtn.addEventListener('click', () => openRecipientsModal(campaign.recipients, campaign.subject, dom));
            actionsTd.appendChild(viewListBtn);
        }
        
        row.appendChild(actionsTd);
        tBody.appendChild(row);
    });
}

// ===================================================================
// --- 4. MODAL & FORM HANDLING ---
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

function deleteCustomerPrompt(id, customerIdentifier, dom) {
    if (confirm(`Are you sure you want to delete ${customerIdentifier || 'this customer'}?`)) {
        callApi('deleteCustomer', { id: id }, response => {
            showStatusMessage(dom.customerStatus, response.message, response.success);
            if (response.success) fetchCustomerData(dom);
        }, 'customer-status');
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
// --- 5. INITIALIZATION & AUTHENTICATION ---
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
        inquiriesStatus: document.getElementById('inquiries-status')
    };

    async function handleUserSession() {
        const { data: { session } } = await _supabase.auth.getSession();
        
        if (session) {
            const userRole = (session.user.app_metadata && session.user.app_metadata.role) || 'Viewer';
            document.body.className = `is-${userRole.toLowerCase().replace(' ', '-')}`;
            dom.userEmailDisplay.textContent = session.user.email;
            dom.userRoleDisplay.textContent = userRole; // Display the role
            initializeDashboard();
        } else {
            dom.loginOverlay.style.display = 'flex';
            dom.dashboardLayout.style.display = 'none';
        }
    }

    function initializeDashboard() {
        dom.loginOverlay.style.display = 'none';
        dom.dashboardLayout.style.display = 'flex';
        
        dom.campaignLoader.textContent = 'Fetching dashboard data...';
        callApi('getDashboardData', {}, data => {
            if (data.success) {
                masterTemplateHtml = data.templateHtml;
                availableSegments = data.segments;
                populateCheckboxes(data.segments);
                populateImages(data.images);
                showPage('page-inquiries', dom);
            } else {
                alert('Critical Error: Could not fetch dashboard data. ' + data.message);
            }
        });
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

    dom.navItems.forEach(item => item.addEventListener('click', () => showPage(item.dataset.page, dom)));
    
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
        const composedHtml = masterTemplateHtml
            .replace(/{{headline}}/g, cData.headline)
            .replace(/{{image_url}}/g, IMAGE_BASE_URL + cData.image_filename)
            .replace(/{{body_text}}/g, cData.body_text.replace(/\n/g, '<br>'))
            .replace(/{{cta_text}}/g, cData.cta_text)
            .replace(/{{cta_link}}/g, WEBSITE_BASE_URL + cData.cta_path)
            .replace(/{{unsubscribe_link_text}}/g, 'Preview Mode');
        const pWin = window.open('', '_blank');
        pWin.document.write(composedHtml);
        pWin.document.close();
    });

    document.getElementById('btn-send-test').addEventListener('click', () => {
        const campaignForm = document.getElementById('campaign-form');
        if (!campaignForm.checkValidity()) { campaignForm.reportValidity(); return; }
        callApi('sendTest', { campaignData: getCampaignData() }, r => showStatusMessage(dom.campaignStatus, r.message, r.success));
    });

    dom.campaignForm.addEventListener('submit', e => {
        e.preventDefault();
        const segs = getSelectedSegments(dom);
        if (segs.length === 0) { alert('Please select at least one segment.'); return; }
        const segText = segs.includes('All') ? "All Customers" : `${segs.length} segment(s)`;
        if (!confirm(`Send campaign to ${segText}?`)) return;
        callApi('runCampaign', { campaignData: getCampaignData(), segments: segs }, r => showStatusMessage(dom.campaignStatus, r.message, r.success));
    });

    dom.editModalClose.addEventListener('click', () => closeEditCustomerModal(dom));
    dom.editModalCancel.addEventListener('click', () => closeEditCustomerModal(dom));
    dom.recipientsModalClose.addEventListener('click', () => closeRecipientsModal(dom));
    
    dom.editCustomerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = dom.editCustomerRowId.value;
        const updatedCustomerData = {};
        dom.editCustomerFields.querySelectorAll('input, select').forEach(input => {
            updatedCustomerData[input.name] = input.value;
        });
        callApi('editCustomer', { id: id, customerData: updatedCustomerData }, response => {
            showStatusMessage(dom.editCustomerStatus, response.message, response.success);
            if (response.success) {
                fetchCustomerData(dom);
                setTimeout(() => closeEditCustomerModal(dom), 1500);
            }
        }, 'edit-customer-status');
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
            list.innerHTML = '<option value="" disabled selected>No images found in Storage.</option>';
        } else {
            images.forEach(img => { const opt = document.createElement('option'); opt.value = img; opt.textContent = img; list.appendChild(opt); });
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
    
    // Check user session on initial page load
    handleUserSession();
});