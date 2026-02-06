// Login functionality
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');

    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.add('d-none');

    // Validation
    if (!email || !password) {
        errorDiv.textContent = 'لطفاً تمام فیلدها را پر کنید';
        errorDiv.classList.remove('d-none');
        return;
    }

    showLoading();

    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Save token and user info
        setToken(data.token);
        setUserInfo(data.user);

        // Redirect based on role
        redirectToDashboard(data.user.role);
    } catch (error) {
        errorDiv.textContent = error.message || 'خطا در ورود به سیستم';
        errorDiv.classList.remove('d-none');
    } finally {
        hideLoading();
    }
}

// Register functionality
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('error-message');

    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.add('d-none');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        errorDiv.textContent = 'لطفاً تمام فیلدها را پر کنید';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (!validateEmail(email)) {
        errorDiv.textContent = 'فرمت ایمیل صحیح نیست';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (phone && !validatePhone(phone)) {
        errorDiv.textContent = 'شماره موبایل باید با 09 شروع شود و 11 رقم باشد';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (password.length < 6) {
        errorDiv.textContent = 'رمز عبور باید حداقل 6 کاراکتر باشد';
        errorDiv.classList.remove('d-none');
        return;
    }

    if (password !== confirmPassword) {
        errorDiv.textContent = 'رمز عبور و تکرار آن مطابقت ندارند';
        errorDiv.classList.remove('d-none');
        return;
    }

    showLoading();

    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, phone, password, role: 'guest' })
        });

        // Save token and user info
        setToken(data.token);
        setUserInfo(data.user);

        // Show success message and redirect
        showAlert('ثبت نام با موفقیت انجام شد', 'success');
        setTimeout(() => {
            redirectToDashboard(data.user.role);
        }, 1000);
    } catch (error) {
        errorDiv.textContent = error.message || 'خطا در ثبت نام';
        errorDiv.classList.remove('d-none');
    } finally {
        hideLoading();
    }
}

// Check if already logged in
function checkAuthStatus() {
    if (isAuthenticated()) {
        const user = getUserInfo();
        if (user) {
            redirectToDashboard(user.role);
        }
    }
}

// Initialize auth pages
document.addEventListener('DOMContentLoaded', function () {
    // Check if already logged in
    checkAuthStatus();

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});