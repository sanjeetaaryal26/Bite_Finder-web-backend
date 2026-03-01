// @ts-nocheck
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_DISTRICTS = ['Kathmandu', 'Lalitpur', 'Bhaktapur'];
const ALLOWED_USER_ROLES = ['user', 'admin', 'owner'];
const normalizeFoodRating = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(0, parsed));
};

/**
 * GET /api/admin/stats
 * Returns dashboard stats using aggregation. Admin only.
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalRestaurants,
      totalReviews,
      totalFavorites,
      topDistrictResult,
      mostReviewedResult,
    ] = await Promise.all([
      User.countDocuments(),
      Restaurant.countDocuments(),
      Review.countDocuments(),
      Favorite.countDocuments(),
      Restaurant.aggregate([
        { $match: { district: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ]),
      Review.aggregate([
        { $group: { _id: '$restaurant', reviewCount: { $sum: 1 } } },
        { $sort: { reviewCount: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'r',
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        { $unwind: { path: '$r', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: '$_id',
            name: { $ifNull: ['$r.name', 'Unknown'] },
            totalReviews: '$reviewCount',
          },
        },
      ]),
    ]);

    const topDistrict = topDistrictResult[0]
      ? { name: topDistrictResult[0].name, count: topDistrictResult[0].count }
      : null;
    const mostReviewedRestaurant = mostReviewedResult[0] || null;

    return res.status(200).json({
      success: true,
      message: 'Admin stats retrieved',
      data: {
        totalUsers,
        totalRestaurants,
        totalReviews,
        totalFavorites,
        topDistrict,
        mostReviewedRestaurant,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/users
 * List users with pagination. Minimal fields, no population. Admin only.
 */
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({})
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved',
      data: {
        users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/users/:id
 * Get a single user by id. Admin only.
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select('name email role profileImage createdAt updatedAt')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved',
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/admin/users/:id
 * Update user profile fields. Admin only.
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, profileImage } = req.body;
    const update = {};

    if (name !== undefined) update.name = String(name).trim();
    if (email !== undefined) update.email = String(email).trim().toLowerCase();
    if (profileImage !== undefined) update.profileImage = profileImage;
    if (role !== undefined) {
      if (!ALLOWED_USER_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed: ${ALLOWED_USER_ROLES.join(', ')}`,
        });
      }
      update.role = role;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    if (update.email) {
      const existing = await User.findOne({ email: update.email, _id: { $ne: id } }).lean();
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select('name email role profileImage createdAt updatedAt')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated',
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/restaurants
 * List restaurants with pagination. Minimal fields. Admin only.
 */
const getRestaurants = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [restaurants, total] = await Promise.all([
      Restaurant.find({})
        .select('name district averageRating totalReviews totalFavorites createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Restaurant.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Restaurants retrieved',
      data: {
        restaurants,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete a user. Admin only. Cascades: favorites, reviews (optional — handle if needed).
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await Promise.all([
      Favorite.deleteMany({ user: id }),
      Review.deleteMany({ user: id }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'User deleted',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/restaurants/:id
 * Delete a restaurant. Admin only. Remove related favorites and reviews.
 */
const deleteRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findByIdAndDelete(id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    await Promise.all([
      Favorite.deleteMany({ restaurant: id }),
      Review.deleteMany({ restaurant: id }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Restaurant deleted',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/admin/restaurants/:id
 * Update top-level restaurant fields (e.g., district, name). Admin only.
 */
const updateRestaurant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, district, address, description, location, images } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (district !== undefined) {
      if (district && !ALLOWED_DISTRICTS.includes(district)) {
        return res.status(400).json({
          success: false,
          message: `Invalid district. Allowed: ${ALLOWED_DISTRICTS.join(', ')}`,
        });
      }
      update.district = district;
    }
    if (address !== undefined) update.address = address;
    if (description !== undefined) update.description = description;
    if (images !== undefined) {
      if (!Array.isArray(images) || !images.every((img) => typeof img === 'string')) {
        return res.status(400).json({
          success: false,
          message: 'images must be an array of strings',
        });
      }
      update.images = images;
    }
    if (location !== undefined) {
      if (!location || typeof location !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'location must be a GeoJSON Point object',
        });
      }

      const coordinates = location.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'location.coordinates [longitude, latitude] is required',
        });
      }

      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return res.status(400).json({
          success: false,
          message: 'location.coordinates must be numeric [longitude, latitude]',
        });
      }

      update.location = { type: 'Point', coordinates: [lng, lat] };
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    const result = await Restaurant.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!result) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    return res.status(200).json({ success: true, message: 'Restaurant updated', data: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/admin/reviews/:id
 * Delete a review by id. Admin only.
 */
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Review deleted',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/admin/restaurants/:restaurantId/foods
 * Add a new embedded food item to a restaurant. Admin only.
 */
const addRestaurantFood = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { name, price, category, image, rating } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'Food name is required' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const food = {
      name,
      price: typeof price === 'number' ? price : Number(price) || 0,
      category: category || null,
      image: image || null,
      rating: normalizeFoodRating(rating),
    };

    restaurant.foods = restaurant.foods || [];
    restaurant.foods.push(food);
    await restaurant.save();

    const updated = await Restaurant.findById(restaurantId).lean();
    return res.status(201).json({ success: true, message: 'Food added', data: updated });
  } catch (error) {
    return next(error);
  }
};


/**
 * PUT /api/admin/restaurants/:restaurantId/foods/:foodId
 * Update an embedded food item using positional operator. Admin only.
 */
const updateRestaurantFood = async (req, res, next) => {
  try {
    const { restaurantId, foodId } = req.params;
    const { name, price, category, image, rating } = req.body;

    // fetch full document to allow flexible matching and update
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    if (name === undefined && price === undefined && category === undefined && image === undefined && rating === undefined) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
    }

    // find food by _id, id, name or numeric index
    let idx = -1;
    const foods = restaurant.foods || [];
    const targetKey = String(foodId || '').trim();
    const lcKey = targetKey.toLowerCase();
    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      // compare by possible id fields
      if (f && f._id && String(f._id) === targetKey) { idx = i; break; }
      if (f && f.id !== undefined && String(f.id) === targetKey) { idx = i; break; }
      // case-insensitive trimmed name match
      if (f && f.name && String(f.name).trim().toLowerCase() === lcKey) { idx = i; break; }
      // numeric index match
      if (!isNaN(Number(targetKey)) && Number(targetKey) === i) { idx = i; break; }
    }

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    const target = restaurant.foods[idx];
    if (name !== undefined) target.name = name;
    if (price !== undefined) target.price = typeof price === 'number' ? price : Number(price) || 0;
    if (category !== undefined) target.category = category;
    if (image !== undefined) target.image = image;
    if (rating !== undefined) target.rating = normalizeFoodRating(rating);

    // ensure subdocs have _id (for older documents that lacked them)
    restaurant.foods.forEach((f) => { if (!f._id) f._id = mongoose.Types.ObjectId(); });

    await restaurant.save();
    const updated = await Restaurant.findById(restaurantId).lean();
    return res.status(200).json({ success: true, message: 'Food updated', data: updated });
  } catch (error) {
    return next(error);
  }
};


/**
 * DELETE /api/admin/restaurants/:restaurantId/foods/:foodId
 * Remove embedded food item. Admin only.
 */
const deleteRestaurantFood = async (req, res, next) => {
  try {
    const { restaurantId, foodId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    // flexible removal by _id, id, name (case-insensitive trimmed) or numeric index
    const foods = restaurant.foods || [];
    const key = String(foodId || '').trim();
    const lcKey = key.toLowerCase();
    let removed = false;
    let newFoods = [];
    for (let i = 0; i < foods.length; i++) {
      const f = foods[i];
      let match = false;
      if (f && f._id && String(f._id) === key) match = true;
      if (!match && f && f.id !== undefined && String(f.id) === key) match = true;
      if (!match && f && f.name && String(f.name).trim().toLowerCase() === lcKey) match = true;
      if (!match && !isNaN(Number(key)) && Number(key) === i) match = true;
      if (match) { removed = true; continue; }
      newFoods.push(f);
    }

    if (!removed) return res.status(404).json({ success: false, message: 'Food item not found' });

    restaurant.foods = newFoods;

    // ensure subdocs have _id (after schema change some may be missing)
    restaurant.foods.forEach((f) => {
      if (!f._id) f._id = mongoose.Types.ObjectId();
    });

    await restaurant.save();
    const updated = await Restaurant.findById(restaurantId).lean();
    return res.status(200).json({ success: true, message: 'Food removed', data: updated });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/admin/analytics?period=7d|28d|90d
 * Returns time series counts grouped by day for users, restaurants, reviews, favorites
 */
const getAnalytics = async (req, res, next) => {
  try {
    const period = String(req.query.period || '28d');
    const now = new Date();
    let days = 28;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const buildAgg = (collectionName) => (
      [
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        {
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
            count: 1,
          },
        },
      ]
    );

    const [usersTs, restaurantsTs, reviewsTs, favoritesTs] = await Promise.all([
      User.aggregate(buildAgg('users')),
      Restaurant.aggregate(buildAgg('restaurants')),
      Review.aggregate(buildAgg('reviews')),
      Favorite.aggregate(buildAgg('favorites')),
    ]);

    // Helper to produce a map of ISODate -> count
    const toMap = (arr) => {
      const m = new Map();
      (arr || []).forEach((r) => m.set(new Date(r.date).toISOString().slice(0, 10), r.count));
      return m;
    };

    const usersMap = toMap(usersTs);
    const restaurantsMap = toMap(restaurantsTs);
    const reviewsMap = toMap(reviewsTs);
    const favoritesMap = toMap(favoritesTs);

    // Build arrays covering full range (days) with zeros where missing
    const outSeries = (map) => {
      const arr = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        arr.push({ date: key, count: map.get(key) || 0 });
      }
      return arr;
    };

    return res.status(200).json({
      success: true,
      message: 'Analytics fetched',
      data: {
        users: outSeries(usersMap),
        restaurants: outSeries(restaurantsMap),
        reviews: outSeries(reviewsMap),
        favorites: outSeries(favoritesMap),
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStats,
  getUsers,
  getUserById,
  updateUser,
  getRestaurants,
  deleteUser,
  deleteRestaurant,
  deleteReview,
  getAnalytics,
  addRestaurantFood,
  updateRestaurantFood,
  deleteRestaurantFood,
  updateRestaurant,
};

