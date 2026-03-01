// @ts-nocheck
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_NEARBY_DISTANCE_METERS = 5000;
const ALLOWED_DISTRICTS = ['Kathmandu', 'Lalitpur', 'Bhaktapur'];
const VALID_GEOJSON_LOCATION_FILTER = {
  'location.type': 'Point',
  'location.coordinates.0': { $exists: true, $type: 'number' },
  'location.coordinates.1': { $exists: true, $type: 'number' },
  'location.coordinates.2': { $exists: false },
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRestaurants = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const minRating = req.query.minRating != null ? parseFloat(req.query.minRating) : null;
    const sortBy = req.query.sortBy === 'rating' ? 'averageRating' : 'averageRating';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = {};
    if (minRating != null && !Number.isNaN(minRating)) {
      filter.averageRating = { $gte: minRating };
    }

    const skip = (page - 1) * limit;
    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .lean(),
      Restaurant.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Restaurants fetched successfully',
      data: {
        restaurants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Restaurant fetched successfully',
      data: restaurant,
    });
  } catch (error) {
    return next(error);
  }
};

const createRestaurant = async (req, res, next) => {
  try {
    const { name, description, address, district, location, foods, images } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant name is required',
      });
    }

    if (!location || typeof location !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'location is required and must be a GeoJSON Point',
      });
    }

    if (location.type != null && location.type !== 'Point') {
      return res.status(400).json({
        success: false,
        message: 'location.type must be "Point"',
      });
    }

    const coordinates = location.coordinates;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'location.coordinates [longitude, latitude] is required',
      });
    }

    // Enforce valley bounding box
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({
        success: false,
        message: 'location.coordinates must be numeric [longitude, latitude]',
      });
    }

    if (district != null && district !== '' && !ALLOWED_DISTRICTS.includes(district)) {
      return res.status(400).json({
        success: false,
        message: `Invalid district. Allowed: ${ALLOWED_DISTRICTS.join(', ')}`,
      });
    }

    // Bounds: North: 27.80, South: 27.60, East: 85.45, West: 85.20
    if (lat < 27.6 || lat > 27.8 || lng < 85.2 || lng > 85.45) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant location is outside the allowed valley bounds',
      });
    }

    const restaurant = await Restaurant.create({
      name,
      description: description || '',
      address: address || '',
      district: district || undefined,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      foods: Array.isArray(foods) ? foods : [],
      images: Array.isArray(images) ? images : [],
      createdBy: req.user.id,
    });

    const populated = await Restaurant.findById(restaurant._id)
      .populate('createdBy', 'name email')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: populated,
    });
  } catch (error) {
    return next(error);
  }
};

