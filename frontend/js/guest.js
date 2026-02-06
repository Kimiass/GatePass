// Guest Dashboard Functionality

let visits = [];
let hosts = [];

// Load dashboard data
async function loadDashboard() {
    if (!requireAuth() || !hasRole('guest')) {
        window.location.href = '../pages/login.html';
        return;
    }

    updateUserInfo();
    await loadHosts();
    await loadVisits();
}

// Update user info in header
function updateUserInfo() {
    const user = getUserInfo();
    if (user) {
        document.getElementById('user-name').textContent = user.name;
        document.getElementById('user-role').textContent = getRoleText(user.role);
    }
}

// Load available hosts
async function loadHosts() {
    try {
        const data = await apiCall('/visits/hosts');
        hosts = data.hosts;

        const select = document.getElementById('host-select');
        select.innerHTML = '<option value="">انتخاب میزبان...</option>';

        hosts.forEach(host => {
            const option = document.createElement('option');
            option.value = host.id;
            option.textContent = `${host.name} (${host.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        showAlert('خطا در دریافت لیست میزبان‌ها', 'danger');
    }
}

// Load my visits
async function loadVisits(filters = {}) {
    showLoading();
    try {
        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

        const query = queryParams.toString();
        const endpoint = `/visits/me${query ? '?' + query : ''}`;

        const data = await apiCall(endpoint);
        visits = data.visits;

        renderVisits();
        updateStats();
    } catch (error) {
        showAlert('خطا در دریافت درخواست‌ها', 'danger');
    } finally {
        hideLoading();
    }
}

// Render visits table
function renderVisits() {
    const tbody = document.getElementById('visits-tbody');

    if (visits.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-title">هیچ درخواستی ثبت نشده</div>
                        <div class="empty-state-text">برای شروع، یک درخواست ورود جدید ثبت کنید</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = visits.map(visit => `
        <tr>
            <td>${visit.id}</td>
            <td>${visit.host_name || 'نامشخص'}</td>
            <td>${formatDate(visit.visit_date)}</td>
            <td><span class="status-pill status-${visit.status}">${getStatusText(visit.status)}</span></td>
            <td>${visit.purpose.substring(0, 50)}${visit.purpose.length > 50 ? '...' : ''}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewVisitDetails(${visit.id})">
                    جزئیات
                </button>
            </td>
        </tr>
    `).join('');
}

// Update statistics
function updateStats() {
    const pending = visits.filter(v => v.status === 'pending_host' || v.status === 'pending_security').length;
    const approved = visits.filter(v => v.status === 'approved').length;
    const completed = visits.filter(v => v.status === 'completed').length;

    document.getElementById('stat-total').textContent = visits.length;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-approved').textContent = approved;
    document.getElementById('stat-completed').textContent = completed;
}

// Create new visit request
async function handleCreateVisit(event) {
    event.preventDefault();

    const hostId = document.getElementById('host-select').value;
    const visitDate = document.getElementById('visit-date').value;
    const purpose = document.getElementById('purpose').value;

    if (!hostId || !visitDate || !purpose) {
        showAlert('لطفاً تمام فیلدها را پر کنید', 'warning');
        return;
    }

    showLoading();
    try {
        await apiCall('/visits', {
            method: 'POST',
            body: JSON.stringify({
                hostId: parseInt(hostId),
                visitDate,
                purpose
            })
        });

        showAlert('درخواست شما با موفقیت ثبت شد', 'success');
        closeModal('create-visit-modal');
        document.getElementById('create-visit-form').reset();
        await loadVisits();
    } catch (error) {
        showAlert(error.message || 'خطا در ثبت درخواست', 'danger');
    } finally {
        hideLoading();
    }
}

// View visit details
async function viewVisitDetails(visitId) {
    showLoading();
    try {
        const data = await apiCall(`/visits/${visitId}`);
        const visit = data.visit;
        const history = data.history || [];

        // Populate modal
        document.getElementById('detail-id').textContent = visit.id;
        document.getElementById('detail-host').textContent = visit.host_name;
        document.getElementById('detail-date').textContent = formatDate(visit.visit_date);
        document.getElementById('detail-status').innerHTML = `<span class="status-pill status-${visit.status}">${getStatusText(visit.status)}</span>`;
        document.getElementById('detail-purpose').textContent = visit.purpose;
        document.getElementById('detail-created').textContent = formatDateTime(visit.created_at);

        // Rejection reason
        const rejectionDiv = document.getElementById('detail-rejection');
        if (visit.status === 'rejected_by_host' && visit.rejection_reason) {
            rejectionDiv.innerHTML = `
                <div class="alert alert-danger">
                    <strong>دلیل رد:</strong> ${visit.rejection_reason}
                </div>
            `;
        } else {
            rejectionDiv.innerHTML = '';
        }

        // Pass code
        const passDiv = document.getElementById('detail-pass');
        if (visit.status === 'approved' || visit.status === 'completed') {
            // Try to get pass info
            try {
                const passData = await apiCall(`/visits/${visitId}`);
                // This would need additional endpoint or include pass in visit details
                passDiv.innerHTML = `
                    <div class="pass-code-display">
                        <div class="pass-code-label">کد مجوز شما</div>
                        <div class="pass-code-value">در انتظار دریافت</div>
                    </div>
                `;
            } catch {
                passDiv.innerHTML = '';
            }
        } else {
            passDiv.innerHTML = '';
        }

        // Status history
        const historyDiv = document.getElementById('detail-history');
        if (history.length > 0) {
            historyDiv.innerHTML = `
                <h4 class="mb-2">تاریخچه وضعیت</h4>
                <div class="timeline">
                    ${history.map(h => `
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <div class="timeline-title">${getStatusText(h.new_status)}</div>
                                <div class="timeline-time">${formatDateTime(h.changed_at)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            historyDiv.innerHTML = '';
        }

        openModal('visit-details-modal');
    } catch (error) {
        showAlert('خطا در دریافت جزئیات درخواست', 'danger');
    } finally {
        hideLoading();
    }
}

// Apply filters
function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    const filters = {};
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    loadVisits(filters);
}

// Clear filters
function clearFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    loadVisits();
}

// Set minimum date for visit date input
function setMinDate() {
    const dateInput = document.getElementById('visit-date');
    if (dateInput) {
        dateInput.min = getTodayDate();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadDashboard();
    setMinDate();

    // Event listeners
    const createForm = document.getElementById('create-visit-form');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateVisit);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});