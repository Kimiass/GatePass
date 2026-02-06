const express = require('express');
const router = express.Router();
const {
    issuePass,
    checkInVisitor,
    checkOutVisitor,
    getPresentVisitorsList,
    getPassInfo
} = require('../controllers/passesController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Security only routes
router.post('/', authenticateToken, checkRole('security', 'admin'), issuePass);
router.post('/check-in', authenticateToken, checkRole('security', 'admin'), checkInVisitor);
router.post('/check-out', authenticateToken, checkRole('security', 'admin'), checkOutVisitor);
router.get('/present', authenticateToken, checkRole('security', 'admin'), getPresentVisitorsList);
router.get('/:passCode', authenticateToken, checkRole('security', 'admin'), getPassInfo);

module.exports = router;