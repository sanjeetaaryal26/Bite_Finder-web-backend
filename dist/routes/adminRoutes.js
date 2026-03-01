"use strict";
// @ts-nocheck
const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getStats, getUsers, getUserById, updateUser, getRestaurants, deleteUser, deleteRestaurant, deleteReview, getAnalytics, addRestaurantFood, updateRestaurantFood, deleteRestaurantFood, updateRestaurant, } = require('../controllers/adminController');
const router = express.Router();
router.use(protect);
router.use(authorize('admin'));
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.route('/restaurants/:restaurantId/foods').post(protect, authorize('admin'), addRestaurantFood);
router.route('/restaurants/:restaurantId/foods/:foodId').put(protect, authorize('admin'), updateRestaurantFood).delete(protect, authorize('admin'), deleteRestaurantFood);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.get('/restaurants', getRestaurants);
router.put('/restaurants/:id', protect, authorize('admin'), updateRestaurant);
router.delete('/users/:id', deleteUser);
router.delete('/restaurants/:id', deleteRestaurant);
router.delete('/reviews/:id', deleteReview);
module.exports = router;
//# sourceMappingURL=adminRoutes.js.map