const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message:
      'لقد قمت بإرسال الكثير من الطلبات في فترة زمنية قصيرة جدًا. يرجى المحاولة مرة أخرى لاحقًا.',
  },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    statusCode: 429,
    message: 'لقد تجاوزت الحد المسموح لطلب رمز التحقق. حاول لاحقاً.',
  },
});

module.exports = {
  apiLimiter,
  otpLimiter,
};
