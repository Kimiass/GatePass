const bcrypt = require('bcrypt');
const { createUser, getUserByEmail, getUserById } = require('../models/queries');
const { generateToken } = require('../utils/tokenUtils');

const register = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'نام، ایمیل و رمز عبور الزامی است' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'رمز عبور باید حداقل 6 کاراکتر باشد' });
        }

        // Check if user exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user (default role is guest unless specified)
        const userRole = role && ['guest', 'host', 'security', 'admin'].includes(role) ? role : 'guest';
        const user = await createUser(name, email, phone, passwordHash, userRole);

        // Generate token
        const token = generateToken(user.id, user.role);

        res.status(201).json({
            message: 'ثبت نام با موفقیت انجام شد',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'خطا در ثبت نام' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی است' });
        }

        // Find user
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
        }

        // Generate token
        const token = generateToken(user.id, user.role);

        // Set cookie (optional, for better security)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            message: 'ورود موفقیت‌آمیز',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'خطا در ورود به سیستم' });
    }
};

const logout = async (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'خروج موفقیت‌آمیز' });
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await getUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser
};