const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'احراز هویت نشده‌اید' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'شما دسترسی به این بخش را ندارید',
                requiredRoles: allowedRoles,
                yourRole: req.user.role
            });
        }

        next();
    };
};

module.exports = { checkRole };