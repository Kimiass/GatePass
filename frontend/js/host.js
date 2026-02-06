// Host Dashboard Functionality

let visits = [];

// Load dashboard
async function loadDashboard() {
    if (!requireAuth() || !hasRole('host')) {
        window.location.href = '../pages/login.html';
        return;
    }

    updateUserInfo();
    await loadVisits();
}

// Update user info
function updateUserInfo() {
    const user = getUserInfo();
    if (user) {
        document.getElementById('user-name').textContent = user.name;
        document.getElementById('user-role').textContent = getRoleText(user.role);
    }
}

// Load visits for host
async function loadVisits(filters = {}) {
    showLoading();
    try {
        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

        const query = queryParams.toString();
        const endpoint = `/visits/host${query ? '?' + query : ''}`;

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

// Render visits
function renderVisits() {
    const tbody = document.getElementById('visits-tbody');

    if (visits.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-title">هیچ درخواستی وجود ندارد</div>
                        <div class="empty-state-text">درخواست‌های ورود مهمان‌ها در اینجا نمایش داده می‌شود</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = visits.map(visit => `
        <tr>
            <td>${visit.id}</td>
            <td>${visit.guest_name}</td>
            <td>${visit.guest_phone || 'ندارد'}</td>
            <td>${formatDate(visit.visit_date)}</td>
            <td><span class="status-pill status-${visit.status}">${getStatusText(visit.status)}</span></td>
            <td>${visit.purpose.substring(0, 40)}${visit.purpose.length > 40 ? '...' : ''}</td>
            <td>
                ${visit.status === 'pending_host' ? `
                    <button class="btn btn-sm btn-success" onclick="approveVisit(${visit.id})">
                        تأیید
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="openRejectModal(${visit.id})">
                        رد
                    </button>
                ` : `
                    <button class="btn btn-sm btn-outline" onclick="viewVisitDetails(${visit.id})">
                        جزئیات
                    </button>
                `}
            </td>
        </tr>
    `).join('');
}

// Update stats
function updateStats() {
    const pending = visits.filter(v => v.status === 'pending_host').length;
    const approved = visits.filter(v => v.status === 'pending_security' || v.status === 'approved' || v.status === 'completed').length;
    const rejected = visits.filter(v => v.status === 'rejected_by_host').length;

    document.getElementById('stat-total').textContent = visits.length;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-approved').textContent = approved;
    document.getElementById('stat-rejected').textContent = rejected;
}

// Approve visit
async function approveVisit(visitId) {
    const result = await Swal.fire({
        text: "آیا از تأیید این درخواست اطمینان دارید؟",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'تأیید',
        cancelButtonText: 'انصراف',
        reverseButtons: true,

        confirmButtonColor: '#E2A16F',
        cancelButtonColor: '#86B0BD',

        background: '#f0f0f0',
        color: '#4b5563',
        backdrop: 'rgba(0,0,0,0.5)',

        showClass: {
            popup: 'animate__animated animate__fadeInUp animate__faster'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutDown animate__faster'
        },

        customClass: {
            popup: 'my-swal-popup',
            confirmButton: 'my-confirm-btn',
            cancelButton: 'my-cancel-btn'
        }
    });

    if (!result.isConfirmed) return;

    showLoading();

    try {
        await apiCall(`/visits/${visitId}/approve`, {
            method: 'PATCH'
        });

        showAlert('درخواست با موفقیت تأیید شد', 'success');
        await loadVisits();

    } catch (error) {
        showAlert(error.message || 'خطا در تأیید درخواست', 'danger');
    } finally {
        hideLoading();
    }
}


// Open reject modal
function openRejectModal(visitId) {
    document.getElementById('reject-visit-id').value = visitId;
    document.getElementById('rejection-reason').value = '';
    openModal('reject-modal');
}

// Reject visit
async function handleRejectVisit(event) {
    event.preventDefault();

    const visitId = document.getElementById('reject-visit-id').value;
    const rejectionReason = document.getElementById('rejection-reason').value;

    if (!rejectionReason || rejectionReason.trim().length < 10) {
        showAlert('دلیل رد باید حداقل 10 کاراکتر باشد', 'warning');
        return;
    }

    showLoading();
    try {
        await apiCall(`/visits/${visitId}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ rejectionReason })
        });

        showAlert('درخواست رد شد', 'success');
        closeModal('reject-modal');
        await loadVisits();
    } catch (error) {
        showAlert(error.message || 'خطا در رد درخواست', 'danger');
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

        document.getElementById('detail-id').textContent = visit.id;
        document.getElementById('detail-guest').textContent = visit.guest_name;
        document.getElementById('detail-guest-email').textContent = visit.guest_email;
        document.getElementById('detail-guest-phone').textContent = visit.guest_phone || 'ندارد';
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
                                <div class="timeline-time">${formatDateTime(h.changed_at)} - توسط ${h.changed_by_name || 'سیستم'}</div>
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
        showAlert('خطا در دریافت جزئیات', 'danger');
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

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadDashboard();

    const rejectForm = document.getElementById('reject-form');
    if (rejectForm) {
        rejectForm.addEventListener('submit', handleRejectVisit);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});