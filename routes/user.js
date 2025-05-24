const express = require('express');
const {
  getCurrentUser,
  updateUser,
  deleteUser,
  changePassword,
  getAllUsers,
  getAllUnverifiedUsers,
  deleteUnverifiedUser,
  getUserById,
  updateUserFromDashboard,
  deleteUserFromDashboard,
} = require('../controllers/userController');
const {
  verifyTokenAndAuthorization,
  verifyToken,
  verifyTokenAndAdmin,
} = require('../middlewares/verifytoken');
const router = express.Router();

// @desc Get current user
// @access Private
// @route GET /api/user/cureent-user
router.get('/current-user', verifyToken, getCurrentUser);

// @desc get all users
// @access Private
// @route GET /api/user/get-all-users
router.get('/get-all-users', verifyTokenAndAdmin, getAllUsers);

// @desc get user by id
// @access Private
// @route GET /api/user/get-user
router.get('/get-user/:id', verifyTokenAndAuthorization, getUserById);

// @desc update user form admin
// @access Private
// @route PUT /api/user/update-user-dashboard/:id
router.put(
  '/update-user-dashboard/:id',
  verifyTokenAndAdmin,
  updateUserFromDashboard
);

// @desc get all unverified users
// @access Private
// @route GET /api/user/get-all-users
router.get(
  '/get-all-unverified-users',
  verifyTokenAndAdmin,
  getAllUnverifiedUsers
);
// @update user
// @access Private
// @route PUT /api/user/update-user
router.put('/update-user/:id', verifyTokenAndAuthorization, updateUser);
// @desc delete user
// // @access Private
// // @route DELETE /api/user/delete-user

router.delete('/delete-user/:id', verifyTokenAndAuthorization, deleteUser);

// @desc delete unverified user
// @access Private
// @route DELETE /api/user/delete-unverified-user
router.delete(
  '/delete-unverified-user',
  verifyTokenAndAdmin,
  deleteUnverifiedUser
);

// @desc change password
// @access Private
// @route PUT /api/user/change-password
router.put('/change-password', verifyToken, changePassword);
// @desc delete user from dashboard
// @access Private
// @route DELETE /api/user/delete-user-dashboard/:id
router.delete(
  '/delete-user-dashboard/:id',
  verifyTokenAndAdmin,
  deleteUserFromDashboard
);
module.exports = router;
