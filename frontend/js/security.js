// Security Dashboard Functionality

let visits = [];
let presentVisitors = [];

// Load dashboard
async function loadDashboard() {
    if (!requireAuth() || !hasRole('security', 'admin')) {
        window.location.href = '/login.html';
        return;
    }

    updateUserInfo();
    await loadVisits();
    await loadPresentVisitors();
}

// Update user info
function updateUserInfo() {
    const user = getUserInfo();
    if (user) {
        document.getElementById('user-name').textContent = user.name;
        document.getElementById('user-role').textContent = getRoleText(user.role);
    }
}

// Load visits (pending security approval)
async function loadVisits(filters = {}) {
    showLoading();
    try {
        const queryParams = new URLSearchParams();
        if (filters.status) {
            queryParams.append('status', filters.status);
        } else {
            queryParams.append('status', 'pending_security');
        }
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

        const query = queryParams.toString();
        const endpoint = `/visits/security${query ? '?' + query : ''}`;

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

// Load present visitors
async function loadPresentVisitors() {
    try {
        const data = await apiCall('/passes/present');
        presentVisitors = data.visitors || [];
        renderPresentVisitors();
    } catch (error) {
        console.error('Error loading present visitors:', error);
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
                        <div class="empty-state-icon">✅</div>
                        <div class="empty-state-title">همه درخواست‌ها بررسی شده‌اند</div>
                        <div class="empty-state-text">درخواست جدیدی برای بررسی وجود ندارد</div>
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
            <td>${visit.host_name}</td>
            <td>${formatDate(visit.visit_date)}</td>
            <td>${visit.purpose.substring(0, 40)}${visit.purpose.length > 40 ? '...' : ''}</td>
            <td>
                ${visit.status === 'pending_security' ? `
                    <button class="btn btn-sm btn-success" onclick="openIssuePassModal(${visit.id})">
                        صدور مجوز
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

// Render present visitors
function renderPresentVisitors() {
    const tbody = document.getElementById('present-tbody');

    if (presentVisitors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">🏢</div>
                        <div class="empty-state-title">هیچ مهمانی در محل حضور ندارد</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = presentVisitors.map(visitor => `
        <tr>
            <td>${visitor.guest_name}</td>
            <td>${visitor.guest_phone || 'ندارد'}</td>
            <td>${visitor.host_name}</td>
            <td>${formatDateTime(visitor.checked_in_at)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="checkOut('${visitor.pass_code}')">
                    ثبت خروج
                </button>
            </td>
        </tr>
    `).join('');
}

// Update stats
function updateStats() {
    const pendingCount = visits.filter(v => v.status === 'pending_security').length;
    const presentCount = presentVisitors.length;

    document.getElementById('stat-pending').textContent = pendingCount;
    document.getElementById('stat-present').textContent = presentCount;
}

// Open issue pass modal
function openIssuePassModal(visitId) {
    document.getElementById('issue-visit-id').value = visitId;
    document.getElementById('valid-hours').value = '24';
    openModal('issue-pass-modal');
}

// Issue pass
async function handleIssuePass(event) {
    event.preventDefault();

    const visitId = document.getElementById('issue-visit-id').value;
    const validHours = document.getElementById('valid-hours').value;

    showLoading();
    try {
        const data = await apiCall('/passes', {
            method: 'POST',
            body: JSON.stringify({
                visitId: parseInt(visitId),
                validHours: parseInt(validHours)
            })
        });

        showAlert('مجوز با موفقیت صادر شد', 'success');
        closeModal('issue-pass-modal');

        // Show pass code
        showPassCode(data.pass.pass_code);

        await loadVisits();
    } catch (error) {
        showAlert(error.message || 'خطا در صدور مجوز', 'danger');
    } finally {
        hideLoading();
    }
}

// Show pass code
function showPassCode(passCode) {
    document.getElementById('display-pass-code').textContent = passCode;
    openModal('pass-code-modal');
}

// Check in
async function handleCheckIn(event) {
    event.preventDefault();

    const passCode = document.getElementById('checkin-pass-code').value.trim().toUpperCase();

    if (!passCode) {
        showAlert('لطفاً کد مجوز را وارد کنید', 'warning');
        return;
    }

    showLoading();
    try {
        const data = await apiCall('/passes/check-in', {
            method: 'POST',
            body: JSON.stringify({ passCode })
        });

        showAlert(`ورود ${data.visitor.name} با موفقیت ثبت شد`, 'success');
        document.getElementById('checkin-form').reset();

        await loadPresentVisitors();
        updateStats();
    } catch (error) {
        showAlert(error.message || 'خطا در ثبت ورود', 'danger');
    } finally {
        hideLoading();
    }
}

// Check out
async function checkOut(passCode) {
    const result = await Swal.fire({
        text: "آیا از ثبت خروج این مهمان اطمینان دارید؟",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ثبت خروج',
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
        const data = await apiCall('/passes/check-out', {
            method: 'POST',
            body: JSON.stringify({ passCode })
        });

        showAlert(`خروج ${data.visitor.name} با موفقیت ثبت شد`, 'success');

        await loadPresentVisitors();
        updateStats();

    } catch (error) {
        showAlert(error.message || 'خطا در ثبت خروج', 'danger');
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
        document.getElementById('detail-host').textContent = visit.host_name;
        document.getElementById('detail-date').textContent = formatDate(visit.visit_date);
        document.getElementById('detail-status').innerHTML = `<span class="status-pill status-${visit.status}">${getStatusText(visit.status)}</span>`;
        document.getElementById('detail-purpose').textContent = visit.purpose;

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
        showAlert('خطا در دریافت جزئیات', 'danger');
    } finally {
        hideLoading();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadDashboard();

    const issueForm = document.getElementById('issue-pass-form');
    if (issueForm) {
        issueForm.addEventListener('submit', handleIssuePass);
    }

    const checkinForm = document.getElementById('checkin-form');
    if (checkinForm) {
        checkinForm.addEventListener('submit', handleCheckIn);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Auto-refresh present visitors every 30 seconds
    setInterval(loadPresentVisitors, 30000);
});