"use strict";
// @ts-nocheck
const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        default: '',
    },
}, { timestamps: { createdAt: true, updatedAt: true } });
reviewSchema.index({ user: 1, restaurant: 1 }, { unique: true });
reviewSchema.index({ restaurant: 1 });
const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
//# sourceMappingURL=Review.js.map