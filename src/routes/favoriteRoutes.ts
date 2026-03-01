// @ts-nocheck
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { addFavorite, getFavorites, removeFavorite } = require('../controllers/favoriteController');

const router = express.Router();

router.use(authMiddleware);

router.post('/:restaurantId', addFavorite);
router.get('/', getFavorites);
router.delete('/:restaurantId', removeFavorite);

module.exports = router;

