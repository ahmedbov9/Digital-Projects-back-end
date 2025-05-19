const asyncHandler = require('express-async-handler');
const { Order, validateOrder } = require('../models/Order');
const nodemailer = require('nodemailer');

// @desc Create new order
// @access Private
// @route POST /api/order/create-order

module.exports.createOrder = asyncHandler(async (req, res) => {
  const { error } = validateOrder(req.body);
  if (error) {
    const customMessage = 'يرجى التحقق من البيانات المدخلة';

    return res.status(400).json({
      message: customMessage,
    });
  }

  const existingOrder = await Order.findOne({
    userId: req.user.id,
  });

  if (
    existingOrder &&
    (existingOrder.serviceStatus === 'pending' ||
      existingOrder.serviceStatus === 'wait-for-approval' ||
      existingOrder.serviceStatus === 'in-progress' ||
      existingOrder.serviceStatus === 'wait-for-pay')
  ) {
    return res.status(400).json({
      message: 'لديك طلب سابق قيد المعالجة. يرجى الانتظار حتى يتم معالجته.',
    });
  }

  // الحقق من طول الوصف
  if (req.body.serviceDetails.length <= 200) {
    return res.status(400).json({
      message: 'يجب أن يكون الوصف أكبر من او يساوي 200 حرف',
    });
  }
  // التحقق من وجود طلب قديم للمستخدم

  // التحقق من صيغ المرفق
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/text',
  ];

  // التحقق من وجود مرفق

  // التحقق من حجم المرفق
  const maxSize = 100 * 1024 * 1024; // 100 ميجابايت
  if (req.file && req.file.size > maxSize) {
    return res.status(400).json({
      message: 'حجم الملف أكبر من الحد المسموح به (100 ميجابايت).',
    });
  }

  if (req.file && !allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      message: 'نوع الملف غير صالح. يُسمح فقط بملفات JPEG, PNG, PDF, و DOC.',
    });
  }
  // توليد رقم الطلب
  const orderNumber = `#${Math.floor(
    100000000000 + Math.random() * 900000000000
  )}`;

  const order = new Order({
    orderNumber: orderNumber,
    userId: req.user.id,
    serviceType: req.body.serviceType,
    serviceDetails: req.body.serviceDetails,
    attachment: req.file ? req.file.originalname : null,
    serviceDeleveryDate: req.body.serviceDeleveryDate || null,
  });
  const result = await order.save();

  console.log('hello3 ');
  // ارسال المرفق الى ايميل الشركة
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: process.env.PERSONAL_EMAIL,
    subject: 'طلب جديد',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">لديك طلب جديد من المستخدم:</h2>
        <p><strong>البريد الإلكتروني:</strong> ${req.body.email}</p>
        <p><strong>الاسم:</strong> ${req.body.firstName} ${req.body.lastName}</p>
        <p><strong>رقم الطلب:</strong> ${orderNumber}</p>
        <p><strong>رقم الجوال :</strong> ${req.body.mobileNumber}</p>
        <p><strong>نوع الخدمة :</strong> ${req.body.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p><strong>تاريخ الانشاء:</strong> ${result.createdAt}</p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${req.body.serviceDetails}
        </p>
      </div>
    `,
    attachments: req.file
      ? [
          {
            filename: req.file.originalname,
            content: req.file.buffer,
          },
        ]
      : [],
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });

  res.status(201).json(result);
});

// @desc Get all orders for user
// @access Private
// @route GET /api/orders

module.exports.getCurrentUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!orders) {
    return res.status(404).json({
      message: 'لا توجد طلبات للمستخدم',
    });
  }
  res.status(200).json(orders);
});

// @desc Get all orders for admin
// @access Private
// @route GET /api/orders/get-all-orders
module.exports.getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search?.toLowerCase() || '';

  const filter = search
    ? { orderNumber: { $regex: search, $options: 'i' } }
    : {};

  const [orders, totalData] = await Promise.all([
    Order.find(filter)
      .populate('userId', ['firstName', 'lastName', 'email', 'mobileNumber'])
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  if (!orders || orders.length === 0) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }

  res.status(200).json({
    data: orders,
    totalData,
  });
});
// @desc Get order by id
// @access Private
// @route GET /api/order/:id
module.exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }
  res.status(200).json(order);
});

// @desc send Price offer from admin
// @access Private
// @route POST /api/order/send-price-offer

module.exports.sendPriceOffer = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.id).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }
  if (order.priceOffer.status !== 'pending') {
    return res.status(400).json({
      message: 'لا يمكنك ارسال عرض سعر على هذا الطلب',
    });
  }
  order.priceOffer = {
    price: req.body.price,
    status: 'pending',
  };
  order.serviceStatus = 'wait-for-approval';
  order.serviceDeleveryDate = req.body.serviceDeleveryDate;
  order.priceOffer.sendAt = Date.now();
  await order.save();
  console.log(order);
  res.status(200).json({ message: 'تم ارسال عرض السعر بنجاح' });
  // ارسال المرفق الى ايميل المستخدم
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: order.userId.email,
    subject: 'عرض سعر جديد',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">لديك عرض سعر جديد</h2>
        <p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.serviceDetails}
        </p>
        <p><strong>السعر المقترح:</strong> ${req.body.price} ريال</p>
        <p><strong>تاريخ التسليم:</strong> ${req.body.serviceDeleveryDate}</p>
        <p><strong>تاريخ ارسال عرض السعر:</strong> ${order.priceOffer.sendAt}</p>
        <p><strong>رقم الجوال :</strong> ${order.userId.mobileNumber}</p>
        <p><strong>البريد الالكتروني :</strong> ${order.userId.email}</p>
        <p><strong>الاسم :</strong> ${order.userId.firstName} ${order.userId.lastName}</p>
         </div>
    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
});

// @desc reject Price offer from admin
// @access Private
// @route POST /api/order/reject-offer
module.exports.rejectOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.id).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }
  if (order.priceOffer.status !== 'pending') {
    console.log(order.priceOffer.status);
    return res.status(400).json({
      message: 'لا يمكنك رفض عرض السعر على هذا الطلب',
    });
  }

  if (!req.body.rejectReason) {
    return res.status(400).json({
      message: 'يرجى إدخال سبب الرفض',
    });
  }

  order.serviceStatus = 'cancelled';
  order.servicePaymentStatus = 'unpaid';
  order.priceOffer.status = 'rejected';
  order.priceOffer.rejectReason = req.body.rejectReason || '';
  order.priceOffer.sendAt = Date.now();

  await order.save();
  res.status(200).json({ message: 'تم رفض عرض السعر بنجاح' });
  // ارسال المرفق الى ايميل المستخدم
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: order.userId.email,
    subject: 'تم رفض طلبك',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">تم رفض طلبك</h2>
        <p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.serviceDetails}
        </p>
        <p><strong>سبب الرفض:</strong> ${req.body.rejectReason}</p>
        <p><strong>تاريخ الرفض:</strong> ${order.priceOffer.responseAt}</p>
        <p><strong>رقم الجوال :</strong> ${order.userId.mobileNumber}</p>
        <p><strong>البريد الالكتروني :</strong> ${order.userId.email}</p>
        <p><strong>الاسم :</strong> ${order.userId.firstName} ${order.userId.lastName}</p>
          </div>
    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
});

// @desc accept Price offer from user
// @access Private
// @route POST /api/order/accept-price-offer
module.exports.acceptPriceOffer = asyncHandler(async (req, res) => {
  console.log(req.body.id);

  const order = await Order.findById(req.body.id).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }

  if (order.serviceStatus !== 'wait-for-approval') {
    return res.status(400).json({
      message: 'لا يمكنك قبول عرض السعر على هذا الطلب',
    });
  }
  order.serviceStatus = 'in-progress';
  order.servicePaymentStatus = 'unpaid';
  order.priceOffer.status = 'accepted';
  order.priceOffer.responseAt = Date.now();
  await order.save();
  res.status(200).json({ message: 'تم قبول عرض السعر بنجاح' });
  // ارسال المرفق الى ايميل المستخدم
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: order.userId.email,
    subject: 'تم قبول عرض السعر',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">تم قبول عرض السعر بنجاح</h2>
        <p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.serviceDetails}
        </p>
        <p><strong>سبب الرفض</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.priceOffer.rejectReason}
        </p>
        
      </div>
    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
});
// @desc reject Price offer from user
// @access Private
// @route POST /api/order/reject-price-offer
module.exports.rejectPriceOffer = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.id).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }
  if (order.serviceStatus !== 'wait-for-approval') {
    return res.status(400).json({
      message: 'لا يمكنك رفض عرض السعر على هذا الطلب',
    });
  }
  order.serviceStatus = 'cancelled';
  order.servicePaymentStatus = 'unpaid';
  order.priceOffer.status = 'rejected';
  order.priceOffer.responseAt = Date.now();
  order.priceOffer.rejectReason = req.body.rejectReason || '';
  await order.save();
  res.status(200).json({ message: 'تم رفض عرض السعر بنجاح' });
  // ارسال المرفق الى ايميل المستخدم
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: order.userId.email,
    subject: 'تم رفض عرض السعر',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">تم رفض عرض السعر</h2>
        <p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.serviceDetails}
        </p>
      </div>
    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
});
// @desc update order status
// @access Private
// @route POST /api/order/update-payment-status
module.exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.id).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }
  if (order.serviceStatus !== 'in-progress') {
    return res.status(400).json({
      message: 'لا يمكنك تحديث حالة الدفع على هذا الطلب',
    });
  }
  if (order.servicePaymentStatus === 'paid') {
    return res.status(400).json({
      message: 'تم دفع الطلب مسبقاً',
    });
  }

  order.servicePaymentStatus = 'paid';
  order.priceOffer.sendAt = Date.now();
  order.servicePaymentDate = Date.now();
  order.priceOffer.status = 'accepted';

  await order.save();
  res.status(200).json({ message: 'تم تحديث حالة الدفع بنجاح' });
  // ارسال المرفق الى ايميل المستخدم
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: order.userId.email,
    subject: 'تم دفع الطلب',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">تم دفع الطلب بنجاح</h2>
        <p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.serviceDetails}
        </p>
      </div>
    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
});
// @desc update order to completed
// @access Private
// @route POST /api/order/update-order-status
module.exports.updateOrderToCompleted = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.id).populate('userId', [
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
  ]);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }
  if (order.serviceStatus !== 'in-progress') {
    return res.status(400).json({
      message: 'لا يمكنك تحديث حالة الطلب على هذا الطلب',
    });
  }
  if (order.servicePaymentStatus === 'unpaid') {
    return res.status(400).json({
      message: 'يجب دفع الطلب قبل تحديث حالته',
    });
  }
  order.serviceStatus = 'completed';
  order.servicePaymentStatus = 'paid';
  order.priceOffer.status = 'accepted';
  order.priceOffer.sendAt = Date.now();
  await order.save();
  res.status(200).json({ message: 'تم تحديث حالة الطلب بنجاح' });
  // ارسال المرفق الى ايميل المستخدم
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: order.userId.email,
    subject: 'تم الانتهاء من الطلب',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">تم الانتهاء من الطلب بنجاح</h2>
        <p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.serviceDetails}
        </p>
      </div>
    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
  // ارسال المرفق الى ايميل الشركة
  const mailOptionsToCompany = {
    from: process.env.EMAIL,
    to: process.env.PERSONAL_EMAIL,
    subject: 'تم الانتهاء من الطلب',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #007BFF;">تم الانتهاء من الطلب بنجاح</h2>
        <p><strong>رقم الطلب:</strong> ${order.orderNumber}</p>
        <p><strong>نوع الخدمة:</strong> ${order.serviceType}</p>
        <p><strong>تفاصيل الخدمة:</strong></p>
        <p style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          ${order.serviceDetails}
        </p>
      </div>
    `,
  };
  transporter.sendMail(mailOptionsToCompany, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
});
