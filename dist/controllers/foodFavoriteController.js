"use strict";
// @ts-nocheck
const FoodFavorite = require('../models/FoodFavorite');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');
const addFoodFavorite = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { restaurantId, foodId } = req.params;
        console.log('[debug] removeFoodFavorite called', { userId, restaurantId, foodId });
        const restaurant = await Restaurant.findById(restaurantId).lean();
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        // Check that the food exists in the restaurant.
        // Support embedded food _id or numeric index fallback.
        let matchedFood = null;
        if (Array.isArray(restaurant.foods)) {
            matchedFood = restaurant.foods.find((f) => f && f._id && String(f._id) === String(foodId));
            if (!matchedFood) {
                // try numeric index
                const idx = parseInt(foodId, 10);
                if (!Number.isNaN(idx) && restaurant.foods[idx])
                    matchedFood = restaurant.foods[idx];
            }
        }
        if (!matchedFood) {
            return res.status(404).json({ success: false, message: 'Food item not found' });
        }
        const existing = await FoodFavorite.findOne({ user: userId, restaurant: restaurantId, foodId });
        if (existing) {
            return res.status(409).json({ success: true, message: 'Already saved', data: existing });
        }
        const fav = await FoodFavorite.create({ user: userId, restaurant: restaurantId, foodId });
        const populated = await FoodFavorite.findById(fav._id)
            .populate('restaurant', 'name description address images averageRating totalReviews totalFavorites')
            .lean();
        return res.status(201).json({ success: true, message: 'Food added to favorites', data: populated });
    }
    catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({ success: true, message: 'Already saved' });
        }
        return next(error);
    }
};
const getFoodFavorites = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const favs = await FoodFavorite.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('restaurant', 'name images district')
            .lean();
        const data = await Promise.all(favs.map(async (f) => {
            const favId = f._id;
            const savedAt = f.createdAt;
            const restaurantPop = f.restaurant || null;
            const restaurantSummary = restaurantPop
                ? {
                    _id: restaurantPop._id,
                    name: restaurantPop.name || null,
                    district: restaurantPop.district || null,
                    image: Array.isArray(restaurantPop.images) && restaurantPop.images.length ? restaurantPop.images[0] : null,
                }
                : null;
            // fetch the actual embedded food document from Restaurant collection
            let foodDoc = null;
            try {
                if (restaurantPop) {
                    const restId = restaurantPop._id;
                    const fid = f.foodId;
                    // if foodId looks like ObjectId, use $elemMatch to get that subdocument
                    if (typeof fid === 'string' && mongoose.Types.ObjectId.isValid(fid)) {
                        const r = await Restaurant.findById(restId, { foods: { $elemMatch: { _id: fid } } }).lean();
                        if (r && Array.isArray(r.foods) && r.foods[0]) {
                            foodDoc = r.foods[0];
                        }
                    }
                    // fallback: if not found and foodId is numeric index
                    if (!foodDoc) {
                        const idx = parseInt(String(fid), 10);
                        if (!Number.isNaN(idx)) {
                            // use $slice to fetch that index
                            const r2 = await Restaurant.findById(restId, { foods: { $slice: [idx, 1] } }).lean();
                            if (r2 && Array.isArray(r2.foods) && r2.foods[0]) {
                                foodDoc = r2.foods[0];
                            }
                        }
                    }
                }
            }
            catch (err) {
                // ignore and continue; foodDoc will remain null
            }
            const foodSummary = foodDoc
                ? {
                    _id: foodDoc._id || null,
                    name: foodDoc.name || null,
                    price: typeof foodDoc.price === 'number' ? foodDoc.price : Number(foodDoc.price) || 0,
                    image: foodDoc.image || null,
                    category: foodDoc.category || null,
                }
                : null;
            return {
                favoriteId: favId,
                restaurant: restaurantSummary,
                food: foodSummary,
                foodId: f.foodId,
                savedAt,
            };
        }));
        return res.status(200).json({ success: true, message: 'Favorite foods fetched successfully', data });
    }
    catch (error) {
        return next(error);
    }
};
const removeFoodFavorite = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { restaurantId, foodId } = req.params;
        // Be flexible when matching foodId: stored value may be ObjectId, string, or numeric index.
        const candidates = await FoodFavorite.find({ user: userId, restaurant: restaurantId }).lean();
        console.log('[debug] candidate favorites', candidates.map((c) => ({ _id: c._id, foodId: c.foodId, restaurant: c.restaurant, user: c.user })));
        let match = null;
        for (const c of candidates) {
            try {
                // direct string compare
                if (String(c.foodId) === String(foodId)) {
                    match = c;
                    break;
                }
                // compare ObjectId equality
                if (typeof foodId === 'string' && mongoose.Types.ObjectId.isValid(foodId) && mongoose.Types.ObjectId.isValid(String(c.foodId))) {
                    if (String(mongoose.Types.ObjectId(c.foodId)) === String(mongoose.Types.ObjectId(foodId))) {
                        match = c;
                        break;
                    }
                }
                // numeric index compare
                const idxParam = parseInt(String(foodId), 10);
                if (!Number.isNaN(idxParam) && Number(c.foodId) === idxParam) {
                    match = c;
                    break;
                }
            }
            catch (e) {
                // ignore and continue
            }
        }
        if (!match) {
            return res.status(404).json({ success: false, message: 'Favorite not found' });
        }
        const deleted = await FoodFavorite.findByIdAndDelete(match._id);
        if (!deleted) {
            return res.status(500).json({ success: false, message: 'Failed to remove favorite' });
        }
        return res.status(200).json({ success: true, message: 'Food removed from favorites', data: null });
    }
    catch (error) {
        return next(error);
    }
};
module.exports = {
    addFoodFavorite,
    getFoodFavorites,
    removeFoodFavorite,
};
//# sourceMappingURL=foodFavoriteController.js.map