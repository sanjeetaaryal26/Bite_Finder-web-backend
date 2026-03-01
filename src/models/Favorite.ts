// @ts-nocheck
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

favoriteSchema.index({ user: 1, restaurant: 1 }, { unique: true });
favoriteSchema.index({ restaurant: 1 });

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;

