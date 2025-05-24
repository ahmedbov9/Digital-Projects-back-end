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

  if (req.body.serviceDetails.length < 100) {
    return res.status(400).json({
      message: 'يجب أن يكون الوصف أكبر من او يساوي 100 حرف  ',
    });
  }
  if (req.body.serviceDetails.length >= 500) {
    return res
      .status(400)
      .json({ message: 'يجب أن يكون الوصف أقل من او يساوي 500 حرف' });
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/text',
  ];

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
    <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
            <td style="background: linear-gradient(90deg, #007BFF 0%, #00C6FF 100%); padding: 32px 24px 16px 24px;">
                <h2 style="color: #fff; margin:0; font-size: 1.8em; letter-spacing:1px;">طلب جديد من المستخدم</h2>
            </td>
        </tr>
        <tr>
            <td style="padding: 28px 24px 24px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
                    <tr>
                        <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                        <td style="padding: 8px 0;">${req.body.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                        <td style="padding: 8px 0;">${req.body.firstName} ${req.body.lastName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                        <td style="padding: 8px 0;">${orderNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                        <td style="padding: 8px 0;">${req.body.mobileNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                        <td style="padding: 8px 0;">${req.body.serviceType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0;"><strong>تاريخ الإنشاء:</strong></td>
                        <td style="padding: 8px 0;">${result.createdAt}</td>
                    </tr>
                </table>
                <div style="margin-top: 24px;">
                    <strong style="display:block; margin-bottom:8px; color:#007BFF;">تفاصيل الخدمة:</strong>
                    <div
                        style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                        ${req.body.serviceDetails}
                    </div>
                </div>
            </td>
        </tr>
        <tr>
            <td style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
                مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز
                    المشاريع الرقمية</a>
            </td>
        </tr>
    </table>
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

  // ارسال المرفق الى ايميل المستخدم
  const userTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const userMailOptions = {
    from: process.env.EMAIL,
    to: req.body.email,
    subject: 'طلبك قيد المعالجة',
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(90deg, #007BFF 0%, #00C6FF 100%); padding: 32px 24px 16px 24px;">
            <h2 style="color: #fff; margin:0; font-size: 1.8em; letter-spacing:1px;">طلبك قيد المعالجة</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                <td style="padding: 8px 0;">${req.body.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تاريخ الإنشاء:</strong></td>
                <td style="padding: 8px 0;">${result.createdAt}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                <td style="padding: 8px 0;">${req.body.mobileNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 8px 0;">${req.body.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                <td style="padding: 8px 0;">${req.body.firstName} ${req.body.lastName}</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <strong style="display:block; margin-bottom:8px; color:#007BFF;">تفاصيل الخدمة:</strong>
              <div
                style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                ${req.body.serviceDetails}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
            مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
          </td>
        </tr>
      </table>
    `,
  };
  userTransporter.sendMail(userMailOptions, (error, info) => {
    if (error) {
      console.log('خطأ أثناء إرسال البريد الإلكتروني:', error);
    } else {
      console.log('تم إرسال البريد الإلكتروني:', info.response);
    }
  });
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
      <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(90deg, #007BFF 0%, #00C6FF 100%); padding: 32px 24px 16px 24px;">
            <h2 style="color: #fff; margin:0; font-size: 1.8em; letter-spacing:1px;">لديك عرض سعر جديد</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                <td style="padding: 8px 0;">${order.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>السعر المقترح:</strong></td>
                <td style="padding: 8px 0;">${req.body.price} ريال</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تاريخ التسليم:</strong></td>
                <td style="padding: 8px 0;">${req.body.serviceDeleveryDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تاريخ إرسال عرض السعر:</strong></td>
                <td style="padding: 8px 0;">${
                  order.priceOffer.sendAt
                    ? new Date(order.priceOffer.sendAt).toLocaleString('ar-EG')
                    : ''
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 8px 0;">${order.userId.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                <td style="padding: 8px 0;">${order.userId.firstName} ${
      order.userId.lastName
    }</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <strong style="display:block; margin-bottom:8px; color:#007BFF;">تفاصيل الخدمة:</strong>
              <div
                style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                ${order.serviceDetails}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
            مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
          </td>
        </tr>
      </table>
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
      <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(90deg, #dc3545 0%, #ff7675 100%); padding: 32px 24px 16px 24px;">
            <h2 style="color: #fff; margin:0; font-size: 1.8em; letter-spacing:1px;">تم رفض طلبك</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                <td style="padding: 8px 0;">${order.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تفاصيل الخدمة:</strong></td>
                <td style="padding: 8px 0;">
                  <div style="background: #f4f8fb; padding: 12px 16px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                    ${order.serviceDetails}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>سبب الرفض:</strong></td>
                <td style="padding: 8px 0; color:#dc3545;">${
                  req.body.rejectReason
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تاريخ الرفض:</strong></td>
                <td style="padding: 8px 0;">${
                  order.priceOffer.sendAt
                    ? new Date(order.priceOffer.sendAt).toLocaleString('ar-EG')
                    : ''
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 8px 0;">${order.userId.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                <td style="padding: 8px 0;">${order.userId.firstName} ${
      order.userId.lastName
    }</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#007BFF; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
            مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
          </td>
        </tr>
      </table>
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
      <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(90deg, #28a745 0%, #00c853 100%); padding: 32px 24px 16px 24px;">
            <h2 style="color: #fff; margin:0; font-size: 1.8em; letter-spacing:1px;">تم قبول عرض السعر بنجاح</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                <td style="padding: 8px 0;">${order.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تاريخ القبول:</strong></td>
                <td style="padding: 8px 0;">${
                  order.priceOffer.responseAt
                    ? new Date(order.priceOffer.responseAt).toLocaleString(
                        'ar-EG'
                      )
                    : ''
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 8px 0;">${order.userId.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                <td style="padding: 8px 0;">${order.userId.firstName} ${
      order.userId.lastName
    }</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <strong style="display:block; margin-bottom:8px; color:#28a745;">تفاصيل الخدمة:</strong>
              <div
                style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                ${order.serviceDetails}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#007BFF; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
            مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#28a745; text-decoration:none;">مركز المشاريع الرقمية</a>
          </td>
        </tr>
      </table>
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
  const companyTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const companyMailOptions = {
    from: process.env.EMAIL,
    to: process.env.PERSONAL_EMAIL,
    subject: 'تم قبول عرض السعر',
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(90deg, #28a745 0%, #00c853 100%); padding: 32px 24px 16px 24px;">
            <h2 style="color: #fff; margin:0; font-size: 1.8em; letter-spacing:1px;">تم قبول عرض السعر</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                <td style="padding: 8px 0;">${order.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تاريخ القبول:</strong></td>
                <td style="padding: 8px 0;">${
                  order.priceOffer.responseAt
                    ? new Date(order.priceOffer.responseAt).toLocaleString(
                        'ar-EG'
                      )
                    : ''
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 8px 0;">${order.userId.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                <td style="padding: 8px 0;">${order.userId.firstName} ${
      order.userId.lastName
    }</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <strong style="display:block; margin-bottom:8px; color:#28a745;">تفاصيل الخدمة:</strong>
              <div
                style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                ${order.serviceDetails}
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#007BFF; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
            مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#28a745; text-decoration:none;">مركز المشاريع الرقمية</a>
          </td>
        </tr>
      </table>
    `,
  };
  companyTransporter.sendMail(companyMailOptions, (error, info) => {
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
      <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(90deg, #dc3545 0%, #ff7675 100%); padding: 32px 24px 16px 24px;">
            <h2 style="color: #fff; margin:0; font-size: 1.8em; letter-spacing:1px;">تم رفض عرض السعر</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                <td style="padding: 8px 0;">${order.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تفاصيل الخدمة:</strong></td>
                <td style="padding: 8px 0;">
                  <div style="background: #f4f8fb; padding: 12px 16px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                    ${order.serviceDetails}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>سبب الرفض:</strong></td>
                <td style="padding: 8px 0; color:#dc3545;">${
                  order.priceOffer.rejectReason || ''
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>تاريخ الرفض:</strong></td>
                <td style="padding: 8px 0;">
                  ${
                    order.priceOffer.responseAt
                      ? new Date(order.priceOffer.responseAt).toLocaleString(
                          'ar-EG'
                        )
                      : ''
                  }
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 8px 0;">${order.userId.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                <td style="padding: 8px 0;">${order.userId.firstName} ${
      order.userId.lastName
    }</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafd; text-align:center; color:#fff; font-size:0.95em; padding:16px 0 12px 0;">
            مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
          </td>
        </tr>
      </table>
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
    subject: 'فاتورة دفع الطلب',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7fafd; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:40px auto; background:#fff; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
          <tr>
            <td style="background: linear-gradient(90deg, #007BFF 0%, #00C6FF 100%); padding: 32px 24px 16px 24px; text-align:center;">
              <h2 style="color: #fff; margin:0; font-size: 2em; letter-spacing:1px;">فاتورة دفع الطلب</h2>
              <p style="color:#e3eaf1; margin:8px 0 0 0; font-size:1.1em;">شكراً لاختيارك مركز المشاريع الرقمية</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
                <tr>
                  <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                  <td style="padding: 8px 0;">${order.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                  <td style="padding: 8px 0;">${order.serviceType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>تاريخ الدفع:</strong></td>
                  <td style="padding: 8px 0;">${
                    order.servicePaymentDate
                      ? new Date(order.servicePaymentDate).toLocaleString(
                          'ar-EG'
                        )
                      : ''
                  }</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                  <td style="padding: 8px 0;">${order.userId.firstName} ${
      order.userId.lastName
    }</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                  <td style="padding: 8px 0;">${order.userId.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                  <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>المبلغ المدفوع:</strong></td>
                  <td style="padding: 8px 0; color:#28a745; font-weight:bold;">
                    ${
                      order.priceOffer && order.priceOffer.price
                        ? order.priceOffer.price + ' ريال'
                        : '--'
                    }
                  </td>
                </tr>
              </table>
              <div style="margin-top: 24px;">
                <strong style="display:block; margin-bottom:8px; color:#007BFF;">تفاصيل الخدمة:</strong>
                <div style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                  ${order.serviceDetails}
                </div>
              </div>
              <div style="margin-top:32px; text-align:center;">
                <span style="display:inline-block; background:#28a745; color:#fff; padding:10px 32px; border-radius:6px; font-size:1.2em; letter-spacing:1px;">
                  تم الدفع بنجاح
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
              مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
            </td>
          </tr>
        </table>
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7fafd; padding: 0; margin: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:40px auto; background:#fff; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
          <tr>
            <td style="background: linear-gradient(90deg, #007BFF 0%, #00C6FF 100%); padding: 32px 24px 16px 24px; text-align:center;">
              <h2 style="color: #fff; margin:0; font-size: 2em; letter-spacing:1px;">تم الانتهاء من الطلب بنجاح</h2>
              <p style="color:#e3eaf1; margin:8px 0 0 0; font-size:1.1em;">شكراً لاختيارك مركز المشاريع الرقمية</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
                <tr>
                  <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                  <td style="padding: 8px 0;">${order.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                  <td style="padding: 8px 0;">${order.serviceType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                  <td style="padding: 8px 0;">${order.userId.firstName} ${order.userId.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                  <td style="padding: 8px 0;">${order.userId.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                  <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
                </tr>
              </table>
              <div style="margin-top: 24px;">
                <strong style="display:block; margin-bottom:8px; color:#007BFF;">تفاصيل الخدمة:</strong>
                <div style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                  ${order.serviceDetails}
                </div>
              </div>
              <div style="margin-top:32px; text-align:center;">
                <span style="display:inline-block; background:#28a745; color:#fff; padding:10px 32px; border-radius:6px; font-size:1.2em; letter-spacing:1px;">
                  تم الانتهاء من الطلب بنجاح
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
              مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
            </td>
          </tr>
        </table>
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
      <table width="100%" cellpadding="0" cellspacing="0" dir="rtl"
        style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; max-width:600px; margin:40px auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
        <tr>
          <td style="background: linear-gradient(90deg, #007BFF 0%, #00C6FF 100%); padding: 32px 24px 16px 24px; text-align:center;">
            <h2 style="color: #fff; margin:0; font-size: 2em; letter-spacing:1px;">تم الانتهاء من الطلب بنجاح</h2>
            <p style="color:#e3eaf1; margin:8px 0 0 0; font-size:1.1em;">شكراً لاختياركم مركز المشاريع الرقمية</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:1.08em; color:#222;">
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الطلب:</strong></td>
                <td style="padding: 8px 0;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>نوع الخدمة:</strong></td>
                <td style="padding: 8px 0;">${order.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>الاسم:</strong></td>
                <td style="padding: 8px 0;">${order.userId.firstName} ${order.userId.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 8px 0;">${order.userId.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>رقم الجوال:</strong></td>
                <td style="padding: 8px 0;">${order.userId.mobileNumber}</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <strong style="display:block; margin-bottom:8px; color:#007BFF;">تفاصيل الخدمة:</strong>
              <div style="background: #f4f8fb; padding: 16px 18px; border-radius: 7px; border:1px solid #e3eaf1; color:#333; font-size:1em;">
                ${order.serviceDetails}
              </div>
            </div>
            <div style="margin-top:32px; text-align:center;">
              <span style="display:inline-block; background:#28a745; color:#fff; padding:10px 32px; border-radius:6px; font-size:1.2em; letter-spacing:1px;">
                تم الانتهاء من الطلب بنجاح
              </span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f7fafd; text-align:center; color:#888; font-size:0.95em; padding:16px 0 12px 0;">
            مع تحيات فريق <a href="https://digitalprojectcenter.netlify.app/" style="color:#007BFF; text-decoration:none;">مركز المشاريع الرقمية</a>
          </td>
        </tr>
      </table>
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
// @desc delete order
// @access Private
// @route DELETE /api/order/delete-order/:id
module.exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'لا توجد طلبات مطابقة' });
  }
  await order.deleteOne();
  res.status(200).json({ message: 'تم حذف الطلب بنجاح' });
});
