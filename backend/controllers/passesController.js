const crypto = require('crypto');
const {
    createPass,
    getPassByCode,
    getPassByVisitId,
    markPassAsUsed,
    createCheckLog,
    getCheckLogsByVisit,
    getPresentVisitors,
    getVisitById,
    updateVisitStatus
} = require('../models/queries');

// Generate random pass code
const generatePassCode = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

const issuePass = async (req, res) => {
    try {
        const { visitId, validHours } = req.body;
        const issuedBy = req.user.userId;

        // Validation
        if (!visitId) {
            return res.status(400).json({ error: 'شناسه درخواست الزامی است' });
        }

        const visit = await getVisitById(visitId);

        if (!visit) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }

        if (visit.status !== 'pending_security') {
            return res.status(400).json({ error: 'این درخواست قابل صدور مجوز نیست' });
        }

        // Check if pass already exists
        const existingPass = await getPassByVisitId(visitId);
        if (existingPass) {
            return res.status(400).json({ error: 'برای این درخواست قبلاً مجوز صادر شده است' });
        }

        // Generate unique pass code
        let passCode;
        let isUnique = false;
        while (!isUnique) {
            passCode = generatePassCode();
            const existing = await getPassByCode(passCode);
            if (!existing) isUnique = true;
        }

        // Set validity period
        const validFrom = new Date(visit.visit_date);
        validFrom.setHours(0, 0, 0, 0);

        const validUntil = new Date(visit.visit_date);
        validUntil.setHours(23, 59, 59, 999);

        // If validHours specified, use it
        if (validHours && validHours > 0) {
            const now = new Date();
            validFrom.setTime(now.getTime());
            validUntil.setTime(now.getTime() + (validHours * 60 * 60 * 1000));
        }

        // Create pass
        const pass = await createPass(visitId, passCode, issuedBy, validFrom, validUntil);

        // Update visit status to approved
        await updateVisitStatus(visitId, 'approved', issuedBy);

        res.status(201).json({
            message: 'مجوز با موفقیت صادر شد',
            pass: {
                id: pass.id,
                pass_code: pass.pass_code,
                valid_from: pass.valid_from,
                valid_until: pass.valid_until,
                visit_id: pass.visit_id
            }
        });
    } catch (error) {
        console.error('Issue pass error:', error);
        res.status(500).json({ error: 'خطا در صدور مجوز' });
    }
};

const checkInVisitor = async (req, res) => {
    try {
        const { passCode } = req.body;
        const loggedBy = req.user.userId;

        if (!passCode) {
            return res.status(400).json({ error: 'کد مجوز الزامی است' });
        }

        const pass = await getPassByCode(passCode);

        if (!pass) {
            return res.status(404).json({ error: 'مجوز یافت نشد' });
        }

        // Check if pass is already used
        if (pass.is_used) {
            return res.status(400).json({ error: 'این مجوز قبلاً استفاده شده است' });
        }

        // Check validity period
        const now = new Date();
        const validFrom = new Date(pass.valid_from);
        const validUntil = new Date(pass.valid_until);

        if (now < validFrom) {
            return res.status(400).json({ error: 'این مجوز هنوز معتبر نیست' });
        }

        if (now > validUntil) {
            return res.status(400).json({ error: 'این مجوز منقضی شده است' });
        }

        // Check if already checked in
        const logs = await getCheckLogsByVisit(pass.visit_id);
        const lastLog = logs[0];

        if (lastLog && lastLog.log_type === 'check_in') {
            return res.status(400).json({ error: 'این مهمان قبلاً وارد شده است' });
        }

        // Create check-in log
        const checkLog = await createCheckLog(pass.id, pass.visit_id, 'check_in', loggedBy);

        // Mark pass as used
        await markPassAsUsed(pass.id);

        res.json({
            message: 'ورود با موفقیت ثبت شد',
            visitor: {
                name: pass.guest_name,
                phone: pass.guest_phone,
                purpose: pass.purpose,
                checked_in_at: checkLog.logged_at
            }
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'خطا در ثبت ورود' });
    }
};

const checkOutVisitor = async (req, res) => {
    try {
        const { passCode } = req.body;
        const loggedBy = req.user.userId;

        if (!passCode) {
            return res.status(400).json({ error: 'کد مجوز الزامی است' });
        }

        const pass = await getPassByCode(passCode);

        if (!pass) {
            return res.status(404).json({ error: 'مجوز یافت نشد' });
        }

        // Check if checked in
        const logs = await getCheckLogsByVisit(pass.visit_id);
        const lastLog = logs[0];

        if (!lastLog || lastLog.log_type !== 'check_in') {
            return res.status(400).json({ error: 'این مهمان هنوز وارد نشده است' });
        }

        // Create check-out log
        const checkLog = await createCheckLog(pass.id, pass.visit_id, 'check_out', loggedBy);

        // Update visit status to completed
        await updateVisitStatus(pass.visit_id, 'completed', loggedBy);

        res.json({
            message: 'خروج با موفقیت ثبت شد',
            visitor: {
                name: pass.guest_name,
                checked_in_at: lastLog.logged_at,
                checked_out_at: checkLog.logged_at
            }
        });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ error: 'خطا در ثبت خروج' });
    }
};

const getPresentVisitorsList = async (req, res) => {
    try {
        const visitors = await getPresentVisitors();

        res.json({
            count: visitors.length,
            visitors
        });
    } catch (error) {
        console.error('Get present visitors error:', error);
        res.status(500).json({ error: 'خطا در دریافت لیست افراد حاضر' });
    }
};

const getPassInfo = async (req, res) => {
    try {
        const { passCode } = req.params;

        const pass = await getPassByCode(passCode);

        if (!pass) {
            return res.status(404).json({ error: 'مجوز یافت نشد' });
        }

        const logs = await getCheckLogsByVisit(pass.visit_id);

        res.json({
            pass: {
                code: pass.pass_code,
                valid_from: pass.valid_from,
                valid_until: pass.valid_until,
                is_used: pass.is_used,
                guest_name: pass.guest_name,
                guest_phone: pass.guest_phone,
                purpose: pass.purpose,
                visit_date: pass.visit_date
            },
            logs
        });
    } catch (error) {
        console.error('Get pass info error:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات مجوز' });
    }
};

module.exports = {
    issuePass,
    checkInVisitor,
    checkOutVisitor,
    getPresentVisitorsList,
    getPassInfo
};