const express = require('express');
const router = express.Router();

const {
  verifyOtpAndRegister,
  registerStepOne,
  resendOtp,
} = require('../controllers/registerController');
const { login } = require('../controllers/loginController');
const { getCurrentUser } = require('../controllers/userController');
const {
  forgetPassword,
  resetPassword,
} = require('../controllers/authController');
const { otpLimiter } = require('../middlewares/rateLimiter');

// @desc Register new user
// @access Public
// @route POST /api/auth/register-step-one
router.post('/register-step-one', otpLimiter, registerStepOne);
// @desc Verify OTP and register user
// @access Public
// @route POST /api/auth/verify-and-register

router.post('/verify-and-register', verifyOtpAndRegister);
// @desc Login user
// @access Public
// @route POST /api/auth/login
router.post('/login', login);

// @desc Resend OTP
// @access Public
// @route POST /api/auth/resend-otp
router.post('/resend-otp', otpLimiter, resendOtp);
// @desc forget password
// @access Public
// @route POST /api/auth/forget-password

router.post('/forget-password', forgetPassword);
// @desc verify OTP and reset password
// @access Public
// @route POST /api/auth/reset-password

router.patch('/reset-password', resetPassword);
module.exports = router;
