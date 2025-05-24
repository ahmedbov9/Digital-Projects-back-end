const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const {
  createOrder,
  getCurrentUserOrders,
  getAllOrders,
  getOrderById,
  sendPriceOffer,
  rejectPriceOffer,
  acceptPriceOffer,
  rejectOrder,
  updatePaymentStatus,
  updateOrderToCompleted,
  deleteOrder,
} = require('../controllers/ordersController');
const {
  verifyToken,
  verifyTokenAndAdmin,
} = require('../middlewares/verifytoken');

// @desc Create new order
// @access Private
// @route POST /api/order/create-order
router.post(
  '/create-order',
  verifyToken,
  upload.single('attachment'),
  createOrder
);
// @desc Get current user orders
// @access Private
// @route GET /api/order/get-current-orders
router.get('/get-current-orders', verifyToken, getCurrentUserOrders);
// get All Orders
// @access Private
// @route GET /api/order/get-all-orders
router.get('/get-all-orders', verifyTokenAndAdmin, getAllOrders);
// @desc Get order by id
// @access Private
// @route GET /api/order/:id
router.get('/:id', verifyTokenAndAdmin, getOrderById);
// @decs send price offer from admin
// @access Private
// @route POST /api/order/send-price-offer
router.post('/send-price-offer', verifyTokenAndAdmin, sendPriceOffer);
// @desc reject price offer from admin
// @access Private
// @route POST /api/order/reject-order
router.post('/reject-order', verifyTokenAndAdmin, rejectOrder);

// @desc accept price offer from user
// @access Private
// @route POST /api/order/accept-price-offer
router.post('/accept-price-offer', verifyToken, acceptPriceOffer);
// @desc reject price offer from user
// @access Private
// @route POST /api/order/reject-price-offer
router.post('/reject-price-offer', verifyToken, rejectPriceOffer);
// @desc update order payment status
// @access Private
// @route POST /api/order/update-payment-status
router.post('/update-payment-status', verifyTokenAndAdmin, updatePaymentStatus);
// @desc update order to completed
// @access Private
// @route POST /api/order/update-order-to-completed
router.post(
  '/update-order-status',
  verifyTokenAndAdmin,
  updateOrderToCompleted
);
// @desc delete order by id
// @access Private
// @route DELETE /api/order/delete-order/:id
router.delete('/delete-order/:id', verifyTokenAndAdmin, deleteOrder);
module.exports = router;
