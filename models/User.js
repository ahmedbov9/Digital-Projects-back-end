const mongoose = require('mongoose');
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');
const jwt = require('jsonwebtoken');
const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      minLength: 10,
      maxLength: 20,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

UserSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, isAdmin: this.isAdmin },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: '7d',
    }
  );
};

function validateRegister(data) {
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
function validateUpdateUser(data) {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    password: Joi.string().optional(),
    mobileNumber: Joi.string().min(10).max(15).optional(),
    email: Joi.string().email().optional(),
  });
  return schema.validate(data);
}
function validateUpdateUserFromAdmin(data) {
  const schema = Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    mobileNumber: Joi.string().min(10).max(15).optional(),
    isAdmin: Joi.boolean().optional(),
    email: Joi.string().email().optional(),
  });
  return schema.validate(data);
}

function validateChangePassword(data) {
  const schema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: passwordComplexity().required(),
    confirmPassword: Joi.any()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'كلمات المرور غير متطابقة',
        'any.required': 'تأكيد كلمة المرور مطلوب',
      }),
  });
  return schema.validate(data);
}
function validateResetPassword(data) {
  const schema = Joi.object({
    id: Joi.string().required(),
    token: Joi.string().required(),
    password: passwordComplexity().required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages({
      'any.only': 'كلمات المرور غير متطابقة',
      'any.required': 'تأكيد كلمة المرور مطلوب',
    }),
  });
  return schema.validate(data);
}
function forgetPasswordChangePassword(data) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().required(),
    newPassword: passwordComplexity().required(),
    confirmPassword: Joi.any()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'كلمات المرور غير متطابقة',
        'any.required': 'تأكيد كلمة المرور مطلوب',
      }),
  });
  return schema.validate(data);
}
const User = mongoose.model('User', UserSchema);
module.exports = {
  User,
  validateRegister,
  validateUpdateUser,
  validateChangePassword,
  forgetPasswordChangePassword,
  validateResetPassword,
  validateUpdateUserFromAdmin,
};
