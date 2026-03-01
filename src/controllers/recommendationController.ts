// @ts-nocheck
const Favorite = require('../models/Favorite');
const Restaurant = require('../models/Restaurant');

const RECOMMENDATION_LIMIT = 10;

/**
 * Returns the most frequently occurring value in an array, or null if empty.
 */
function getMostFrequent(arr) {
  if (!arr.length) return null;
  const counts = {};
  for (const x of arr) {
    counts[x] = (counts[x] || 0) + 1;
  }
  const entries = Object.entries(counts);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Step 1: Get user's favorites with restaurant details (foods, district)
    const favorites = await Favorite.find({ user: userId })
      .populate('restaurant', 'foods district')
      .lean();

    const favoriteRestaurantIds = favorites
      .map((f) => f.restaurant?._id)
      .filter(Boolean);

    // Step 2: Extract most common food category and most frequent district
    const categories = [];
    const districts = [];

    for (const fav of favorites) {
      const restaurant = fav.restaurant;
      if (!restaurant) continue;

      if (restaurant.district) {
        districts.push(restaurant.district);
      }

      const foods = restaurant.foods || [];
      for (const food of foods) {
        const category = typeof food.category === 'string' ? food.category.trim() : '';
        if (category) {
          categories.push(category);
        }
      }
    }

    const preferredCategory = getMostFrequent(categories);
    const preferredDistrict = getMostFrequent(districts);

    // Step 3: Build filter — exclude favorited; match district and category when we have preferences
    const filter = {};
    if (favoriteRestaurantIds.length > 0) {
      filter._id = { $nin: favoriteRestaurantIds };
    }
    if (preferredDistrict) {
      filter.district = preferredDistrict;
    }
    if (preferredCategory) {
      filter['foods.category'] = preferredCategory;
    }

    const restaurants = await Restaurant.find(filter)
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(RECOMMENDATION_LIMIT)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Recommended restaurants fetched',
      data: restaurants,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRecommendations,
};

