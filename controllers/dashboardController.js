const asyncHandler = require('express-async-handler');
const { Order } = require('../models/Order');
const { User } = require('../models/User');
module.exports.getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalOrders = await Order.countDocuments();
  const totalPendingOrders = await Order.countDocuments({
    serviceStatus: 'pending',
  });
  const totalCancelledOrders = await Order.countDocuments({
    serviceStatus: 'cancelled',
  });
  const totalInProgressOrders = await Order.countDocuments({
    serviceStatus: 'in-progress',
  });
  const totalWaitForPayOrders = await Order.countDocuments({
    serviceStatus: 'wait-for-pay',
  });
  const totalWaitForApprovalOrders = await Order.countDocuments({
    serviceStatus: 'wait-for-approval',
  });
  const totalCompletedOrders = await Order.countDocuments({
    serviceStatus: 'completed',
  });

  const totalEarnings = await Order.aggregate([
    {
      $match: {
        servicePaymentStatus: 'paid',
        'priceOffer.status': 'accepted',
      },
    },
    { $group: { _id: null, total: { $sum: '$priceOffer.price' } } },
  ]);

  const totalUnpaidOrdersPrice = await Order.aggregate([
    { $match: { servicePaymentStatus: 'unpaid' } },
    { $group: { _id: null, total: { $sum: '$priceOffer.price' } } },
  ]);
  const totalRejectedByUserOrders = await Order.countDocuments({
    'priceOffer.status': 'rejected',
  });
  const totalLossesByRejectedOrders = await Order.aggregate([
    {
      $match: {
        servicePaymentStatus: 'unpaid',
        'priceOffer.status': 'rejected',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$priceOffer.price' },
      },
    },
  ]);

  res.status(200).json({
    totalUsers,
    totalOrders,
    totalPendingOrders,
    totalCancelledOrders,
    totalInProgressOrders,
    totalWaitForPayOrders,
    totalCompletedOrders,
    totalEarnings: totalEarnings[0]?.total || 0,
    totalUnpaidOrdersPrice: totalUnpaidOrdersPrice[0]?.total || 0,
    totalRejectedByUserOrders,
    totalLossesByRejectedOrders: totalLossesByRejectedOrders[0]?.total || 0,
    totalWaitForApprovalOrders: totalWaitForApprovalOrders,
  });
});
