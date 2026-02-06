// API Base URL
const API_URL = 'http://localhost:3000/api';

// Helper function to get token
function getToken() {
    return localStorage.getItem('token');
}

// Helper function to set token
function setToken(token) {
    localStorage.setItem('token', token);
}

// Helper function to remove token
function removeToken() {
    localStorage.removeItem('token');
}

// Helper function to get user info
function getUserInfo() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Helper function to set user info
function setUserInfo(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Helper function to remove user info
function removeUserInfo() {
    localStorage.removeItem('user');
}

// API call helper with authentication
async function apiCall(endpoint, options = {}) {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'خطایی رخ داده است');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Check user role
function hasRole(...roles) {
    const user = getUserInfo();
    return user && roles.includes(user.role);
}

// Redirect based on role
function redirectToDashboard(role) {
    const dashboards = {
        'guest': '/pages/guest-dashboard.html',
        'host': '/pages/host-dashboard.html',
        'security': '/pages/security-dashboard.html',
        'admin': '/pages/admin-dashboard.html'
    };

    window.location.href = dashboards[role] || '/login.html';
}

// Logout function
function logout() {
    Swal.fire({
        text: "آیا می‌خواهید از حساب خود خارج شوید؟",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'خروج',
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

    }).then((result) => {
        if (result.isConfirmed) {
            removeToken();
            removeUserInfo();
            window.location.href = '../index.html';
        }
    });
}


// Show alert message
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Show loading spinner
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}

// Hide loading spinner
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Format date to Persian
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat('fa-IR', options).format(date);
}

// Format datetime to Persian
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Intl.DateTimeFormat('fa-IR', options).format(date);
}

// Format status text
function getStatusText(status) {
    const statusMap = {
        'pending_host': 'در انتظار بررسی میزبان',
        'pending_security': 'در انتظار بررسی حراست',
        'approved': 'تأیید شده',
        'rejected_by_host': 'رد شده توسط میزبان',
        'completed': 'تکمیل شده',
        'cancelled': 'لغو شده'
    };
    return statusMap[status] || status;
}

// Format role text
function getRoleText(role) {
    const roleMap = {
        'guest': 'مهمان',
        'host': 'میزبان',
        'security': 'حراست',
        'admin': 'مدیر سیستم'
    };
    return roleMap[role] || role;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone number (Iranian format)
function validatePhone(phone) {
    const re = /^09\d{9}$/;
    return re.test(phone);
}

// Modal helper functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize modal close buttons
function initModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    initModals();
});