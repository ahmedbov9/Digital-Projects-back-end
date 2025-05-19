const express = require('express');
const { sendEmailMessage } = require('../controllers/contactController');
const router = express.Router();

// @desc معالجة نموذج الاتصال
// @access Public
// @route POST /api/contact/send-message
// هذا هو مسار معالجة نموذج الاتصال
router.post('/send-email', sendEmailMessage);

module.exports = router;
