const mongoose = require('mongoose');
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');
const UnverifiedUserSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, trim: true },
    mobileNumber: { type: String, trim: true },
    password: String,
    otp: { type: String, trim: true },
    otpExpiresAt: Date,
  },
  { timestamps: true }
);

function validateVerifiedUser(data) {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    mobileNumber: Joi.string().min(10).max(15).required(),
    password: passwordComplexity().required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
      'any.only': 'كلمات المرور غير متطابقة',
      'any.required': 'تأكيد كلمة المرور مطلوب',
    }),
  });
  return schema.validate(data);
}
const UnverifiedUser = (module.exports = mongoose.model(
  'UnverifiedUser',
  UnverifiedUserSchema
));

module.exports = {
  UnverifiedUser,
  validateVerifiedUser,
};
