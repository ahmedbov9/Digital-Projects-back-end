const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { verifyTokenAndAdmin } = require('../middlewares/verifytoken');
const router = express.Router();

// @ desc Get dashboard stats
// @ access Private
// @ route GET /api/dashboard/dashboard-stats
router.get('/dashboard-stats', verifyTokenAndAdmin, getDashboardStats);

module.exports = router;
