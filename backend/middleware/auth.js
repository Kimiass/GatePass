const { verifyToken } = require('../utils/tokenUtils');

const authenticateToken = (req, res, next) => {
    // Check for token in Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'دسترسی غیرمجاز - توکن یافت نشد' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(403).json({ error: 'توکن نامعتبر یا منقضی شده است' });
    }

    req.user = decoded;
    next();
};

module.exports = { authenticateToken };