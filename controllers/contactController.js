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
    subject: 'رسالة جديدة من نموذج التواصل', // Subject line
    html: `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 24px;">
        <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 24px;">
          <h2 style="color: #2d3748; margin-bottom: 16px;">📩 رسالة جديدة من نموذج التواصل</h2>
          <p><strong>الاسم:</strong> ${name}</p>
          <p><strong>البريد الإلكتروني:</strong> ${email}</p>
          <div style="margin-top: 16px;">
            <strong>الرسالة:</strong>
            <div style="background: #f1f1f1; border-radius: 4px; padding: 12px; margin-top: 8px; color: #333;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
      </div>
    `,
  };

  // Send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'Email sent successfully' });
  });
});
