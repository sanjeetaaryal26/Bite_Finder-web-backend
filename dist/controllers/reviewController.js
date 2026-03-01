"use strict";
// @ts-nocheck
const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');
const recalculateRestaurantRating = async (restaurantId) => {
    const stats = await Review.aggregate([
        { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
            },
        },
    ]);
    const averageRating = stats[0] ? Math.round(stats[0].averageRating * 100) / 100 : 0;
    const totalReviews = stats[0] ? stats[0].totalReviews : 0;
    await Restaurant.findByIdAndUpdate(restaurantId, {
        averageRating,
        totalReviews,
    });
};
const getMyReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('restaurant', 'name address')
            .populate('user', 'name email')
            .lean();
        return res.status(200).json({
            success: true,
            message: 'My reviews fetched successfully',
            data: reviews,
        });
    }
    catch (error) {
        return next(error);
    }
};
const createReview = async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating is required and must be between 1 and 5',
            });
        }
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found',
            });
        }
        const existing = await Review.findOne({ user: userId, restaurant: restaurantId });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'You have already reviewed this restaurant',
            });
        }
        const review = await Review.create({
            user: userId,
            restaurant: restaurantId,
            rating: Number(rating),
            comment: comment || '',
        });
        await recalculateRestaurantRating(restaurantId);
        const populated = await Review.findById(review._id)
            .populate('user', 'name email')
            .populate('restaurant', 'name')
            .lean();
        return res.status(201).json({
            success: true,
            message: 'Review created successfully',
            data: populated,
        });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You have already reviewed this restaurant',
            });
        }
        return next(error);
    }
};
const updateReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            });
        }
        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own review',
            });
        }
        const { rating, comment } = req.body;
        if (rating != null) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1 and 5',
                });
            }
            review.rating = rating;
        }
        if (comment !== undefined)
            review.comment = comment;
        await review.save();
        await recalculateRestaurantRating(review.restaurant);
        const populated = await Review.findById(review._id)
            .populate('user', 'name email')
            .populate('restaurant', 'name')
            .lean();
        return res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: populated,
        });
    }
    catch (error) {
        return next(error);
    }
};
const deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            });
        }
        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own review',
            });
        }
        const restaurantId = review.restaurant;
        await review.deleteOne();
        await recalculateRestaurantRating(restaurantId);
        return res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
            data: null,
        });
    }
    catch (error) {
        return next(error);
    }
};
module.exports = {
    getMyReviews,
    createReview,
    updateReview,
    deleteReview,
};
//# sourceMappingURL=reviewController.js.map