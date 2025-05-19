const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const { User } = require('../models/User');
const { UnverifiedUser } = require('../models/UnverifiedUser');

module.exports.login = asyncHandler(async (req, res) => {
  // البحث أولاً في جدول المستخدمين غير الموثقين
  const isUserUnverified = await UnverifiedUser.findOne({
    email: req.body.email,
  });

  if (isUserUnverified) {
    const isUnverifiedPasswordMatch = await bcrypt.compare(
      req.body.password,
      isUserUnverified.password
    );

    if (isUnverifiedPasswordMatch) {
      return res.status(400).json({ message: 'هذا الايميل غير مفعل بعد' });
    }
  }

  const user = await User.findOne({
    email: req.body.email,
  });

  if (!user) {
    return res.status(400).json({
      message: 'البريد الالكتروني أو كلمة المرور غير صحيحة',
    });
  }

  const isPasswordMatch = await bcrypt.compare(
    req.body.password,
    user.password
  );

  if (!isPasswordMatch) {
    return res
      .status(400)
      .json({ message: 'البريد الالكتروني أو كلمة المرور غير صحيحة' });
  }

  const token = user.generateToken();
  const { password, ...other } = user._doc;
  res.status(200).json({ ...other, token });
});
