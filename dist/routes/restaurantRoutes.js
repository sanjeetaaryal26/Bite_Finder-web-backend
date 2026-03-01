"use strict";
// @ts-nocheck
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getRestaurants, getRestaurantById, getRestaurantReviews, createRestaurant, searchRestaurants, getNearbyRestaurants, getTrendingRestaurants, getMostReviewedRestaurants, getMostSavedRestaurants, getTopFoodByDistrict, filterRestaurants, } = require('../controllers/restaurantController');
const router = express.Router();
router.post('/', authMiddleware, authMiddleware.requireAdmin, createRestaurant);
router.get('/', getRestaurants);
router.get('/filter', filterRestaurants);
router.get('/search', searchRestaurants);
router.get('/nearby', getNearbyRestaurants);
router.get('/trending', getTrendingRestaurants);
router.get('/most-reviewed', getMostReviewedRestaurants);
router.get('/most-saved', getMostSavedRestaurants);
router.get('/top-food', getTopFoodByDistrict);
router.get('/:id/reviews', getRestaurantReviews);
router.get('/:id', getRestaurantById);
module.exports = router;
//# sourceMappingURL=restaurantRoutes.js.map