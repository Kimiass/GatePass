const pool = require('../config/database');

// User queries
const createUser = async (name, email, phone, passwordHash, role = 'guest') => {
    const query = `
        INSERT INTO users (name, email, phone, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, phone, role, created_at
    `;
    const result = await pool.query(query, [name, email, phone, passwordHash, role]);
    return result.rows[0];
};

const getUserByEmail = async (email) => {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
};

const getUserById = async (id) => {
    const query = 'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

const getAllUsers = async () => {
    const query = 'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
};

const updateUserRole = async (userId, newRole) => {
    const query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role';
    const result = await pool.query(query, [newRole, userId]);
    return result.rows[0];
};

const getHostUsers = async () => {
    const query = 'SELECT id, name, email FROM users WHERE role = $1 ORDER BY name';
    const result = await pool.query(query, ['host']);
    return result.rows;
};

// Visit queries
const createVisit = async (guestId, hostId, purpose, visitDate) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const visitQuery = `
            INSERT INTO visits (guest_id, host_id, purpose, visit_date, status)
            VALUES ($1, $2, $3, $4, 'pending_host')
                RETURNING *
        `;
        const visitResult = await client.query(visitQuery, [guestId, hostId, purpose, visitDate]);
        const visit = visitResult.rows[0];

        // Log status history
        const historyQuery = `
            INSERT INTO status_history (visit_id, old_status, new_status, changed_by)
            VALUES ($1, NULL, 'pending_host', $2)
        `;
        await client.query(historyQuery, [visit.id, guestId]);

        await client.query('COMMIT');
        return {
            visit,
            created_at: visit.created_at.toISOString(),
            updated_at: visit.updated_at.toISOString()
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getVisitsByGuest = async (guestId, filters = {}) => {
    let query = `
        SELECT v.*, h.name as host_name, h.email as host_email
        FROM visits v
                 LEFT JOIN users h ON v.host_id = h.id
        WHERE v.guest_id = $1
    `;
    const params = [guestId];
    let paramCount = 1;

    if (filters.hostId) {
        paramCount++;
        query += ` AND v.host_id = $${paramCount}`;
        params.push(filters.hostId);
    }

    if (filters.status) {
        paramCount++;
        query += ` AND v.status = $${paramCount}`;
        params.push(filters.status);
    }

    if (filters.dateFrom) {
        paramCount++;
        query += ` AND v.visit_date >= $${paramCount}`;
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        paramCount++;
        query += ` AND v.visit_date <= $${paramCount}`;
        params.push(filters.dateTo);
    }

    query += ' ORDER BY v.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
};

const getVisitsByHost = async (hostId, filters = {}) => {
    let query = `
        SELECT v.*, g.name as guest_name, g.email as guest_email, g.phone as guest_phone
        FROM visits v
                 LEFT JOIN users g ON v.guest_id = g.id
        WHERE v.host_id = $1
    `;
    const params = [hostId];
    let paramCount = 1;

    if (filters.status) {
        paramCount++;
        query += ` AND v.status = $${paramCount}`;
        params.push(filters.status);
    }

    if (filters.dateFrom) {
        paramCount++;
        query += ` AND v.visit_date >= $${paramCount}`;
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        paramCount++;
        query += ` AND v.visit_date <= $${paramCount}`;
        params.push(filters.dateTo);
    }

    query += ' ORDER BY v.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
};

const getVisitById = async (visitId) => {
    const query = `
        SELECT v.*,
               g.name as guest_name, g.email as guest_email, g.phone as guest_phone,
               h.name as host_name, h.email as host_email
        FROM visits v
                 LEFT JOIN users g ON v.guest_id = g.id
                 LEFT JOIN users h ON v.host_id = h.id
        WHERE v.id = $1
    `;
    const result = await pool.query(query, [visitId]);
    return result.rows[0];
};

const updateVisitStatus = async (visitId, newStatus, changedBy, rejectionReason = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get old status
        const oldStatusQuery = 'SELECT status FROM visits WHERE id = $1';
        const oldStatusResult = await client.query(oldStatusQuery, [visitId]);
        const oldStatus = oldStatusResult.rows[0]?.status;

        // Update visit
        const updateQuery = `
            UPDATE visits
            SET status = $1, rejection_reason = $2
            WHERE id = $3
                RETURNING *
        `;
        const updateResult = await client.query(updateQuery, [newStatus, rejectionReason, visitId]);

        // Log status history
        const historyQuery = `
            INSERT INTO status_history (visit_id, old_status, new_status, changed_by)
            VALUES ($1, $2, $3, $4)
        `;
        await client.query(historyQuery, [visitId, oldStatus, newStatus, changedBy]);

        await client.query('COMMIT');
        return updateResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getAllVisits = async (filters = {}) => {
    let query = `
        SELECT v.*,
               g.name as guest_name, g.email as guest_email,
               h.name as host_name, h.email as host_email
        FROM visits v
                 LEFT JOIN users g ON v.guest_id = g.id
                 LEFT JOIN users h ON v.host_id = h.id
        WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.status) {
        paramCount++;
        query += ` AND v.status = $${paramCount}`;
        params.push(filters.status);
    }

    if (filters.hostId) {
        paramCount++;
        query += ` AND v.host_id = $${paramCount}`;
        params.push(filters.hostId);
    }

    if (filters.dateFrom) {
        paramCount++;
        query += ` AND v.visit_date >= $${paramCount}`;
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        paramCount++;
        query += ` AND v.visit_date <= $${paramCount}`;
        params.push(filters.dateTo);
    }

    query += ' ORDER BY v.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
};

// Pass queries
const createPass = async (visitId, passCode, issuedBy, validFrom, validUntil) => {
    const query = `
        INSERT INTO passes (visit_id, pass_code, issued_by, valid_from, valid_until)
        VALUES ($1, $2, $3, $4, $5)
            RETURNING *
    `;
    const result = await pool.query(query, [visitId, passCode, issuedBy, validFrom, validUntil]);
    return result.rows[0];
};

const getPassByCode = async (passCode) => {
    const query = `
        SELECT p.*, v.guest_id, v.visit_date, v.purpose,
               g.name as guest_name, g.phone as guest_phone
        FROM passes p
                 JOIN visits v ON p.visit_id = v.id
                 JOIN users g ON v.guest_id = g.id
        WHERE p.pass_code = $1
    `;
    const result = await pool.query(query, [passCode]);
    return result.rows[0];
};

const getPassByVisitId = async (visitId) => {
    const query = 'SELECT * FROM passes WHERE visit_id = $1';
    const result = await pool.query(query, [visitId]);
    return result.rows[0];
};

const markPassAsUsed = async (passId) => {
    const query = 'UPDATE passes SET is_used = TRUE WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [passId]);
    return result.rows[0];
};

// Check log queries
const createCheckLog = async (passId, visitId, logType, loggedBy) => {
    const query = `
        INSERT INTO check_logs (pass_id, visit_id, log_type, logged_by)
        VALUES ($1, $2, $3, $4)
            RETURNING *
    `;
    const result = await pool.query(query, [passId, visitId, logType, loggedBy]);
    return result.rows[0];
};

const getCheckLogsByVisit = async (visitId) => {
    const query = `
        SELECT cl.*, u.name as logged_by_name
        FROM check_logs cl
                 LEFT JOIN users u ON cl.logged_by = u.id
        WHERE cl.visit_id = $1
        ORDER BY cl.logged_at DESC
    `;
    const result = await pool.query(query, [visitId]);
    return result.rows;
};

const getPresentVisitors = async () => {
    const query = `
        SELECT DISTINCT ON (v.id)
            v.id, v.purpose, v.visit_date,
            g.name as guest_name, g.phone as guest_phone,
            h.name as host_name,
            p.pass_code,
            ci.logged_at as checked_in_at
        FROM visits v
            JOIN users g ON v.guest_id = g.id
            JOIN users h ON v.host_id = h.id
            JOIN passes p ON p.visit_id = v.id
            JOIN check_logs ci ON ci.visit_id = v.id AND ci.log_type = 'check_in'
            LEFT JOIN check_logs co ON co.visit_id = v.id AND co.log_type = 'check_out' AND co.logged_at > ci.logged_at
        WHERE co.id IS NULL
        ORDER BY v.id, ci.logged_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

// Status history queries
const getStatusHistory = async (visitId) => {
    const query = `
        SELECT sh.*, u.name as changed_by_name
        FROM status_history sh
                 LEFT JOIN users u ON sh.changed_by = u.id
        WHERE sh.visit_id = $1
        ORDER BY sh.changed_at ASC
    `;
    const result = await pool.query(query, [visitId]);
    return result.rows;
};

// Report queries
const getVisitStatistics = async (dateFrom, dateTo) => {
    const query = `
        SELECT
            COUNT(*) as total_visits,
            COUNT(CASE WHEN status = 'pending_host' THEN 1 END) as pending_host,
            COUNT(CASE WHEN status = 'pending_security' THEN 1 END) as pending_security,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'rejected_by_host' THEN 1 END) as rejected,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM visits
        WHERE visit_date BETWEEN $1 AND $2
    `;
    const result = await pool.query(query, [dateFrom, dateTo]);
    return result.rows[0];
};

const getDailyVisitStats = async (days = 7) => {
    const query = `
        SELECT
            DATE(visit_date) as date,
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status IN ('approved', 'completed') THEN 1 END) as approved_requests
        FROM visits
        WHERE visit_date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(visit_date)
        ORDER BY date DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    getAllUsers,
    updateUserRole,
    getHostUsers,
    createVisit,
    getVisitsByGuest,
    getVisitsByHost,
    getVisitById,
    updateVisitStatus,
    getAllVisits,
    createPass,
    getPassByCode,
    getPassByVisitId,
    markPassAsUsed,
    createCheckLog,
    getCheckLogsByVisit,
    getPresentVisitors,
    getStatusHistory,
    getVisitStatistics,
    getDailyVisitStats
};