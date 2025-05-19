const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');

module.exports.sendEmailMessage = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
  }
  // validate message length
  if (message.length < 30) {
    return res
      .status(400)
      .json({ message: 'يجب أن تكون الرسالة أكبر من 30 أحرف' });
  }

  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Set up email data
  const mailOptions = {
    from: `${process.env.EMAIL}`, // sender address
    to: process.env.PERSONAL_EMAIL, // list of receivers
    subject: 'رسالة جديدة', // Subject line
    text: `
    الاسم: ${name}
    البريد الإلكتروني: ${email}
    الرسالة: ${message}
    `, // plain text body
  };

  // Send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'Email sent successfully' });
  });
});
