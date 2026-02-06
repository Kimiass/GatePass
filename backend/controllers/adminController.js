const {
    getAllUsers,
    updateUserRole,
    getAllVisits,
    getVisitStatistics,
    getDailyVisitStats
} = require('../models/queries');

const getUsers = async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'خطا در دریافت کاربران' });
    }
};

const changeUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !['guest', 'host', 'security', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'نقش معتبر نیست' });
        }

        const user = await updateUserRole(id, role);

        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({
            message: 'نقش کاربر با موفقیت تغییر یافت',
            user
        });
    } catch (error) {
        console.error('Change role error:', error);
        res.status(500).json({ error: 'خطا در تغییر نقش کاربر' });
    }
};

const getReports = async (req, res) => {
    try {
        const { dateFrom, dateTo, type } = req.query;

        let report = {};

        // Get all visits with filters
        const filters = {};
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const visits = await getAllVisits(filters);

        // Get statistics
        const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to = dateTo || new Date().toISOString().split('T')[0];
        const statistics = await getVisitStatistics(from, to);

        // Get daily stats
        const dailyStats = await getDailyVisitStats(30);

        report = {
            summary: statistics,
            daily_stats: dailyStats,
            recent_visits: visits.slice(0, 50), // Last 50 visits
            total_visits: visits.length
        };

        res.json({ report });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'خطا در دریافت گزارش‌ها' });
    }
};

module.exports = {
    getUsers,
    changeUserRole,
    getReports
};