const mongoose = require('mongoose');
const Joi = require('joi');

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
      enum: ['web-development', 'technical-consultation', 'technical-support'],
    },
    serviceDetails: {
      type: String,
      required: true,
      trim: true,
    },
    serviceDeleveryDate: {
      type: Date,
      trim: true,
    },
    serviceStatus: {
      type: String,
      enum: [
        'pending',
        'wait-for-approval',
        'in-progress',
        'wait-for-pay',
        'cancelled',
        'completed',
      ],
      default: 'pending',
      trim: true,
    },
    servicePaymentStatus: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid',
      required: true,
    },
    servicePaymentDate: {
      type: Date,
    },
    attachment: {
      type: String,
      default: '',
    },
    priceOffer: {
      price: {
        type: Number,
        default: 0,
        min: 0,
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
        trim: true,
      },
      rejectReason: {
        type: String,
        default: '',
        trim: true,
      },
      sendAt: {
        type: Date,
      },
      responseAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', OrderSchema);

function validateOrder(data) {
  const schema = Joi.object({
    firstName: Joi.string().required().trim(),
    lastName: Joi.string().required().trim(),
    email: Joi.string().email().required().trim(),
    mobileNumber: Joi.string().required().trim(),

    serviceType: Joi.string()
      .valid('web-development', 'technical-consultation', 'technical-support')
      .required(),
    serviceDetails: Joi.string().required().messages({
      'any.required': 'serviceDetails is required',
    }),
    serviceDeleveryDate: Joi.date(),
    serviceStatus: Joi.string()
      .valid(
        'pending',
        'wait-for-approval',
        'in-progress',
        'wait-for-pay',
        'completed'
      )
      .default('pending'),
    servicePrice: Joi.number().min(0).default(0),
    servicePaymentStatus: Joi.string()
      .valid('paid', 'unpaid')
      .default('unpaid'),
    servicePaymentDate: Joi.date().allow(null),
    attachment: Joi.string().allow('').default(''),
  });

  return schema.validate(data, { abortEarly: false });
}

function validateOrderUpdate(data) {
  const schema = Joi.object({
    serviceType: Joi.string()
      .valid('web-development', 'technical-consultation', 'technical-support')
      .optional(),
    serviceDetails: Joi.string().optional(),
    serviceDeleveryDate: Joi.date().optional(),
    serviceStatus: Joi.string()
      .valid('pending', 'in-progress', 'wait-for-pay', 'completed')
      .optional(),
    servicePrice: Joi.number().min(0).optional(),
    servicePaymentStatus: Joi.string().valid('paid', 'unpaid').optional(),
    servicePaymentDate: Joi.date().allow(null).optional(),
    attachment: Joi.string().allow('').optional(),
  });

  return schema.validate(data, { abortEarly: false });
}
function validateOrderPriceOffer(data) {
  const schema = Joi.object({
    price: Joi.number().min(0).required(),
    status: Joi.string()
      .valid('pending', 'accepted', 'rejected')
      .default('pending'),
    sendAt: Joi.date().default(Date.now),
    responseAt: Joi.date().allow(null),
    sendAt: Joi.date().default(Date.now),
    responseAt: Joi.date().allow(null),
  });

  return schema.validate(data, { abortEarly: false });
}

module.exports = {
  Order,
  validateOrder,
  validateOrderUpdate,
};
