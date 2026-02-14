// Admin Dashboard Functionality

let users = [];
let reportData = null;

// Load dashboard
async function loadDashboard() {
    if (!requireAuth() || !hasRole('admin')) {
        window.location.href = '../index.html';
        return;
    }

    updateUserInfo();
    await loadUsers();
    await loadReports();
}

// Update user info
function updateUserInfo() {
    const user = getUserInfo();
    if (user) {
        document.getElementById('user-name').textContent = user.name;
        document.getElementById('user-role').textContent = getRoleText(user.role);
    }
}

// Load all users
async function loadUsers() {
    showLoading();
    try {
        const data = await apiCall('/admin/users');
        users = data.users;
        renderUsers();
    } catch (error) {
        showAlert('خطا در دریافت کاربران', 'danger');
    } finally {
        hideLoading();
    }
}

// Render users table
function renderUsers() {
    const tbody = document.getElementById('users-tbody');

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">هیچ کاربری یافت نشد</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'ندارد'}</td>
            <td><span class="badge badge-${user.role === 'admin' ? 'approved' : 'pending'}">${getRoleText(user.role)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="openChangeRoleModal(${user.id}, '${user.role}', '${user.name}')">
                    تغییر نقش
                </button>
            </td>
        </tr>
    `).join('');
}

// Open change role modal
function openChangeRoleModal(userId, currentRole, userName) {
    document.getElementById('change-user-id').value = userId;
    document.getElementById('change-user-name').textContent = userName;
    document.getElementById('new-role').value = currentRole;
    openModal('change-role-modal');
}

// Change user role
async function handleChangeRole(event) {
    event.preventDefault();

    const userId = document.getElementById('change-user-id').value;
    const newRole = document.getElementById('new-role').value;

    showLoading();
    try {
        await apiCall(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole })
        });

        showAlert('نقش کاربر با موفقیت تغییر یافت', 'success');
        closeModal('change-role-modal');
        await loadUsers();
    } catch (error) {
        showAlert(error.message || 'خطا در تغییر نقش', 'danger');
    } finally {
        hideLoading();
    }
}

// Load reports
async function loadReports(dateFrom = null, dateTo = null) {
    showLoading();
    try {
        const queryParams = new URLSearchParams();
        if (dateFrom) queryParams.append('dateFrom', dateFrom);
        if (dateTo) queryParams.append('dateTo', dateTo);

        const query = queryParams.toString();
        const endpoint = `/admin/reports${query ? '?' + query : ''}`;

        const data = await apiCall(endpoint);
        reportData = data.report;

        renderReports();
    } catch (error) {
        showAlert('خطا در دریافت گزارش‌ها', 'danger');
    } finally {
        hideLoading();
    }
}

// Render reports
function renderReports() {
    if (!reportData) return;

    const summary = reportData.summary;

    document.getElementById('stat-total-visits').textContent = summary.total_visits || 0;

    const pendingHost = parseInt(summary.pending_host) || 0;
    const pendingSecurity = parseInt(summary.pending_security) || 0;
    document.getElementById('stat-pending').textContent = pendingHost + pendingSecurity;
    document.getElementById('stat-approved').textContent = summary.approved || 0;
    document.getElementById('stat-rejected').textContent = summary.rejected_by_host || 0;
    document.getElementById('stat-completed').textContent = summary.completed || 0;
    const dailyStatsDiv = document.getElementById('daily-stats');
    if (reportData.daily_stats && reportData.daily_stats.length > 0) {
        dailyStatsDiv.innerHTML = `
            <h4 class="mb-2">آمار روزانه (${reportData.daily_stats.length} روز اخیر)</h4>
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>تاریخ</th>
                            <th>کل درخواست‌ها</th>
                            <th>تأیید شده</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.daily_stats.map(stat => `
                            <tr>
                                <td>${formatDate(stat.date)}</td>
                                <td>${stat.total_requests}</td>
                                <td>${stat.approved_requests}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Render recent visits
    const recentVisitsDiv = document.getElementById('recent-visits');
    if (reportData.recent_visits && reportData.recent_visits.length > 0) {
        recentVisitsDiv.innerHTML = `
            <h4 class="mb-2">آخرین درخواست‌ها</h4>
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>شناسه</th>
                            <th>مهمان</th>
                            <th>میزبان</th>
                            <th>تاریخ ورود</th>
                            <th>وضعیت</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.recent_visits.slice(0, 20).map(visit => `
                            <tr>
                                <td>${visit.id}</td>
                                <td>${visit.guest_name}</td>
                                <td>${visit.host_name}</td>
                                <td>${formatDate(visit.visit_date)}</td>
                                <td><span class="status-pill status-${visit.status}">${getStatusText(visit.status)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// Apply report filters
function applyReportFilters() {
    const dateFrom = document.getElementById('report-date-from').value;
    const dateTo = document.getElementById('report-date-to').value;

    loadReports(dateFrom, dateTo);
}

// Clear report filters
function clearReportFilters() {
    document.getElementById('report-date-from').value = '';
    document.getElementById('report-date-to').value = '';
    loadReports();
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadDashboard();

    const changeRoleForm = document.getElementById('change-role-form');
    if (changeRoleForm) {
        changeRoleForm.addEventListener('submit', handleChangeRole);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});