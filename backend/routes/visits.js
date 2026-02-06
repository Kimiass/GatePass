const express = require('express');
const router = express.Router();
const {
    createVisitRequest,
    getMyVisits,
    getHostVisits,
    getVisitDetails,
    approveVisit,
    rejectVisit,
    getAllVisitsForSecurity,
    getAvailableHosts
} = require('../controllers/visitsController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Guest routes
router.post('/', authenticateToken, checkRole('guest'), createVisitRequest);
router.get('/me', authenticateToken, checkRole('guest'), getMyVisits);
router.get('/hosts', authenticateToken, getAvailableHosts);

// Host routes
router.get('/host', authenticateToken, checkRole('host'), getHostVisits);
router.patch('/:id/approve', authenticateToken, checkRole('host'), approveVisit);
router.patch('/:id/reject', authenticateToken, checkRole('host'), rejectVisit);

// Security routes
router.get('/security', authenticateToken, checkRole('security', 'admin'), getAllVisitsForSecurity);

// Common routes
router.get('/:id', authenticateToken, getVisitDetails);

module.exports = router;