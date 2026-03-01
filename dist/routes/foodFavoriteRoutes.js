"use strict";
// @ts-nocheck
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { addFoodFavorite, getFoodFavorites, removeFoodFavorite } = require('../controllers/foodFavoriteController');
const router = express.Router();
router.use(authMiddleware);
router.post('/:restaurantId/:foodId', addFoodFavorite);
router.get('/', getFoodFavorites);
router.delete('/:restaurantId/:foodId', removeFoodFavorite);
module.exports = router;
//# sourceMappingURL=foodFavoriteRoutes.js.map