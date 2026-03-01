// @ts-nocheck
const Favorite = require('../models/Favorite');
const Restaurant = require('../models/Restaurant');

const addFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    const existing = await Favorite.findOne({ user: userId, restaurant: restaurantId });
    if (existing) {
      return res.status(409).json({
        success: true,
        message: 'Already in favorites',
        data: existing,
      });
    }

    const favorite = await Favorite.create({
      user: userId,
      restaurant: restaurantId,
    });

    await Restaurant.findByIdAndUpdate(restaurantId, {
      $inc: { totalFavorites: 1 },
    });

    const populated = await Favorite.findById(favorite._id)
      .populate('restaurant', 'name description address images averageRating totalReviews totalFavorites')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Restaurant added to favorites',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: true,
        message: 'Already in favorites',
      });
    }
    return next(error);
  }
};

const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const favorites = await Favorite.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('restaurant')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Favorites fetched successfully',
      data: favorites,
    });
  } catch (error) {
    return next(error);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      user: userId,
      restaurant: restaurantId,
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    await Restaurant.findByIdAndUpdate(restaurantId, [
      {
        $set: {
          totalFavorites: {
            $max: [0, { $subtract: [{ $ifNull: ['$totalFavorites', 0] }, 1] }],
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Restaurant removed from favorites',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  addFavorite,
  getFavorites,
  removeFavorite,
};

