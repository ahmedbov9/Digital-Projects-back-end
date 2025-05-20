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
    return res.status(400).json({ message: 'لم يتم العثور على المستحدم' });
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
    from: `"Programming Services" <${process.env.EMAIL}>`,
    to: email,
    subject: 'إعادة تعيين كلمة المرور',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 8px;">
        <h2 style="color: #2d7ff9;">إعادة تعيين كلمة المرور</h2>
        <p>مرحبًا،</p>
        <p>لقد تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <p>
          لإعادة تعيين كلمة المرور، يرجى الضغط على الزر أدناه أو نسخ الرابط ولصقه في متصفحك:
        </p>
        <a href="${link}" style="display: inline-block; background: #2d7ff9; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin: 16px 0;">إعادة تعيين كلمة المرور</a>
        <p style="font-size: 13px; color: #888;">إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.</p>
        <hr style="margin: 24px 0;">
            <p style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
                مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز
                    المشاريع الرقمية</a>
            </p>      </div>
    `,
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
    from: `"Programming Services" <${process.env.EMAIL}>`,
    to: user.email,
    subject: 'تأكيد تغيير كلمة المرور',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 8px;">
        <h2 style="color: #2d7ff9;">تم تغيير كلمة المرور بنجاح</h2>
        <p>مرحبًا ${user.name ? user.name : ''},</p>
        <p>نود إعلامك بأنه تم تغيير كلمة المرور الخاصة بحسابك بنجاح.</p>
        <p>إذا لم تقم أنت بهذا التغيير، يرجى التواصل معنا فورًا لحماية حسابك.</p>
        <hr style="margin: 24px 0;">
        <p style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
          مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
        </p>
      </div>
    `,
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
