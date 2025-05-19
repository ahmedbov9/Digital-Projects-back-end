const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const {
  User,
  forgetPasswordChangePassword,
  validateResetPassword,
} = require('../models/User');
const { totp } = require('otplib');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// @desc send reset password link
// @access Public
// @route POST /api/auth/forget-password
module.exports.forgetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }
  const secret = process.env.JWT_SECRET + user.password;
  const token = jwt.sign({ email: user.email, id: user._id }, secret, {
    expiresIn: '15m',
  });

  const link = `${process.env.CORS_ORIGIN}/reset-password/${user._id}/${token}`;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Reset Password',
    text: `Click on the link to reset your password: ${link}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: 'Error sending email' });
    } else {
      return res.status(200).json({ message: 'Email sent successfully' });
    }
  });
});
// @desc reset password
// @access Public
// @route POST /api/auth/reset-password
module.exports.resetPassword = asyncHandler(async (req, res) => {
  const { id, token } = req.body;
  const user = await User.findById(id);
  if (!user) {
    return res.status(400).json({ message: 'لم يتم العثور على المستخدم' });
  }

  const secret = process.env.JWT_SECRET + user.password;
  try {
    jwt.verify(token, secret);
  } catch (err) {
    return res.status(400).json({ message: 'Invalid token' });
  }

  const { error } = validateResetPassword(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);
  const updatePassword = await User.findByIdAndUpdate(id, {
    password: hashedPassword,
  });

  if (!updatePassword) {
    return res.status(500).json({ message: 'فشل تحديث كلمة السر' });
  }

  // إرسال البريد الإلكتروني بعد التحديث
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: user.email,
    subject: 'تأكيد تغيير كلمة المرور',
    text: 'تم تغيير كلمة المرور الخاصة بك بنجاح.',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('خطأ أثناء إرسال البريد:', error);
      return res
        .status(500)
        .json({ message: 'حدث خطأ أثناء إرسال البريد الإلكتروني' });
    } else {
      return res
        .status(200)
        .json({ message: 'تم تحديث كلمة المرور وإرسال بريد التأكيد بنجاح' });
    }
  });
});
