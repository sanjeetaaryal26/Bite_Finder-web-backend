"use strict";
// @ts-nocheck
const mongoose = require('mongoose');
const foodItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: '' },
    image: { type: String, default: '' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
});
const geoPointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: [true, 'location.type is required'],
        default: 'Point',
    },
    coordinates: {
        type: [Number],
        required: [true, 'location.coordinates [longitude, latitude] is required'],
        set(value) {
            if (!Array.isArray(value))
                return value;
            return value.map((entry) => {
                const parsed = Number(entry);
                return Number.isFinite(parsed) ? parsed : entry;
            });
        },
        validate: [
            {
                validator(value) {
                    return Array.isArray(value) && value.length === 2;
                },
                message: 'location.coordinates must contain exactly 2 values: [longitude, latitude]',
            },
            {
                validator(value) {
                    if (!Array.isArray(value) || value.length !== 2)
                        return false;
                    const [lng, lat] = value;
                    return Number.isFinite(lng) && Number.isFinite(lat);
                },
                message: 'location.coordinates must contain valid numbers',
            },
            {
                validator(value) {
                    if (!Array.isArray(value) || value.length !== 2)
                        return false;
                    const [lng] = value;
                    return lng >= -180 && lng <= 180;
                },
                message: 'longitude must be between -180 and 180',
            },
            {
                validator(value) {
                    if (!Array.isArray(value) || value.length !== 2)
                        return false;
                    const [, lat] = value;
                    return lat >= -90 && lat <= 90;
                },
                message: 'latitude must be between -90 and 90',
            },
        ],
    },
}, { _id: false });
const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    address: {
        type: String,
        default: '',
    },
    district: {
        type: String,
        enum: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
    },
    location: {
        type: geoPointSchema,
        required: [true, 'Restaurant location is required'],
    },
    foods: {
        type: [foodItemSchema],
        default: [],
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    totalReviews: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalFavorites: {
        type: Number,
        default: 0,
        min: 0,
    },
    images: {
        type: [String],
        default: [],
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: { createdAt: true, updatedAt: false } });
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ averageRating: -1 });
restaurantSchema.index({ totalReviews: -1 });
restaurantSchema.index({ totalFavorites: -1 });
restaurantSchema.index({ 'foods.name': 1 });
restaurantSchema.index({ 'foods.category': 1 });
restaurantSchema.index({ district: 1 });
restaurantSchema.index({ district: 1, 'foods.name': 1 });
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;
//# sourceMappingURL=Restaurant.js.map