const express = require('express');
const router = express.Router();
const {
    getUsers,
    changeUserRole,
    getReports
} = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require admin role
router.get('/users', authenticateToken, checkRole('admin'), getUsers);
router.patch('/users/:id/role', authenticateToken, checkRole('admin'), changeUserRole);
router.get('/reports', authenticateToken, checkRole('admin'), getReports);

module.exports = router;