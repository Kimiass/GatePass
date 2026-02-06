const {
    createVisit,
    getVisitsByGuest,
    getVisitsByHost,
    getVisitById,
    updateVisitStatus,
    getAllVisits,
    getHostUsers,
    getStatusHistory
} = require('../models/queries');

const createVisitRequest = async (req, res) => {
    try {
        const { hostId, purpose, visitDate } = req.body;
        const guestId = req.user.userId;

        // Validation
        if (!hostId || !purpose || !visitDate) {
            return res.status(400).json({ error: 'تمام فیلدها الزامی است' });
        }

        // Validate date is not in the past
        const requestedDate = new Date(visitDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (requestedDate < today) {
            return res.status(400).json({ error: 'تاریخ درخواست نمی‌تواند در گذشته باشد' });
        }

        const visit = await createVisit(guestId, hostId, purpose, visitDate);

        res.status(201).json({
            message: 'درخواست شما با موفقیت ثبت شد',
            visit
        });
    } catch (error) {
        console.error('Create visit error:', error);
        res.status(500).json({ error: 'خطا در ثبت درخواست' });
    }
};

const getMyVisits = async (req, res) => {
    try {
        const guestId = req.user.userId;
        const { status, dateFrom, dateTo } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const visits = await getVisitsByGuest(guestId, filters);

        res.json({ visits });
    } catch (error) {
        console.error('Get my visits error:', error);
        res.status(500).json({ error: 'خطا در دریافت درخواست‌ها' });
    }
};

const getHostVisits = async (req, res) => {
    try {
        const hostId = req.user.userId;
        const { status, dateFrom, dateTo } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const visits = await getVisitsByHost(hostId, filters);

        res.json({ visits });
    } catch (error) {
        console.error('Get host visits error:', error);
        res.status(500).json({ error: 'خطا در دریافت درخواست‌ها' });
    }
};

const getVisitDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const visit = await getVisitById(id);

        if (!visit) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }

        // Check access rights
        const userRole = req.user.role;
        const userId = req.user.userId;

        if (userRole === 'guest' && visit.guest_id !== userId) {
            return res.status(403).json({ error: 'شما به این درخواست دسترسی ندارید' });
        }

        if (userRole === 'host' && visit.host_id !== userId) {
            return res.status(403).json({ error: 'شما به این درخواست دسترسی ندارید' });
        }

        // Get status history (bonus feature)
        const history = await getStatusHistory(id);

        res.json({
            visit,
            history
        });
    } catch (error) {
        console.error('Get visit details error:', error);
        res.status(500).json({ error: 'خطا در دریافت جزئیات درخواست' });
    }
};

const approveVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const hostId = req.user.userId;

        const visit = await getVisitById(id);

        if (!visit) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }

        if (visit.host_id !== hostId) {
            return res.status(403).json({ error: 'شما مجاز به تأیید این درخواست نیستید' });
        }

        if (visit.status !== 'pending_host') {
            return res.status(400).json({ error: 'این درخواست قبلاً پردازش شده است' });
        }

        const updatedVisit = await updateVisitStatus(id, 'pending_security', hostId);

        res.json({
            message: 'درخواست تأیید شد و به حراست ارسال گردید',
            visit: updatedVisit
        });
    } catch (error) {
        console.error('Approve visit error:', error);
        res.status(500).json({ error: 'خطا در تأیید درخواست' });
    }
};

const rejectVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const hostId = req.user.userId;

        if (!rejectionReason) {
            return res.status(400).json({ error: 'دلیل رد درخواست الزامی است' });
        }

        const visit = await getVisitById(id);

        if (!visit) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }

        if (visit.host_id !== hostId) {
            return res.status(403).json({ error: 'شما مجاز به رد این درخواست نیستید' });
        }

        if (visit.status !== 'pending_host') {
            return res.status(400).json({ error: 'این درخواست قبلاً پردازش شده است' });
        }

        const updatedVisit = await updateVisitStatus(id, 'rejected_by_host', hostId, rejectionReason);

        res.json({
            message: 'درخواست رد شد',
            visit: updatedVisit
        });
    } catch (error) {
        console.error('Reject visit error:', error);
        res.status(500).json({ error: 'خطا در رد درخواست' });
    }
};

const getAllVisitsForSecurity = async (req, res) => {
    try {
        const { status, hostId, dateFrom, dateTo } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (hostId) filters.hostId = hostId;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        // Security can only see pending_security and approved visits
        if (!status) {
            filters.status = 'pending_security';
        }

        const visits = await getAllVisits(filters);

        res.json({ visits });
    } catch (error) {
        console.error('Get all visits error:', error);
        res.status(500).json({ error: 'خطا در دریافت درخواست‌ها' });
    }
};

const getAvailableHosts = async (req, res) => {
    try {
        const hosts = await getHostUsers();
        res.json({ hosts });
    } catch (error) {
        console.error('Get hosts error:', error);
        res.status(500).json({ error: 'خطا در دریافت لیست میزبان‌ها' });
    }
};

module.exports = {
    createVisitRequest,
    getMyVisits,
    getHostVisits,
    getVisitDetails,
    approveVisit,
    rejectVisit,
    getAllVisitsForSecurity,
    getAvailableHosts
};