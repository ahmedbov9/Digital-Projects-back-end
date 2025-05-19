const { User } = require('../models/User');
const bcrypt = require('bcrypt');

async function createDefaultAdmin() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const adminUser = new User({
      firstName: process.env.ADMIN_FIRST_NAME,
      lastName: process.env.ADMIN_LAST_NAME,
      email: process.env.ADMIN_EMAIL,
      mobileNumber: process.env.ADMIN_MOBILE,
      password: hashedPassword,
      isAdmin: process.env.ADMIN_IS_ADMIN === 'true',
    });
    await adminUser.save();
    console.log('Default admin user created');
  } else {
    console.log('Admin user already exists');
  }
}
module.exports = createDefaultAdmin;
