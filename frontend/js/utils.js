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

// ============================================
// Jalali (Persian/Shamsi) Date Functions
// ============================================

function div(a, b) {
    return Math.floor(a / b);
}

function mod(a, b) {
    return a - div(a, b) * b;
}

// Convert Gregorian to Jalali
function gregorianToJalali(gy, gm, gd) {
    let jy, jm, jd;
    let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

    if (gy > 1600) {
        jy = 979;
        gy -= 1600;
    } else {
        jy = 0;
        gy -= 621;
    }

    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + (div(gy2 + 3, 4)) - (div(gy2 + 99, 100)) + (div(gy2 + 399, 400)) - 80 + gd + g_d_m[gm - 1];

    jy += 33 * div(days, 12053);
    days = mod(days, 12053);
    jy += 4 * div(days, 1461);
    days = mod(days, 1461);

    if (days > 365) {
        jy += div(days - 1, 365);
        days = mod(days - 1, 365);
    }

    if (days < 186) {
        jm = 1 + div(days, 31);
        jd = 1 + mod(days, 31);
    } else {
        jm = 7 + div(days - 186, 30);
        jd = 1 + mod(days - 186, 30);
    }

    return { year: jy, month: jm, day: jd };
}

// Convert Jalali to Gregorian
function jalaliToGregorian(jy, jm, jd) {
    let gy, gm, gd_result;

    if (jy > 979) {
        gy = 1600;
        jy -= 979;
    } else {
        gy = 621;
    }

    let days = (365 * jy) + (div(jy, 33) * 8) + div((mod(jy, 33) + 3), 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);

    gy += 400 * div(days, 146097);
    days = mod(days, 146097);

    if (days > 36524) {
        gy += 100 * div(days - 1, 36524);
        days = mod(days - 1, 36524);
        if (days >= 365) days++;
    }

    gy += 4 * div(days, 1461);
    days = mod(days, 1461);

    if (days > 365) {
        gy += div(days - 1, 365);
        days = mod(days - 1, 365);
    }

    let sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    for (gm = 0; gm < 13; gm++) {
        let v = sal_a[gm];
        if (days < v) break;
        days -= v;
    }

    gd_result = days + 1;
    return { year: gy, month: gm, day: gd_result };
}

// Format date to Persian (from Date object or string)
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const gYear = date.getFullYear();
    const gMonth = date.getMonth() + 1;
    const gDay = date.getDate();
    const jalali = gregorianToJalali(gYear, gMonth, gDay);

    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return `${jalali.day} ${monthNames[jalali.month - 1]} ${jalali.year}`;
}

// Format datetime to Persian (browser local time)
function formatDateTime(dateString) {
    if (!dateString) return '';
    let date;
    if (dateString.includes('T') && !dateString.endsWith('Z')) {
        date = new Date(dateString + 'Z');
    } else {
        date = new Date(dateString);
    }

    const gYear = date.getFullYear();
    const gMonth = date.getMonth() + 1;
    const gDay = date.getDate();
    const jalali = gregorianToJalali(gYear, gMonth, gDay);

    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${jalali.day} ${monthNames[jalali.month - 1]} ${jalali.year} - ${hours}:${minutes}`;
}

// Convert UTC datetime to Iran local time and format to Persian
function formatDateTimeIran(dateString) {
    if (!dateString) return '';

    let utcDate;
    if (dateString.includes('T')) {
        if (dateString.endsWith('Z')) {
            utcDate = new Date(dateString);
        } else {
            utcDate = new Date(dateString + 'Z');
        }
    } else {
        utcDate = new Date(dateString);
    }

    const iranOffset = 210;
    const iranTime = new Date(utcDate.getTime() + (iranOffset * 60 * 1000));

    const gYear = iranTime.getUTCFullYear();
    const gMonth = iranTime.getUTCMonth() + 1;
    const gDay = iranTime.getUTCDate();
    const jalali = gregorianToJalali(gYear, gMonth, gDay);

    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const hours = String(iranTime.getUTCHours()).padStart(2, '0');
    const minutes = String(iranTime.getUTCMinutes()).padStart(2, '0');

    return `${jalali.day} ${monthNames[jalali.month - 1]} ${jalali.year} - ${hours}:${minutes}`;
}

// Get today's date in Jalali format for display
function getTodayJalali() {
    const today = new Date();
    const gYear = today.getFullYear();
    const gMonth = today.getMonth() + 1;
    const gDay = today.getDate();

    return gregorianToJalali(gYear, gMonth, gDay);
}

// Get today's date in YYYY-MM-DD format (Gregorian - for input fields)
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Convert Jalali date string (YYYY/MM/DD) to Gregorian (YYYY-MM-DD)
function jalaliStringToGregorian(jalaliString) {
    const parts = jalaliString.split(/[-\/]/);
    const jYear = parseInt(parts[0]);
    const jMonth = parseInt(parts[1]);
    const jDay = parseInt(parts[2]);

    const gregorian = jalaliToGregorian(jYear, jMonth, jDay);

    return `${gregorian.year}-${String(gregorian.month).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}`;
}

// Convert Gregorian date string (YYYY-MM-DD) to Jalali string (YYYY/MM/DD)
function gregorianStringToJalali(gregorianString) {
    const parts = gregorianString.split('-');
    const gYear = parseInt(parts[0]);
    const gMonth = parseInt(parts[1]);
    const gDay = parseInt(parts[2]);

    const jalali = gregorianToJalali(gYear, gMonth, gDay);

    return `${jalali.year}/${String(jalali.month).padStart(2, '0')}/${String(jalali.day).padStart(2, '0')}`;
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

// Initialize Persian date pickers
function initPersianDatePickers() {
    const dateInputs = document.querySelectorAll('input[type="date"]');

    dateInputs.forEach(input => {
        // Add a wrapper for custom Persian date picker
        const wrapper = document.createElement('div');
        wrapper.className = 'persian-date-wrapper';
        wrapper.style.position = 'relative';

        // Create display input (Persian)
        const displayInput = document.createElement('input');
        displayInput.type = 'text';
        displayInput.className = input.className;
        displayInput.placeholder = 'مثال: 1404/11/20';
        displayInput.style.direction = 'ltr';
        displayInput.style.textAlign = 'right';

        // Keep the original input hidden
        input.type = 'hidden';

        // Insert wrapper
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(displayInput);
        wrapper.appendChild(input);

        // Set initial value if exists
        if (input.value) {
            displayInput.value = gregorianStringToJalali(input.value);
        }

        // Update hidden input when display input changes
        displayInput.addEventListener('change', function () {
            try {
                const gregorian = jalaliStringToGregorian(this.value);
                input.value = gregorian;
            } catch (e) {
                console.error('Invalid date format');
            }
        });

        // Simple validation
        displayInput.addEventListener('blur', function () {
            const value = this.value.trim();
            if (value && !/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(value)) {
                showAlert('فرمت تاریخ باید به صورت 1404/11/20 باشد', 'warning');
                this.value = '';
                input.value = '';
            }
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    initModals();
});