const searchRestaurants = async (req, res, next) => {
  try {
    const food = (req.query.food || '').trim();
    if (!food) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "food" is required for search',
      });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const minRating = req.query.minRating != null ? parseFloat(req.query.minRating) : null;
    const hasLng = req.query.lng != null && req.query.lng !== '';
    const hasLat = req.query.lat != null && req.query.lat !== '';
    const hasGeoSearch = hasLng || hasLat;
    const distanceKmRaw = req.query.distanceKm;
    const distanceKm = distanceKmRaw != null ? parseFloat(distanceKmRaw) : 5;

    if (hasLng !== hasLat) {
      return res.status(400).json({
        success: false,
        message: 'Both query parameters "lng" and "lat" are required for nearest search',
      });
    }

    if (distanceKmRaw != null && (Number.isNaN(distanceKm) || distanceKm <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "distanceKm" must be a positive number',
      });
    }

    // Food inside foods array (case-insensitive), location must be valid GeoJSON Point with numeric [lng, lat].
    const filter = {
      'foods.name': { $regex: escapeRegex(food), $options: 'i' },
      ...VALID_GEOJSON_LOCATION_FILTER,
    };
    if (minRating != null && !Number.isNaN(minRating)) {
      filter.averageRating = { $gte: minRating };
    }

    if (hasGeoSearch) {
      const lng = parseFloat(req.query.lng);
      const lat = parseFloat(req.query.lat);
      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        return res.status(400).json({
          success: false,
          message: 'Query parameters "lng" and "lat" must be valid numbers',
        });
      }

      filter.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: Math.round(distanceKm * 1000),
        },
      };
    }

    const skip = (page - 1) * limit;
    const projection = { name: 1, averageRating: 1, images: 1, location: 1 };
    const restaurantsQuery = Restaurant.find(filter)
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean();

    if (!hasGeoSearch) {
      restaurantsQuery.sort({ averageRating: -1 });
    }

    const [restaurantsRaw, total] = await Promise.all([
      restaurantsQuery,
      Restaurant.countDocuments(filter),
    ]);

    const restaurants = restaurantsRaw.map((r) => {
      const rating = typeof r.averageRating === 'number' ? r.averageRating : 0;
      return {
        _id: r._id,
        name: r.name,
        rating,
        averageRating: rating,
        image: Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null,
        location: r.location,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Search results fetched successfully',
      data: {
        restaurants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getNearbyRestaurants = async (req, res, next) => {
  try {
    const lng = parseFloat(req.query.lng);
    const lat = parseFloat(req.query.lat);
    const distance = parseInt(req.query.distance, 10) || 5000;

    if (Number.isNaN(lng) || Number.isNaN(lat)) {
      return res.status(400).json({
        success: false,
        message: 'Query parameters "lng" and "lat" are required and must be numbers',
      });
    }

    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const minRating = req.query.minRating != null ? parseFloat(req.query.minRating) : null;

    // Use aggregation with $geoNear to include distance (meters)
    const geoNearStage = {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance',
        spherical: true,
        maxDistance: distance,
      },
    };

    const pipeline = [geoNearStage];

    if (minRating != null && !Number.isNaN(minRating)) {
      pipeline.push({ $match: { averageRating: { $gte: minRating } } });
    }

    pipeline.push({ $limit: limit });

    // populate createdBy using $lookup
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
    );

    // Project to include commonly used fields + distance
    pipeline.push({
      $project: {
        name: 1,
        district: 1,
        address: 1,
        location: 1,
        averageRating: 1,
        totalReviews: 1,
        totalFavorites: 1,
        images: 1,
        createdBy: { _id: '$createdBy._id', name: '$createdBy.name', email: '$createdBy.email' },
        distance: 1,
      },
    });

    const restaurants = await Restaurant.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: 'Nearby restaurants fetched successfully',
      data: restaurants,
    });
  } catch (error) {
    return next(error);
  }
};

const filterRestaurants = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

    const minRating = req.query.minRating != null ? parseFloat(req.query.minRating) : null;
    const minPrice = req.query.minPrice != null ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice != null ? parseFloat(req.query.maxPrice) : null;
    const district = req.query.district;
    const address = (req.query.address || '').trim();
    const sortParam = req.query.sort;

    const baseFilter = {};

    if (minRating != null && !Number.isNaN(minRating)) {
      baseFilter.averageRating = { $gte: minRating };
    }

    const priceFilter = {};
    if (minPrice != null && !Number.isNaN(minPrice)) {
      priceFilter.$gte = minPrice;
    }
    if (maxPrice != null && !Number.isNaN(maxPrice)) {
      priceFilter.$lte = maxPrice;
    }
    if (Object.keys(priceFilter).length > 0) {
      baseFilter['foods.price'] = priceFilter;
    }

    if (district) {
      if (!ALLOWED_DISTRICTS.includes(district)) {
        return res.status(400).json({
          success: false,
          message: `Invalid district. Allowed: ${ALLOWED_DISTRICTS.join(', ')}`,
        });
      }
      baseFilter.district = district;
    }

    if (address) {
      baseFilter.address = { $regex: escapeRegex(address), $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const sort = {};
    let queryFilter = { ...baseFilter };

    if (sortParam === 'highestRated') {
      sort.averageRating = -1;
    } else if (sortParam === 'mostReviewed') {
      sort.totalReviews = -1;
    } else if (sortParam === 'nearest') {
      const lng = parseFloat(req.query.lng);
      const lat = parseFloat(req.query.lat);
      const distanceRaw = req.query.distance;
      const distance =
        distanceRaw != null ? parseInt(distanceRaw, 10) : DEFAULT_NEARBY_DISTANCE_METERS;

      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        return res.status(400).json({
          success: false,
          message: 'Query parameters \"lng\" and \"lat\" are required and must be numbers for sort=nearest',
        });
      }

      if (distanceRaw != null && (Number.isNaN(distance) || distance <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "distance" must be a positive number in meters',
        });
      }

      queryFilter = {
        ...baseFilter,
        ...VALID_GEOJSON_LOCATION_FILTER,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: distance,
          },
        },
      };
    }

    const [restaurants, total] = await Promise.all([
      Restaurant.find(queryFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Restaurant.countDocuments(baseFilter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Filtered restaurants fetched successfully',
      total,
      page,
      data: restaurants,
    });
  } catch (error) {
    return next(error);
  }
};

