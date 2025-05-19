const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { totp } = require('otplib');
const { User } = require('../models/User');
const {
  validateVerifiedUser,
  UnverifiedUser,
} = require('../models/UnverifiedUser');
const nodemailer = require('nodemailer');

// الخطوة الأولى لتسجيل المستخدم
// api/auth/register
// @desc Register new user
// @access Public
module.exports.registerStepOne = asyncHandler(async (req, res) => {
  // التحقق إذا كان البريد الإلكتروني موجودًا بالفعل في قاعدة بيانات المستخدمين
  const emailExists = await User.findOne({
    email: req.body.email,
  });

  if (emailExists) {
    return res
      .status(400)
      .json({ message: 'البريد الالكتروني موجود مسبقا او كلمة المرور خاطئة' }); // إرسال رسالة خطأ إذا كان المستخدم موجودًا بالفعل
  }

  const { firstName, lastName, email, mobileNumber, password } = req.body;

  // التحقق إذا كان البريد الإلكتروني موجودًا بالفعل في قائمة المستخدمين غير الموثقين
  const existingUser = await UnverifiedUser.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: 'تم ارسال رمز التحقق مسبقاً', // إرسال رسالة خطأ إذا تم إرسال OTP مسبقًا
    });
  }

  // التحقق من صحة البيانات المدخلة باستخدام validateVerifiedUser
  const { error } = validateVerifiedUser(req.body);
  if (error) {
    return res.status(400).json(error.details[0].message); // إرسال رسالة خطأ إذا كانت البيانات غير صحيحة
  }

  // تشفير كلمة المرور
  const hashedPassword = await bcrypt.hash(password, 10);

  // إنشاء OTP (رمز التحقق) باستخدام مكتبة otplib
  const otp = await totp.generate(process.env.OTP_SECRET);

  // تحديد وقت انتهاء صلاحية OTP (10 دقائق)
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const salt = await bcrypt.genSalt(10);
  // تشفير OTP
  const hashedOTP = await bcrypt.hash(otp, salt);

  // إنشاء سجل جديد في قاعدة بيانات المستخدمين غير الموثقين
  await UnverifiedUser.create({
    firstName,
    lastName,
    email,
    mobileNumber,
    password: hashedPassword,
    otp: hashedOTP,
    otpExpiresAt,
  });

  // إعداد خدمة البريد الإلكتروني باستخدام nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // إرسال البريد الإلكتروني الذي يحتوي على OTP
  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: 'رمز التحقق',
    text: `رمز التحقق الخاص بك هو: ${otp}. سينتهي صلاحيته خلال 10 دقائق.`,
  });

  // إرسال استجابة بنجاح إرسال OTP
  res.status(200).json({
    message: 'تم ارسال رمز التحقق إلى بريدك الإلكتروني بنجاح',
  });
});

// الخطوة الثانية: التحقق من OTP وتسجيل المستخدم
// api/auth/register/verify-and-register
// @desc Verify OTP and register user
// @access Public

module.exports.verifyOtpAndRegister = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  console.log(otp);
  // البحث عن المستخدم غير الموثق باستخدام البريد الإلكتروني

  const record = await UnverifiedUser.findOne({ email });
  if (!record) {
    return res.status(400).json({
      message: 'رمز التحقق منتهي الصلاحية او غير صالح', // إرسال رسالة خطأ إذا كان البريد الإلكتروني أو OTP غير صحيح
    });
  }

  const hashedOTP = record.otp;

  if (record.otpExpiresAt < new Date()) {
    return res.status(400).json({
      message: 'رمز التحقق منتهي الصلاحية او غير صالح',
    });
  }

  const isOtpMatch = await bcrypt.compare(otp, hashedOTP);
  if (!isOtpMatch) {
    return res.status(400).json({
      message: 'رمز التحقق منتهي الصلاحية او غير صالح',
    });
  }

  const newUser = new User({
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    mobileNumber: record.mobileNumber,
    password: record.password,
  });
  await newUser.save();

  // حذف المستخدم غير الموثق من قاعدة البيانات
  await UnverifiedUser.deleteOne({ email });

  // إنشاء رمز JWT للمستخدم الجديد
  const token = newUser.generateToken();

  // إرسال استجابة بنجاح تسجيل المستخدم
  // مع تفاصيل المستخدم ورمز JWT
  res.status(201).json({ ...newUser._doc, token });
});

// الخطوة الثالثة: إعادة إرسال OTP
// api/auth/resend-otp
// @desc Resend OTP
// @access Public

module.exports.resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const record = await UnverifiedUser.findOne({ email });
  if (!record) {
    return res.status(400).json({
      message: 'User not found',
    });
  }

  const otp = await totp.generate(process.env.OTP_SECRET);
  const hashedOTP = await bcrypt.hash(otp, 10);

  record.otp = hashedOTP;
  record.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await record.save();

  await UnverifiedUser.updateOne(
    { email },
    { otp: hashedOTP, otpExpiresAt: record.otpExpiresAt }
  );

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: 'New OTP Verification',
    text: `Your new OTP is ${otp}. It will expire in 10 minutes.`,
  });

  res.status(200).json({
    message: 'تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني',
  });
});
