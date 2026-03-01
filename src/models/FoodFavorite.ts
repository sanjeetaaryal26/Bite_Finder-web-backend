// @ts-nocheck
const mongoose = require('mongoose');

const foodFavoriteSchema = new mongoose.Schema(
  {
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
    foodId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

foodFavoriteSchema.index({ user: 1, restaurant: 1, foodId: 1 }, { unique: true });
foodFavoriteSchema.index({ restaurant: 1 });

const FoodFavorite = mongoose.model('FoodFavorite', foodFavoriteSchema);

module.exports = FoodFavorite;

