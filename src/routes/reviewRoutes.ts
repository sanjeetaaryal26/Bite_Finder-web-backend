// @ts-nocheck
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getMyReviews, createReview, updateReview, deleteReview } = require('../controllers/reviewController');

const router = express.Router();

router.get('/me', authMiddleware, getMyReviews);
router.post('/:restaurantId', authMiddleware, createReview);
router.put('/:id', authMiddleware, updateReview);
router.delete('/:id', authMiddleware, deleteReview);

module.exports = router;

