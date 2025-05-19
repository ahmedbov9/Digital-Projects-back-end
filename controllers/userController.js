const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { User, validateUpdateUser } = require('../models/User');
const { Order } = require('../models/Order');
const { UnverifiedUser } = require('../models/UnverifiedUser');
const totp = require('otplib').totp;
// @desc Get current user
// @access Private
// @route GET /api/user/current-user
module.exports.getCurrentUser = asyncHandler(async (req, res) => {
  // get user id from token
  const userId = req.user.id;

  // find user by id
  const user = await User.findById(userId).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'لم يتم العثور على المستحدم' });
  }
  res.status(200).json(user);
});
// @desc Update user
// @access Private
// @route PUT /api/user/update-user
module.exports.updateUser = asyncHandler(async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) {
    return res.status(400).json(error.details[0].message);
  }

  // get user id from token
  const userId = req.user.id;
  // find user by id
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'لم يتم العثور على المستحدم' });
  }

  // check is password Match
  const isMatch = await bcrypt.compare(req.body.password, user.password);
  if (!isMatch) {
    console.log('body password : ' + req.body.password);
    console.log('database password : ' + user.password);
    return res.status(400).json({ message: 'كلمة المرور غير صحيحة' });
  }

  // update user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
      },
    },
    { new: true }
  );
  if (!updatedUser) {
    return res.status(404).json({ message: 'لم يتم العثور على المستحدم' });
  }
  res.status(201).json(updatedUser);
});
// @desc delete user
// @access Private
// @route DELETE /api/user/delete-user
module.exports.deleteUser = asyncHandler(async (req, res) => {
  // get user id from token
  const userId = req.user.id;
  //get user orders
  const orders = await Order.find({ userId });

  // get user email from requset body
  const { email } = req.body;
  console.log('email : ' + email);

  // find user by id

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'لم يتم العثور على المستحدم' });
  }
  if (email !== user.email) {
    return res.status(400).json({ message: 'البريد الالكتروني غير صحيح' });
  }

  // delete user
  // delete user orders
  if (orders.length > 0) {
    await Order.deleteMany({ userId });
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  } else {
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
  }
});
// @desc change password
// @access Private
// @route PUT /api/user/change-password
module.exports.changePassword = asyncHandler(async (req, res) => {
  // get user id from token
  const userId = req.user.id;
  // find user by id
  const user = await User.findById(userId);
  if (!user) {
    return res.status(500).json({ message: 'حدث خطا ما' });
  }
  // check is password Match
  const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
  }
  // check if new password is same as old password
  if (req.body.oldPassword === req.body.newPassword) {
    return res
      .status(400)
      .json({ message: 'كلمة المرور الجديدة هي نفسها القديمة' });
  }
  // check if password confirmation is same as new password
  if (req.body.newPassword !== req.body.confirmPassword) {
    console.log('new password : ' + req.body.newPassword);
    console.log('confirm password : ' + req.body.confirmPassword);
    return res.status(400).json({ message: 'تأكيد كلمة المرور غير صحيح' });
  }
  const { error } = validateChangePassword(req.body);
  if (error) {
    return res.status(400).json(error.details[0].message);
  }
  // hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
  // update user password
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        password: hashedPassword,
      },
    },
    { new: true }
  );
  if (!updatedUser) {
    return res.status(500).json({ message: 'حدث خطا ما' });
  }
  res.status(201).json({ message: 'تم تغيير كلمة المرور بنجاح' });
});
// @desc get all users
// @access Private
// @route GET /api/user/get-all-users
module.exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.toLowerCase() || '';

  const filter = search ? { email: { $regex: search, $options: 'i' } } : {};

  const [users, totalData] = await Promise.all([
    User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);
  if (!users || users.length === 0) {
    return res.status(404).json({ message: 'لا توجد مستخدمين مطابقة' });
  }
  res.status(200).json({
    data: users,
    totalData,
  });
});
// @desc get all unverified users
// @access Private
// @route GET /api/user/get-all-unverified-users
module.exports.getAllUnverifiedUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.toLowerCase() || '';

  const filter = search ? { email: { $regex: search, $options: 'i' } } : {};

  const [users, totalData] = await Promise.all([
    UnverifiedUser.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    UnverifiedUser.countDocuments(filter),
  ]);
  if (!users || users.length === 0) {
    return res.status(404).json({ message: 'لا توجد مستخدمين مطابقة' });
  }
  res.status(200).json({
    data: users,
    totalData,
  });
});
// @desc delete unverified user
// @access Private
// @route DELETE /api/user/delete-unverified-user
module.exports.deleteUnverifiedUser = asyncHandler(async (req, res) => {
  // get user id from request body
  const userId = req.body.id;
  // find user by id
  const user = await UnverifiedUser.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'لم يتم العثور على المستحدم' });
  }
  // delete user
  await UnverifiedUser.findByIdAndDelete(userId);
  res.status(200).json({ message: 'تم حذف المستخدم بنجاح' });
});