const getTrendingRestaurants = async (req, res, next) => {
  try {
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const restaurants = await Restaurant.aggregate([
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$averageRating', 2] },
              { $ifNull: ['$totalReviews', 0] },
              { $ifNull: ['$totalFavorites', 0] },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          district: 1,
          averageRating: 1,
          totalReviews: 1,
          totalFavorites: 1,
          image: { $arrayElemAt: ['$images', 0] },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Trending restaurants fetched successfully',
      data: restaurants,
    });
  } catch (error) {
    return next(error);
  }
};

const getMostReviewedRestaurants = async (req, res, next) => {
  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const restaurants = await Restaurant.find({ totalReviews: { $gt: 0 } })
      .sort({ totalReviews: -1, averageRating: -1 })
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Most reviewed restaurants fetched successfully',
      data: restaurants,
    });
  } catch (error) {
    return next(error);
  }
};

const getMostSavedRestaurants = async (req, res, next) => {
  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const restaurants = await Restaurant.aggregate([
      {
        $lookup: {
          from: 'favorites',
          localField: '_id',
          foreignField: 'restaurant',
          as: 'favorites',
        },
      },
      {
        $addFields: {
          favoriteCount: { $size: '$favorites' },
        },
      },
      { $sort: { favoriteCount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          district: 1,
          averageRating: 1,
          totalReviews: 1,
          totalFavorites: 1,
          image: { $arrayElemAt: ['$images', 0] },
          favoriteCount: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Most saved restaurants fetched successfully',
      data: restaurants,
    });
  } catch (error) {
    return next(error);
  }
};

const getTopFoodByDistrict = async (req, res, next) => {
  try {
    const district = (req.query.district || '').trim();
    if (!district) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "district" is required (e.g. district=Kathmandu)',
      });
    }
    if (!ALLOWED_DISTRICTS.includes(district)) {
      return res.status(400).json({
        success: false,
        message: `Invalid district. Allowed: ${ALLOWED_DISTRICTS.join(', ')}`,
      });
    }

    const topFoods = await Restaurant.aggregate([
      { $match: { district } },
      { $unwind: '$foods' },
      {
        $group: {
          _id: '$foods.name',
          averageRating: { $avg: '$averageRating' },
          totalReviews: { $sum: '$totalReviews' },
        },
      },
      { $sort: { averageRating: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          foodName: '$_id',
          averageRating: 1,
          totalReviews: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Top food categories by district fetched successfully',
      data: topFoods,
    });
  } catch (error) {
    return next(error);
  }
};

const getRestaurantReviews = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const reviews = await Review.find({ restaurant: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .lean();
    return res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully',
      data: reviews,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRestaurants,
  getRestaurantById,
  getRestaurantReviews,
  createRestaurant,
  searchRestaurants,
  getNearbyRestaurants,
  getTrendingRestaurants,
  getMostReviewedRestaurants,
  getMostSavedRestaurants,
  getTopFoodByDistrict,
  filterRestaurants,
};

